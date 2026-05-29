import { defineComponent, ref } from 'vue'
import { ElScrollbar } from 'element-plus'
import './sticky-container.scss'
export default defineComponent({
  name: 'StickyContainer',
  setup(_, { slots, attrs, expose }) {
    const scrollbarRef = ref()
    expose({
      getScrollbarInstance: () => scrollbarRef.value,
      scrollToBottom: () => {
        const scrollbar = scrollbarRef.value?.wrapRef
        if (scrollbar) {
          scrollbar.scrollTop = scrollbar.scrollHeight
        }
      },
    })
    return () => (
      <div class="yto-sticky-container staicky-w h-full flex flex-col overflow-y-hidden">
        {slots.header && <div class="staicky-h"> {slots.header()}</div>}
        <div class="staicky-c flex-1 h-0">
          <ElScrollbar ref={scrollbarRef} height="100%" {...attrs}>
            {slots.default && slots.default()}{' '}
            {slots.footer && <div class="staicky-f sticky bottom-0 z-99">{slots.footer()}</div>}
          </ElScrollbar>
        </div>
      </div>
    )
  },
})
