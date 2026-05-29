import type { ExtractPropTypes } from 'vue'

export const remoteSearchProps = {
  url: {
    type: String,
    default: '',
  },
  exposeRef: {
    type: Object,
    default: null,
  },
  method: {
    type: String,
    default: 'GET',
  },
  isRemoteSearch: {
    type: Boolean,
    default: true,
  },
  requestApi: {
    type: Function,
    default: null,
  },
  requestAuto: {
    type: Boolean,
    default: true,
  },
  searchField: {
    type: String,
    default: '',
  },
  requestParams: {
    type: Object,
    default: () => ({}),
  },
  defaultParams: {
    type: Object,
    default: () => ({}),
  },
  requestHeaders: {
    type: [Object, Function],
    default: () => ({}),
  },
  resultKey: {
    type: String,
    default: 'items',
  },
  dataCallback: {
    type: [Function],
    required: false,
    default: null,
  },
  valueKey: {
    type: String,
    default: 'id',
  },
  labelKey: {
    type: String,
    default: 'label',
  },
  modelItem: {
    type: Boolean,
    default: false,
  },
  optTemp: {
    type: [Function, Object],
    default: null,
  },
  w: {
    type: String,
    default: '100%',
  },
  getInstance: {
    type: Function,
    default: null,
  },
  getExposed: {
    type: Function,
    default: null,
  },
  stag: {
    type: String,
    default: 'select',
  },
  defaultFirstOption: {
    type: Boolean,
    default: false,
  },
}

export const remoteSearchEmits = ['after-remote']

export type RemoteSearchProps = ExtractPropTypes<typeof remoteSearchProps>
