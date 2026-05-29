import { defineComponent, ref, computed, watch, nextTick, provide, onActivated, onBeforeMount, onMounted } from 'vue'
import { ElForm, ElFormItem, ElButton } from 'element-plus'
import type { SearchFormControlProps } from './isearch-form'
import { searchFormProps, searchFormEmits,  } from './isearch-form'
import type { BreakPoint } from './components/Grid/interface/index'
import ResizeElement from '@/directives/resize-element'
import Grid from './components/Grid/index.vue'
import GridItem from './components/Grid/components/GridItem.vue'
import SearchFormItem from './components/SearchFormItem.vue'
import './search-form.scss'

export default defineComponent({
  name: 'SearchForm',
  directives: { ResizeElement },
  props: searchFormProps,
  emits: searchFormEmits,
  setup(props, { emit, expose, slots }) {
    // =========================
    // 基础状态
    // =========================
    // 当前搜索区是否处于折叠状态。
    // 这里使用本地状态，而不是直接依赖 props.collapse，
    // 是因为组件内部还需要处理“点击展开/收起按钮”后的状态切换。
    const collapsed = ref(false)

    // 搜索表单根节点实例。
    // 主要用于 keep-alive 激活后重新读取容器尺寸，避免页面返回时折叠状态不准确。
    const searchFormInstance = ref()

    // Grid 组件实例。
    // Grid 内部负责断点命中逻辑，所以这里通过实例拿当前 breakPoint，并在容器尺寸变化时触发 resize。
    const GridInstance = ref()

    // 当前 Grid 命中的断点。
    // 后续一切和响应式列宽相关的计算，都以这个断点作为当前上下文。
    const breakPoint = computed<BreakPoint>(() => GridInstance.value?.breakPoint)

    // 搜索区整体容器宽度。
    // 它决定当前一行理论上最多能容纳多少个“按钮区宽度单位”。
    const searchContainerWidth = ref(0)

    // 查询/重置按钮区域宽度。
    // 旧版设计里，按钮区按“一个表单项宽度”参与折叠计算，所以这个宽度非常关键。
    const searchActionBoxWidth = ref(0)

    // 查询/重置按钮真实渲染节点。
    // 这里拿的是 DOM 的 offsetWidth，而不是 Grid 理论列宽，目的是与真实布局对齐。
    const SearchActionEl = ref()

    // 一行最多可放多少个“按钮区宽度单位”。
    // 这个值越大，说明当前容器越宽，可显示的搜索项越多。
    const showSpnas = ref(0)

    // 折叠后从第几个搜索项开始隐藏。
    // -1 代表当前不需要折叠，或者还没计算出折叠起点。
    const collapseIndex = ref(-1)

    // 默认值缓存表。
    // 用于保存 formControls 中每个字段的 defaultValue，方便 reset 时复用。
    const defaultValueMap = new Map()

    // fieldFormat 对应的原始字段名集合。
    // 因为 fieldFormat 常常会把一个字段转换成多个新字段，
    // 所以最后生成请求参数时，需要把原字段删掉。
    const fieldFormatKeys = ref<string[]>([])

    // 按当前断点读取搜索项实际占用的列数，保证折叠计算和真实网格布局一致。
    const getControlCols = (control: SearchFormControlProps) => {
      const point = breakPoint.value
      const span = control?.[point]?.span ?? control?.span ?? 1
      const offset = control?.[point]?.offset ?? control?.offset ?? 0

      return span + offset
    }

    // 统一获取当前断点下一行可容纳的列数，兼容 number 和响应式对象两种配置。
    const getCurrentCols = () => {
      if (typeof props.colConfig === 'number') {
        return props.colConfig
      }

      return props.colConfig?.[breakPoint.value] ?? 0
    }

    // 容器宽度和按钮宽度分开采集，但折叠阈值统一在这里重算，避免两边变化后状态不同步。
    const recalculateLayout = () => {
      // 只要有一个宽度还没拿到，就先不算。
      // 否则会出现 Infinity / NaN，进而让折叠逻辑失真。
      if (!searchContainerWidth.value || !searchActionBoxWidth.value) {
        return
      }

      // 沿用原有设计：
      // “容器总宽度 / 按钮区域宽度” 约等于当前一行可以容纳多少个基础布局单位。
      showSpnas.value = Math.floor(searchContainerWidth.value / searchActionBoxWidth.value)

      // 当前如果本来就是折叠态，宽度发生变化后需要同步重算折叠起点。
      if (collapsed.value) {
        calculateCollapsedIndex()
      }
    }

    // =========================
    // 外部状态同步
    // =========================
    // 同步外部 props.collapse。
    // immediate: true 是为了让首次挂载时也能拿到外部传进来的初始折叠状态。
    watch(
      () => props.collapse,
      (newValue: any) => {
        collapsed.value = newValue
      },
      {
        immediate: true,
      },
    )

    // =========================
    // 尺寸监听
    // =========================
    // 监听搜索容器尺寸变化。
    // 这里除了记录容器宽度，还会通知 Grid 重新命中断点，并在 DOM 更新后重新读取按钮区宽度。
    const handleResize = async (e: any) => {
      searchContainerWidth.value = e.width
      GridInstance.value?.resize(e.width)

      // 等待 Grid 的断点切换和 DOM 重排完成后，再读取按钮宽度，保证读取到的是最新布局结果。
      await nextTick()
      const _width = SearchActionEl.value?.offsetWidth
      searchActionBoxWidth.value = _width
      recalculateLayout()
    }

    // 点击展开/收起按钮时切换状态。
    // 展开时直接显示全部；折叠时需要重新计算隐藏起点。
    const handleCollapse = () => {
      collapsed.value = !collapsed.value
      if (collapsed.value) {
        calculateCollapsedIndex()
      } else {
        collapseIndex.value = -1
      }
    }

    // =========================
    // 表单项集合
    // =========================
    // 当前真正参与渲染的表单项。
    // 如果某一项配置了 hide()，则由该函数决定当前是否需要隐藏。
    const _cformControls = computed(() => {
      const elements = props.formControls.filter((item) => {
        if (item.hide && typeof item.hide === 'function') {
          return item.hide()
        }
        return true
      })
      return elements
    })

    // 表单项数量或显隐条件变化时，如果当前是折叠态，就重新计算折叠起点。
    watch(
      () => _cformControls.value,
      () => {
        if (collapsed.value) {
          calculateCollapsedIndex()
        }
      },
    )

    // 计算折叠后从哪一项开始隐藏，按钮区仍然按“占一个搜索项位”的原设计参与判断。
    function calculateCollapsedIndex() {
      collapseIndex.value = -1

      // 如果当前宽度还没来得及算出来，就先用 2 列做兜底，避免首次渲染直接出错。
      const maxColsPerRow = showSpnas.value || 2
      const elements = _cformControls.value
      let currentRowCols = 0
      let rowCount = 1
      const totalElements = elements.length

      // 逐项累加当前行已占用的列数。
      // 一旦超过当前行上限，就说明需要换行。
      for (let i = 0; i < totalElements; i++) {
        const elementCols = getControlCols(elements[i])
        const nextElementCol = i + 1 < totalElements ? getControlCols(elements[i + 1]) : 0

        if (currentRowCols + elementCols > maxColsPerRow) {
          rowCount++
          currentRowCols = elementCols
        } else {
          currentRowCols += elementCols
        }

        // 当走到最后一个允许显示的折叠行时，继续判断下一项还能不能放进去。
        // 如果放不下，那么下一项就是折叠起点。
        if (rowCount === props.collapsedRows) {
          if (currentRowCols + nextElementCol >= maxColsPerRow) {
            collapseIndex.value = i + 1
            return i + 1
          }
        }
      }
      collapseIndex.value = -1
    }

    // 监听按钮区尺寸变化。
    // 按钮区和容器宽度虽然分开监听，但最终都必须走统一的重算逻辑。
    const handleActionResize = (e: any) => {
      searchActionBoxWidth.value = e.width
      recalculateLayout()
    }

    // =========================
    // 表单模型
    // =========================
    // 组件内部维护的表单模型。
    // 当外部没有显式传入 searchModel 时，就使用这份内部状态。
    const insearchFormModel = ref({})

    // 统一的表单模型读写入口。
    // 这样组件可以同时支持外部受控和内部自管两种模式。
    const _searchModel: any = computed({
      get() {
        return props.searchModel || insearchFormModel.value
      },
      set(model: any) {
        insearchFormModel.value = model
        emit('update:searchModel', model)
      },
    })

    // 只重置某一个字段。
    // 这个方法会通过 expose 暴露给外部，方便表格联动或业务级字段清空。
    const resetField = (field: string, value = '') => {
      const newModle: any = { ..._searchModel.value }
      newModle[field] = value
      _searchModel.value = newModle
    }

    // 处理 formatValue。
    // formatValue 更偏“值级转换”，例如把日期数组处理成接口所需的入参对象。
    const getFormatValues = () => {
      return props.formControls.reduce((acc: any, item: SearchFormControlProps) => {
        const { field, formatValue } = item as any

        // 只处理显式提供了 formatValue 的表单项。
        if (typeof formatValue === 'function') {
          const value = _searchModel.value[field]

          // formatValue 既可以返回单值，也可以返回对象。
          // 返回对象时直接合并，便于一个字段展开成多个查询参数。
          const _formatV = formatValue(value)
          if (Object.prototype.toString.call(_formatV) === '[object Object]') {
            acc = { ...acc, ..._formatV }
          } else {
            acc[field] = _formatV
          }
        }
        return acc
      }, {})
    }

    // 处理 fieldFormat。
    // fieldFormat 更偏“字段级改写”，通常用于改字段名或拆出多个后端字段。
    const getFieldFormat = () => {
      // 每次重新计算前先清空上次记录，避免重复 push 导致删除字段范围越来越大。
      fieldFormatKeys.value = []

      return props.formControls.reduce((acc: any, item: SearchFormControlProps) => {
        const { field, fieldFormat } = item as any
        if (field && fieldFormat) {

          // fieldFormat 的结果同样支持对象和普通值两种形式。
          const formatResult = fieldFormat(_searchModel.value[field])
          if (typeof formatResult === 'object') {
            Object.assign(acc, formatResult)
          } else {
            acc[field] = formatResult
          }

          // 记录原字段，最终生成请求参数时需要删掉它。
          fieldFormatKeys.value.push(field)
        }
        return acc
      }, {})
    }

    // 生成最终查询参数。
    // 顺序是：原始模型 + formatValue 结果 + fieldFormat 结果，
    // 最后删除被 fieldFormat 改写过的原字段。
    const getValues = () => {
      const values = { ..._searchModel.value, ...getFormatValues(), ...getFieldFormat() }
      fieldFormatKeys.value.forEach((key) => {
        Reflect.deleteProperty(values, key)
      })
      return values
    }

    // 获取单个表单项的响应式布局配置。
    // 这些值会透传给 GridItem，用于控制每个表单项在网格中的占位。
    const getResponsive = (control: SearchFormControlProps, index: number) => {
      return {
        span: control?.span,
        offset: control?.offset ?? 0,
        xs: control?.xs,
        sm: control?.sm,
        md: control?.md,
        lg: control?.lg,
        xl: control?.xl,
        index,
      }
    }

    // 获取单个表单项的默认值。
    // defaultValue 支持普通值和函数两种形式。
    const getItemDefaultValue = (item: SearchFormControlProps) => {
      if (item.defaultValue) {
        return typeof item.defaultValue === 'function' ? item.defaultValue() : item.defaultValue
      }
      return ''
    }

    // 统一处理所有默认值并写回模型。
    // 优先级：modelDefault > defaultValueMap 缓存值 > 当前项 defaultValue。
    const handleDefaultValue = () => {
      const _dv: any = {}
      if (props.modelDefault) {
        for (const [key, value] of Object.entries(props.modelDefault)) {
          _dv[key] = typeof value === 'function' ? value() : value
        }
      }
      for (const item of props.formControls) {
        if (!item.field) return
        if (defaultValueMap.has(item.field)) {
          _dv[item.field] = defaultValueMap.get(item.field)
        } else if (item.defaultValue) {
          _dv[item.field] = getItemDefaultValue(item)
        }
      }
      insearchFormModel.value = _dv
      emit('update:searchModel', _dv)
    }

    // 判断当前配置中是否存在默认值。
    // 存在时，组件挂载前需要主动回填。
    const isDefaultValue = () => {
      if (props.modelDefault && Object.keys(props.modelDefault).length) {
        return true
      } else {
        return props.formControls.some((item: any) => item.defaultValue)
      }
    }

    // 预先缓存所有表单项的默认值。
    // 这样 reset 时不需要重新扫描和判断。
    const getDefaultValue = () => {
      for (const item of props.formControls) {
        if (item.field && item.defaultValue) {
          defaultValueMap.set(item.field, getItemDefaultValue(item))
        }
      }
    }

    // 获取“reset 后仍然应该保留”的默认值集合。
    // clearDefaultValue 为 false 的字段，不会在 reset 时被清空。
    const getNotClearDefaultValues = () => {
      const newObj: any = {}
      const _clearDefaultValue = props.clearDefaultValue
      for (const item of props.formControls) {
        const { field, clearDefaultValue } = item
        if (!field) continue
        if (clearDefaultValue === false || !_clearDefaultValue) {
          newObj[field] = props.modelDefault?.[field] ?? getItemDefaultValue(item)
        }
      }
      return newObj
    }

    // 点击重置按钮。
    // 这里不是简单把表单清空，而是回退到“允许保留的默认值”状态。
    const handleReset = () => {
      props.beforeResetFun()
      _searchModel.value = getNotClearDefaultValues()
      emit('on-reset')
      props.afterResetFun()
    }

    // 点击查询按钮。
    // 最终抛给外部的一定是已经过格式化处理的参数对象。
    const handleQuery = () => {
      const values = getValues()
      emit('on-search', values)
      props.afterSearchFun?.(values)
    }

    // 判断是否需要显示“展开/收起”按钮。
    // 只有当前搜索项已经超出折叠行数时，才显示这个入口。
    const showCollapse = computed(() => {
      let totalSpan = 0
      let show = false

      const currentCols = getCurrentCols()

      if (!currentCols) {
        return false
      }

      // 这里仍然保留“+1”的规则，表示查询按钮区域占用一个表单元素宽度。
      const totalCol = _cformControls.value.reduce((prev, control: SearchFormControlProps) => {
        prev += getControlCols(control)
        return prev
      }, 0)

      for (const control of _cformControls.value) {
        totalSpan += getControlCols(control)

        if (totalSpan > currentCols) {
          show = true
          break
        }
      }

      const rows = Math.ceil((totalCol + 1) / currentCols)
      if (rows > props.collapsedRows) {
        show = true
      } else {
        show = false
      }

      return show
    })

    // 提供给 GridItem 的折叠起点。
    // GridItem 会根据 index 和 collapseIndex 判断自己当前是否显示。
    provide('collapseIndex', collapseIndex)

    // 对外暴露的方法。
    // 当前和 pro-table 联动最关键的是 getValues，它决定真正请求接口时的参数长什么样。
    expose({ resetField, getFormatValues, getValues, getFieldFormat, handleDefaultValue })

    // keep-alive 激活时重新读取尺寸。
    // 否则从别的页面返回后，搜索区可能仍然保留旧宽度对应的折叠状态。
    onActivated(() => {
      if (!hasFormControls.value) return
      const rect = searchFormInstance.value?.getBoundingClientRect()
      handleResize(rect)
    })

    // 当前是否存在可渲染的表单项。
    const hasFormControls = computed(() => {
      return Boolean(props?.formControls?.length)
    })

    // 组件挂载前初始化默认值。
    onBeforeMount(() => {
      if (!hasFormControls.value) return
      getDefaultValue()
      getNotClearDefaultValues()
      if (isDefaultValue()) handleDefaultValue()
    })

    // 首次挂载后，如果默认就是折叠态，则立即计算折叠起点。
    onMounted(() => {
      if (props.collapse && hasFormControls.value) {
        calculateCollapsedIndex()
      }
    })

    return () => {
      return hasFormControls.value ? (
        // 搜索表单根容器。
        // 通过尺寸监听驱动断点切换和折叠重算。
        <div
          ref={searchFormInstance}
          v-resizeElement={handleResize}
          class="yto-search-form relative overflow-hidden rounded-[8px] bg-white px-[16px] pt-[20px]"
        >
          {/* Element Plus 表单容器，负责统一 label 对齐和表单项布局外壳。 */}
          <ElForm model={_searchModel.value} class="search-form" label-width="auto">
            {/* Grid 只负责网格布局，不直接决定折叠策略。 */}
            <Grid
              ref={GridInstance}
              collapsed={collapsed.value}
              gap={[16, 0]}
              cols={props.colConfig}
              collapsedRows={props.collapsedRows}
            >
              {_cformControls.value.map((control: SearchFormControlProps, index: number) => {
                return (
                  // 每个搜索项都是独立的网格单元。
                  <GridItem key={control.field} {...getResponsive(control, index)}>
                    <ElFormItem label={control.label} class="!mb-[20px]">
                      {control.field ? (
                        // SearchFormItem 会根据配置决定实际渲染 input、select、date-picker 等具体控件。
                        <SearchFormItem
                          v-model={_searchModel.value[control.field]}
                          control={control}
                          cslot={slots[control.field]}
                        />
                      ) : null}
                    </ElFormItem>
                  </GridItem>
                )
              })}

              {/* 查询/重置按钮区域。
                  suffix 表示它作为尾部占位项参与网格布局和折叠计算。 */}
              <GridItem suffix v-resizeElement={handleActionResize}>
                <div ref={SearchActionEl} class="search-action-box flex items-center justify-end mb-[20px]">
                  {props.okpos === 'right' ? (
                    <>
                      <ElButton onClick={handleReset}>重置</ElButton>
                      <ElButton type="primary" onClick={handleQuery}>
                        查询
                      </ElButton>
                    </>
                  ) : (
                    <>
                      <ElButton type="primary" onClick={handleQuery}>
                        查询
                      </ElButton>
                      <ElButton onClick={handleReset}>重置</ElButton>
                    </>
                  )}
                </div>
              </GridItem>
            </Grid>
          </ElForm>

          {/* 折叠按钮区域。
              只有 showCollapse 为 true 时才会显示。 */}
          {showCollapse.value && (
            <div class={`collapse-btn-box absolute bottom-0 left-0 w-full flex justify-center`}>
              <div
                class={`collapse-btn h-[20px] w-[60px] flex items-center justify-center ${collapsed.value ? 'down' : 'up'}`}
                onClick={handleCollapse}
              >
                <svg
                  v-show={!collapsed.value}
                  width="10px"
                  height="10px"
                  viewBox="0 0 14 13"
                  fill="none"
                  class="c-g-700 m-t-3-n yt-icon yt-icon-chevron-up-double"
                >
                  <path
                    d="M7.01 1.86 1.436 7.434l-.849-.849 6-6a.6.6 0 0 1 .849 0l6 6-.849.849-5.575-5.576Zm0 5-5.575 5.575-.849-.849 6-6a.6.6 0 0 1 .849 0l6 6-.849.849-5.575-5.576Z"
                    fill="currentColor"
                    stroke="none"
                    stroke-width="0"
                    stroke-linecap="round"
                  ></path>
                </svg>
                <svg
                  v-show={collapsed.value}
                  width="10px"
                  height="10px"
                  viewBox="0 0 14 13"
                  fill="none"
                  class="c-g-700 m-t-3-n yt-icon yt-icon-chevron-down-double"
                >
                  <path
                    d="m7.01 10.99 5.575-5.575.849.849-6 6a.6.6 0 0 1-.849 0l-6-6 .849-.849 5.575 5.576Zm0-5L12.584.416l.849.849-6 6a.6.6 0 0 1-.849 0l-6-6 .849-.849 5.575 5.576Z"
                    fill="currentColor"
                    stroke="none"
                    stroke-width="0"
                    stroke-linecap="round"
                  ></path>
                </svg>
              </div>
            </div>
          )}
        </div>
      ) : null
    }
  },
})
