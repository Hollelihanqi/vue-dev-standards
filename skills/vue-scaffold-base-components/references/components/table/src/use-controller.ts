import type { TableProps, ColumnsItemProps } from './table'
import { ref, onBeforeMount, watch, nextTick } from 'vue'
const useController = (props: TableProps, tableRef: any) => {
  const innerTableRef: any = tableRef
  const _columns = ref<any>([])
  let _cacheSaveColumns: any = null
  _columns.value = _ideepClone(props?.columns)
  const setColumns: any = ref([])
  const SettingInstance = ref()
  const handleSetting = () => {
    getShowHideColumns()
    SettingInstance.value.actionDialog()
  }
  const HandleSetSave = () => {
    const newColumns = _ideepClone(props.columns)
    setColumns.value.forEach((item: any) => {
      newColumns?.forEach((column: ColumnsItemProps) => {
        if (item.prop === column.prop) {
          column.show = item.checked
        }
      })
    })
    _columns.value = newColumns
    nextTick(() => {
      innerTableRef.value?.doLayout()
    })
    if (props.tableKey) {
      window.localStorage.setItem(props.tableKey, JSON.stringify(setColumns.value))
    } else {
      _cacheSaveColumns = _ideepClone(setColumns.value)
    }
  }

  const getShowHideColumns = () => {
    const _cacheSetColumns = getCacheColumns()
    if (_cacheSetColumns) {
      setColumns.value = _cacheSetColumns
      return
    } else if (_cacheSaveColumns) {
      setColumns.value = _ideepClone(_cacheSaveColumns)
      return
    }
    const isChecked = (prop: string) => {
      const { showHideFields } = props as any
      if (Array.isArray(showHideFields) && showHideFields.includes(prop)) {
        return {
          checked: showHideFields.includes(prop),
          prop,
        }
      }
      if (showHideFields?.fields && showHideFields?.showFields && showHideFields.fields.includes(prop)) {
        return {
          checked: showHideFields.fields.includes(prop) && showHideFields.showFields.includes(prop),
          prop,
        }
      }
      return true
    }
    const _columns = props?.columns.map((item: ColumnsItemProps) => {
      const isColumnChecked = isChecked(item.prop as string)
      const checkedValue = typeof isColumnChecked === 'boolean' ? isColumnChecked : isColumnChecked.checked
      return {
        label: item.label,
        prop: item.prop,
        checked: checkedValue,
        disabled: isColumnChecked === true ? true : false,
      }
    })
    setColumns.value = _columns
  }

  const getCacheColumns = () => {
    let cacheSetColumns = window.localStorage.getItem(props.tableKey) as any
    if (!cacheSetColumns) return ''
    try {
      cacheSetColumns = JSON.parse(cacheSetColumns)
    } catch (error) {
      console.error('getCacheColumns 解析失败--', error)
    }
    return cacheSetColumns
  }

  watch(
    () => props.columns,
    () => {
      if (props.showHideFields) {
        getShowHideColumns()
        HandleSetSave()
      } else {
        _columns.value = _ideepClone(props.columns)
        nextTick(() => {
          innerTableRef.value?.doLayout()
        })
      }
    },
  )

  const _showColumn = (column: any) => {
    if (column.hide && typeof column.hide === 'function') {
      return column.hide()
    } else {
      return column.show !== false
    }
  }

  onBeforeMount(() => {
    if (props.showHideFields) {
      getShowHideColumns()
      HandleSetSave()
    }
  })
  return {
    _columns,
    _showColumn,
    setColumns,
    SettingInstance,
    handleSetting,
    HandleSetSave,
  }
}

function _ideepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  if (Array.isArray(obj)) {
    const copy = obj.map((item) => _ideepClone(item))
    return copy as T
  }

  if (obj instanceof Object) {
    const copy = Object.create(Object.getPrototypeOf(obj))
    Object.keys(obj).forEach((key) => {
      ;(copy as any)[key] = _ideepClone((obj as any)[key])
    })
    return copy as T
  }

  throw new Error("Unable to copy obj! Its type isn't supported.")
}

export default useController
