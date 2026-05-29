import type { TableProps, UpdatePageParams } from './table'
import { ref, onMounted, computed, watch, nextTick, reactive } from 'vue'
const useTable = (props: TableProps, tableRef: any, emits: any) => {
  const innerTableRef: any = tableRef
  const _loading = ref(false)
  const _tableData = ref<any>([])
  const _tableDataTotal = ref(0)
  const _showSummary = ref(false)
  const paginationParams = reactive({
    currentPage: props.currentPage,
    pageSize: props.pageSizes?.[0] ?? props.pageSize,
  })
  let resetTableDataParams = {}
  let _sortItem: any = null
  const _sortFormat = (item?: any) => {
    if (item && item.order) {
      return {
        sortField: item.prop,
        sortBy: item.order === 'descending' ? 'desc' : 'asc',
      }
    }
    return {}
  }

  const _total = computed(() => {
    return props.requestApi ? _tableDataTotal.value : props.total
  })

  const _tdata = computed(() => {
    return props.requestApi ? _tableData.value : props.tableData
  })

  const _lastPage = computed(() => {
    return Math.ceil(_tableDataTotal.value / paginationParams.pageSize) || 1
  })
  const _defaultSort = computed(() => {
    if (typeof props.defaultSort === 'function') {
      return props.defaultSort()
    } else if (props.defaultSort) {
      return props.defaultSort
    } else {
      return { prop: '', order: '' }
    }
  })

  const cpaginationShow = computed(() => {
    // 如果明确设置了隐藏分页，则不显示
    if (props.paginationHide) {
      return false
    }

    // 如果设置了自动隐藏，则只在总数大于1页时显示
    if (props.paginationHideAuto) {
      const minPageSize = (props.pageSizes && props.pageSizes[0]) || props.pageSize
      return _total.value >= minPageSize
    }

    // 默认显示分页
    return true
  })

  const isDataEmpty = computed(() => {
    return props.requestApi ? _tableData.value.length : props.tableData.length
  })
  const _sortFun = props.sortFormat || _sortFormat
  const _sortFieldFormat = (sort?: any) => {
    const curSort = sort || _sortItem || _defaultSort.value
    if (curSort) {
      return _sortFun(curSort)
    }
    return {}
  }

  const getTableData = async (params = {}) => {
    if (!props.requestApi || typeof props.requestApi !== 'function') return
    _loading.value = props.requestLoadingHide ? false : true
    let _requestParams = props.requestParams
    if (typeof props.requestParams === 'function') {
      _requestParams = props.requestParams()
    }
    const _params: any = {
      ..._sortFieldFormat(),
      ...resetTableDataParams,
      ..._requestParams,
      ...params,
    }
    if (!props.paginationHide) {
      _params[props.currentPageKey] =
        props.pageLimit === 0 ? paginationParams.currentPage - 1 : paginationParams.currentPage
      _params[props.pageSizeKey] = paginationParams.pageSize
    }
    try {
      let result = (await props.requestApi(_params)) || []
      _loading.value = false
      if (props.dataCallback && typeof props.dataCallback === 'function') {
        result = props.dataCallback(result)
      }
      if (Array.isArray(result)) {
        _tableData.value = result
        _tableDataTotal.value = 0
      } else {
        _tableData.value = result[props.dataKey] || []
        _tableDataTotal.value = result.total || 0
      }
      await nextTick()
      props.dataUpdateAfter(_params, result)
    } catch (error) {
      _loading.value = false
      console.error('表格请求数据发生错误...')
      return Promise.reject(error)
    } finally {
      resetTableDataParams = {}
    }
  }

  const handlePaginationChange = (type: 'size' | 'page' | 'sort', num: number): void => {
    if (type === 'size') {
      paginationParams.currentPage = 1 // 只有在改变大小时才重置当前页码
      paginationParams.pageSize = num
    }
    emits(
      'on-table',
      type,
      {
        currentPage: paginationParams.currentPage,
        pageSize: type === 'size' ? num : paginationParams.pageSize,
      },
      _sortItem,
    )

    // 如果不需要通过API请求数据，则直接调用tableChange
    if (props.tableChange && typeof props.tableChange === 'function') {
      props.tableChange(type, num)
    }

    if (props.tableActionIsCallApi) {
      getTableData()
    }
  }

  // 用于分页大小变化
  const handleSizeChange = (num: number): void => {
    handlePaginationChange('size', num)
  }

  // 用于分页页码变化
  const handlePageChange = (num: number) => {
    handlePaginationChange('page', num)
  }

  // 用于表格排序
  const handleSortChange = (item: { prop: string; order: string; column: any }) => {
    _sortItem = item && item.order ? item : null
    paginationParams.currentPage = 1
    emits('on-table', 'sort', item)
    // 为了兼容以前旧的 api
    if (props.tableChange && typeof props.tableChange === 'function') {
      props.tableChange('sort', item)
    }
    // 如果设置为调用API，则获取表格数据
    if (props.tableActionIsCallApi && !props.tableChange) {
      getTableData(_sortFieldFormat(item))
    }
  }

  const updateTableData = (params = {}) => {
    getTableData(params)
  }

  const resetTableData = (params: any) => {
    paginationParams.currentPage = 1
    if (props.defaultSort) {
      if (params) {
        resetTableDataParams = params
      }
      try {
        innerTableRef.value.sort(_defaultSort.value.prop, _defaultSort.value.order)
      } catch (error) {
        console.error(error)
      }
    } else {
      getTableData(params)
    }
  }

  const resetPage = () => {
    paginationParams.currentPage = 1
    paginationParams.pageSize = props.pageSizes?.[0] ?? props.pageSize
  }

  const updatePage = (obj: UpdatePageParams) => {
    paginationParams.currentPage = obj.currentPage ?? paginationParams.currentPage
    paginationParams.pageSize = obj.pageSize ?? paginationParams.pageSize
  }

  const clearSort = () => {
    _sortItem = null
    innerTableRef.value?.clearSort()
  }
  const getData = () => {
    return _tableData.value
  }

  watch(
    () => _tdata.value,
    () => {
      if (
        _tdata.value &&
        !_tdata.value.length &&
        _lastPage.value === paginationParams.currentPage - 1 &&
        paginationParams.currentPage > 1
      ) {
        updatePage({ ...paginationParams, currentPage: paginationParams.currentPage - 1 })
        updateTableData()
      }
    },
  )

  onMounted(() => {
    _showSummary.value = innerTableRef.value?.showSummary
    if (props.requestAuto) {
      getTableData()
    }
  })
  return {
    _loading,
    cpaginationShow,
    isDataEmpty,
    _showSummary,
    _tdata,
    _defaultSort,
    _total,
    paginationParams,
    getTableData,
    handleSortChange,
    handleSizeChange,
    handlePageChange,
    updateTableData,
    resetTableData,
    resetPage,
    updatePage,
    getData,
    clearSort,
  }
}
export default useTable
