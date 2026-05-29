import { getCurrentInstance, type PropType } from 'vue'
import { useWindowSize } from './use-window-size'
export const numericProp = [Number, String]
export const makeNumberProp = <T>(defaultVal: T) => ({
  type: Number,
  default: defaultVal,
})

export const makeNumericProp = <T>(defaultVal: T) => ({
  type: numericProp,
  default: defaultVal,
})

export const makeStringProp = <T>(defaultVal: T) => ({
  type: String as unknown as PropType<T>,
  default: defaultVal,
})

export const { width: windowWidth, height: windowHeight } = useWindowSize()

export const extend = Object.assign
export function useExpose<T = Record<string, any>>(apis: T) {
  const instance = getCurrentInstance()
  if (instance) {
    extend(instance.proxy as object, apis)
  }
}
