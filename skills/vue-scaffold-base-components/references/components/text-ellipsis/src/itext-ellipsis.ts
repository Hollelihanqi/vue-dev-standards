import type { ExtractPropTypes } from 'vue'
import { makeNumericProp, makeStringProp } from './utils'

export const textEllipsisProps = {
  rows: makeNumericProp(1),
  dots: makeStringProp('...'),
  content: makeStringProp(''),
  expandText: makeStringProp(''),
  collapseText: makeStringProp(''),
  position: makeStringProp('end'),
}

export const textEllipsisEmits = ['clickAction']

export type TextEllipsisProps = ExtractPropTypes<typeof textEllipsisProps>