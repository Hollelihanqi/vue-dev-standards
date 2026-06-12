import type { ExtractPropTypes, PropType } from 'vue'
import type { PaginationProps } from 'element-plus'

export interface ColumnsItemProps {
  label?: string
  prop?: string
  hide?: (row?: any) => boolean
  copy?: boolean | ((row?: any) => boolean)
  copyText?: string | Function
  [propsName: string]: any
}
type CanWrite<T> = {
  -readonly [K in keyof T]?: T[K]
}

export interface ShowHideFieldsInterface {
  showHideFields: string[] | { fields: string[]; showFields: string[] }
}

export interface setColumnsProps {
  label: string
  prop: string
  checked: boolean
  disabled: boolean
}

export interface UpdatePageParams {
  currentPage?: number
  pageSize?: number
}

// 表格组件 props 直接使用 Vue 原生对象定义即可。
// 当前这组配置没有用到 buildProps 的高级能力，保持简单更合适。
export const tableProps = {
  tableData: {
    type: Array,
    default: () => [],
  },
  columns: {
    type: Array as PropType<ColumnsItemProps[]>,
    default: () => [],
    required: true,
  },
  requestApi: {
    type: Function,
    default: null,
  },
  requestAuto: {
    type: Boolean,
    default: true,
  },
  requestLoadingHide: {
    type: Boolean,
    default: false,
  },
  tableActionIsCallApi: {
    type: Boolean,
    default: true,
  },
  dataKey: {
    type: String,
    default: 'items',
  },
  dataCallback: {
    type: Function,
    default: null,
  },
  requestParams: {
    type: [Object, Function],
    default: () => ({}),
  },
  paginationHide: {
    // 是否隐藏分页组件
    type: Boolean,
    default: false,
  },
  paginationHideAuto: {
    type: Boolean,
    default: true,
  },
  paginationOptions: {
    type: Object as PropType<CanWrite<PaginationProps>>,
    default: () => ({}),
  },
  total: {
    type: Number,
    default: 0,
  },
  pageSizes: {
    type: Array as PropType<number[]>,
    default: () => [10, 30, 50, 100],
  },
  layout: {
    type: String,
    default: 'total, sizes, prev, pager, next, jumper',
  },
  pageSize: {
    type: Number,
    default: 10,
  },
  currentPage: {
    type: Number,
    default: 1,
  },
  pageLimit: {
    type: Number,
    default: 1,
  },
  currentPageKey: {
    type: String,
    default: 'page',
  },
  pageSizeKey: {
    type: String,
    default: 'size',
  },
  tableChange: {
    type: Function,
    default: null,
  },
  defaultSort: {
    type: [Function, Object],
    default: null,
  },
  sortFormat: {
    type: Function,
    default: null,
  },
  dataUpdateAfter: {
    type: Function,
    default: () => ({}),
  },
  cellEmptyText: {
    type: String,
    default: '--',
  },
  headerbgHide: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  toolBar: {
    type: Boolean,
    default: false,
  },
  showHideFields: {
    type: [Object, Array] as PropType<ShowHideFieldsInterface>,
    default: null,
  },
  tableKey: {
    type: String,
    default: '',
  },
  emptyOptions: {
    type: Object,
    default: () => ({
      size: 'small',
    }),
  },
}

export const tableEmits = ['on-table']

export type TableProps = ExtractPropTypes<typeof tableProps>
