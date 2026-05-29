<template>
  <div v-show="isShow" :style="style">
    <slot></slot>
  </div>
</template>
<script setup lang="ts">
import { computed, inject,  ref, useAttrs, watch } from 'vue'
import type { BreakPoint, Responsive } from '../interface/index'

// 定义 GridItem 组件的 Props 类型
type Props = {
  offset?: number // 偏移量
  span?: number // 跨度
  suffix?: boolean // 是否是后缀项
  xs?: Responsive // 响应式配置
  sm?: Responsive
  md?: Responsive
  lg?: Responsive
  xl?: Responsive
}

// 设置默认 Props 值
const props = withDefaults(defineProps<Props>(), {
  offset: 0, // 默认偏移量为0
  span: 1, // 默认跨度为1
  suffix: false, // 默认不是后缀项
  xs: undefined,
  sm: undefined,
  md: undefined,
  lg: undefined,
  xl: undefined,
})

const attrs: any = useAttrs()
const isShow = ref(true) // 是否显示网格项，默认为true

// 注入断点
const breakPoint = inject<Ref<BreakPoint>>('breakPoint', ref('xl'))
// const shouldHiddenIndex = inject<Ref<number>>("shouldHiddenIndex", ref(-1));
const collapseIndex: any = inject('collapseIndex')
// 监听 shouldHiddenIndex 和 breakPoint 的变化，根据条件判断是否显示网格项
watch(
  () => [collapseIndex.value, breakPoint.value],
  (n) => {
    if (attrs.index !== undefined) {
      const nv = n[0] as number
      isShow.value = !(n[0] !== -1 && parseInt(attrs.index) >= nv)
    }
  },
  { immediate: true },
)

const gap = inject('gap', 0) // 获取间距值
const cols = inject<Ref<number>>('cols', ref(4)) // 获取列数值

// 根据当前断点和 Props 计算样式
const style = computed(() => {
  let span = props[breakPoint.value]?.span ?? props.span // 获取当前断点下的跨度值，如果没有则使用默认跨度值
  let offset = props[breakPoint.value]?.offset ?? props.offset // 获取当前断点下的偏移量值，如果没有则使用默认偏移量值
  if (props.suffix) {
    // 如果是后缀项，则使用 gridColumnStart 和 gridColumnEnd 来设置网格项的位置
    return {
      gridColumnStart: cols.value - span - offset + 1,
      gridColumnEnd: `span ${span + offset}`,
      marginLeft: offset !== 0 ? `calc(((100% + ${gap}px) / ${span + offset}) * ${offset})` : 'unset',
    }
  } else {
    // 如果不是后缀项，则使用 gridColumn 来设置网格项的位置
    return {
      gridColumn: `span ${span + offset > cols.value ? cols.value : span + offset}/span ${
        span + offset > cols.value ? cols.value : span + offset
      }`,
      marginLeft: offset !== 0 ? `calc(((100% + ${gap}px) / ${span + offset}) * ${offset})` : 'unset',
    }
  }
})
</script>
