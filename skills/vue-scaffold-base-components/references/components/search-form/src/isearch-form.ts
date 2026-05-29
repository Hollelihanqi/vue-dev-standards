import type { ExtractPropTypes, PropType } from 'vue'
import type { InputProps, ElSelect, SwitchProps, TimePickerDefaultProps, CheckboxProps, ElDatePicker } from 'element-plus'
import type { TimeSelectProps } from 'element-plus/es/components/time-select/src/time-select'
import RemoteSearch  from '@/components/remote-search'

export type RemoteSelectProps = Partial<typeof RemoteSearch.__defaults>
type ElDatePickerProps = typeof ElDatePicker.props
type ElSelectProps = typeof ElSelect.props
interface _SelectProps {
  remoteProps?: RemoteSelectProps
}

type FormEl = {
  input: Partial<InputProps>
  select: _SelectProps
  'tree-select': ElSelectProps
  'date-picker': ElDatePickerProps
  'time-picker': TimePickerDefaultProps
  'time-select': TimeSelectProps
  switch: SwitchProps
  checkbox: CheckboxProps
}

export type BreakPoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type Responsive = {
  span?: number
  offset?: number
}

export interface SelectOptionsProps {
  label: string
  value: any
}
interface SearchProps<T extends keyof FormEl> {
  el?: T
  props?: FormEl[T]
  label?: string
  field?: string // 搜索字段名称
  defaultValue?: string | number | boolean | Function | any[] // 搜索项默认值
  clearDefaultValue?: boolean
  formatValue?: Function
  fieldFormat?: Function
  span?: number // 搜索项所占用的列数，默认为1列
  offset?: number // 搜索字段左侧偏移列数
  options?: SelectOptionsProps[]
  colConfig?: number | Record<BreakPoint, number>
  xs?: Responsive
  sm?: Responsive
  md?: Responsive
  lg?: Responsive
  xl?: Responsive
  render?: Function
  isRemote?: boolean
  remoteProps?: any
  hide?: () => boolean
}

type El = keyof FormEl

export type SearchFormControlProps = SearchProps<El>

export const searchFormProps = {
  searchModel: {
    type: Object,
    default: () => null, // 这里的默认值必须是 null ，不能是 {} ，否则会导致表单无法输入
  },
  colConfig: {
    type: [Number, Object],
    default: () => ({ xs: 1, sm: 2, md: 3, lg: 4, xl: 6 }),
  },
  collapsedRows: {
    type: Number,
    default: 1,
  },
  formControls: {
    type: Array as PropType<SearchFormControlProps[]>,
    default: () => [],
  },
  modelDefault: {
    type: Object,
    default: null,
  },
  okpos: {
    type: String,
    default: 'right',
  },
  collapse: {
    type: Boolean,
    default: false,
  },
  clearDefaultValue: {
    type: Boolean,
    default: true,
  },
  afterSearchFun: {
    type: Function,
    default: () => ({}),
  },
  afterResetFun: {
    type: Function,
    default: () => ({}),
  },
  beforeResetFun: {
    type: Function,
    default: () => ({}),
  },
}

export const searchFormEmits = ['update:searchModel', 'on-search', 'on-reset']

export type SearchFormProps = ExtractPropTypes<typeof searchFormProps>
