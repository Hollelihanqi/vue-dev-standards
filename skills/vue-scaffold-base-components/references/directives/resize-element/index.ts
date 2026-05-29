import type { Directive } from 'vue'
const map = new WeakMap()
const ob = new ResizeObserver((entries) => {
  for (const entry of entries) {
    const handle = map.get(entry.target)
    if (handle) {
      const box = entry.borderBoxSize[0]
      if (box.inlineSize === 0 && box.blockSize === 0) return
      handle({
        width: box.inlineSize,
        height: box.blockSize,
      })
    }
  }
})

const resizeElement: Directive = {
  mounted: function (el, binding) {
    ob.observe(el)
    map.set(el, binding.value)
  },
  unmounted(el) {
    ob.unobserve(el)
  },
}

export default resizeElement
