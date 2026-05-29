import { ref, onMounted, nextTick, computed, useSlots, useTemplateRef } from 'vue'

const filterNonEmptyFields = (obj: Record<string, any> = {}) => {
  return Object.keys(obj).reduce((acc, key) => {
    const value = obj[key]
    const isNotEmpty = value !== '' && value !== null && value !== undefined && !(Array.isArray(value) && value.length === 0)

    if (isNotEmpty) {
      acc[key] = value
    }

    return acc
  }, {} as Record<string, any>)
}

export interface useControllerProp {
  [propName: string]: any
}

const useTable = (props: any) => {
  const HTableRef = useTemplateRef<any>('HTableRef')
  const SearchFormInstance = useTemplateRef<any>('SearchFormInstance')
  const _defaultSort = ref({ ...props.defaultSort })
  const legacyElementTableRefKey = 'El' + 'TableInstance'

  const slotNames = computed(() => Object.keys(useSlots()) as string[])

  const _otherParams = () => {
    if (typeof props.otherRequestParams === 'function') {
      return props.otherRequestParams()
    }
    return props.otherRequestParams
  }

  const getSearchValues = () => {
    return SearchFormInstance.value?.getValues()
  }

  const getRequestParams = () => {
    return filterNonEmptyFields({
      ..._otherParams(),
      ...getSearchValues(),
    })
  }

  const getTableList = async (params = {}) => {
    if (props.requestApi && typeof props.requestApi === 'function') {
      const _params = {
        ...getRequestParams(),
        ...params,
      }
      HTableRef.value.updateTableData(_params)
    }
  }

  const getTableList2 = (params = {}) => {
    if (props.requestApi && typeof props.requestApi === 'function') {
      HTableRef.value.updateTableData(params)
    }
  }

  const handleSearch = () => {
    HTableRef.value.resetPage()
    if (props.onSearch && typeof props.onSearch === 'function') {
      props.onSearch({ ...getSearchValues() }, getTableList2)
    } else {
      getTableList()
    }
  }

  const handleReset = async (params = {}) => {
    HTableRef.value?.resetPage()
    await nextTick()
    if (props.defaultSort && props.defaultSort.prop && props.defaultSort.order) {
      HTableRef.value[legacyElementTableRefKey].sort(props.defaultSort.prop, props.defaultSort.order)
    } else {
      getTableList(params)
    }
  }

  const _updateTableData = (params = {}) => {
    HTableRef.value?.updateTableData({
      ...params,
      ...SearchFormInstance.value?.getValues(),
    })
  }

  const _resetTableData = (params = {}) => {
    handleReset(params)
  }

  const handleTableChange = () => {
    getTableList()
  }

  onMounted(() => {
    getTableList()
  })

  return {
    HTableRef,
    SearchFormInstance,
    slotNames,
    _defaultSort,
    handleSearch,
    handleReset,
    _updateTableData,
    _resetTableData,
    handleTableChange,
  }
}

export default useTable
