<template>
  <div :style="style">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, provide } from 'vue'
import type { BreakPoint } from './interface/index'

type Props = {
  cols?: number | Record<BreakPoint, number> // 列数
  collapsed?: boolean // 是否折叠
  collapsedRows?: number // 折叠时显示的行数
  gap?: [number, number] | number // 网格项之间的间距
}

const props = withDefaults(defineProps<Props>(), {
  cols: () => ({ xs: 1, sm: 2, md: 3, lg: 4, xl: 6 }), // 默认列数
  collapsed: false, // 默认不折叠
  collapsedRows: 1, // 默认折叠时显示一行
  gap: 0, // 默认间距为0
})

const breakPoint = ref<BreakPoint>('xl')
// const hiddenIndex = ref(-1);

// 监听窗口大小变化的回调函数
const resize = (width: number) => {
  // switch (!!width) {
  //   case width < 768:
  //     breakPoint.value = "xs";
  //     break;
  //   case width >= 768 && width < 992:
  //     breakPoint.value = "sm";
  //     break;
  //   case width >= 992 && width < 1200:
  //     breakPoint.value = "md";
  //     break;
  //   case width >= 1200 && width < 1920:
  //     breakPoint.value = "lg";
  //     break;
  //   case width >= 1920:
  //     breakPoint.value = "xl";
  //     break;
  // }
  if (width < 768) {
    breakPoint.value = 'xs'
  } else if (width >= 768 && width < 992) {
    breakPoint.value = 'sm'
  } else if (width >= 992 && width < 1200) {
    breakPoint.value = 'md'
  } else if (width >= 1200 && width < 1920) {
    breakPoint.value = 'lg'
  } else {
    breakPoint.value = 'xl'
  }
}

// 注入 gap 间距，如果 gap 是一个数组，则取第一个值作为间距值
provide('gap', Array.isArray(props.gap) ? props.gap[0] : props.gap)

// 注入响应式断点，即屏幕大小变化时的断点值
provide('breakPoint', breakPoint)

// 注入要开始折叠的 index，即需要折叠的部分在 fields 数组中的起始位置
// provide("shouldHiddenIndex", hiddenIndex);

// 注入 cols，即当前屏幕大小下的列数
const cols = computed(() => {
  if (typeof props.cols === 'object') return props.cols[breakPoint.value] ?? props.cols
  return props.cols
})
provide('cols', cols)

// let slots: any = useSlots();
// if (slots.default && typeof slots.default === "function") {
//   slots = slots.default();
// }
// console.log("获取插槽------", slots);
// // 寻找需要开始折叠的字段 index，实现折叠功能
// const findIndex = () => {
//   let fields: VNodeArrayChildren = [];
//   let suffix: any = null;
//   logger(slots);
//   slots.forEach((slot: any) => {
//     if (typeof slot.type === "object") {
//       if (slot.type.name === "GridItem" && slot.props?.suffix !== undefined) {
//         suffix = slot;
//       }
//     }
//     if (typeof slot.type === "symbol") {
//       if (Array.isArray(slot.children)) {
//         slot.children.forEach((child: any) => {
//           child && fields.push(child);
//         });
//       }
//     }
//   });

//   // 计算 suffix 所占用的列
//   let suffixCols = 0;
//   if (suffix) {
//     suffixCols =
//       (suffix.props[breakPoint.value]?.span ?? suffix.props?.span ?? 1) +
//       (suffix.props[breakPoint.value]?.offset ?? suffix.props?.offset ?? 0);
//   }
//   // 遍历所有表单项，计算它们所占用的列数，并判断是否需要折叠
//   try {
//     let find = false;
//     fields.reduce((prev = 0, current: any, index) => {
//       prev +=
//         (current.props[breakPoint.value]?.span ?? (current as VNode).props?.span ?? 1) +
//         (current.props[breakPoint.value]?.offset ?? (current as VNode).props?.offset ?? 0);
//       if ((prev as number) > props.collapsedRows * cols.value - suffixCols) {
//         hiddenIndex.value = index;
//         console.log("隐藏的列下标---1", hiddenIndex.value);
//         find = true;
//         throw "find it";
//       }
//       return prev;
//     }, 0);

//     if (!find) hiddenIndex.value = -1;
//     console.log("隐藏的列下标---2", hiddenIndex.value);
//   } catch (e) {
//     // warning(e);
//   }
// };

// 监听断点变化，当断点变化时重新计算需要折叠的部分的起始位置
// watch(
//   () => breakPoint.value,
//   () => {
//     if (props.collapsed) findIndex();
//   }
// );

// // 监听 collapsed
// watch(
//   () => props.collapsed,
//   (value) => {
//     console.log("collapsed-变化", value);
//     if (value) return findIndex();
//     hiddenIndex.value = -1;
//   }
// );

// 设置间距
const gap = computed(() => {
  if (typeof props.gap === 'number') return `${props.gap}px`
  if (Array.isArray(props.gap)) return `${props.gap[1]}px ${props.gap[0]}px`
  return 'unset'
})

// 设置 style
const style = computed(() => {
  return {
    display: 'grid',
    gridGap: gap.value,
    gridTemplateColumns: `repeat(${cols.value}, minmax(0, 1fr))`,
  }
})

// 在组件挂载前执行，如果需要折叠，则寻找需要折叠的字段 index
// onBeforeMount(() => props.collapsed && findIndex());

defineExpose({ breakPoint, resize })
</script>
