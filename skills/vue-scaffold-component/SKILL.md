---
name: vue-scaffold-component
description: 在已有 Vue 3 + TS 中后台工程内，按 vue-scaffold-app 规范封装一个业务级"自动加载"组件（远程下拉 / 状态选择器 / 字典选择器等）。当用户说"封装 xx 选择器"、"封装 xx 下拉"、"做一个 xx select 组件"、"把 xx 字典做成组件"、"在 custom-components 加一个 xx select"等时使用。生成 src/custom-components/ 下的二次封装组件，支持默认数据过滤、外部覆盖，调用方一行 v-model 即可。
user-invocable: true
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# vue-scaffold-component — 业务封装组件生成器

封装一个"自带数据加载逻辑"的业务下拉 / 选择器组件，放到 `src/custom-components/`。调用方一行 `<XxxSelect v-model="..." />` 就能用，不需要写 `loadOptions` + `optionsRef` + el-select / el-option 的样板代码。

## 何时使用

- 用户说 "封装一个开放联盟链框架选择器"
- 用户说 "把状态字典做成组件"
- 用户说 "做一个能自请求的 xx select"
- 主 skill `vue-app-scaffold` 或子 skill `vue-scaffold-module` 在需要业务下拉时调度

## 前置假设

目标项目应已具备：
1. `src/components/remote-search` 通用远程搜索组件（支持 `url` / `labelKey` / `valueKey` / `dataCallback` / `isRemoteSearch` 等 props）
2. `src/custom-components/` 目录存在（不存在则新建）
3. 命名遵循 `<项目前缀><实体名>Select` 约定（示例：`<Prefix>ChainFrameworkSelect.tsx` / `<Prefix>StatusSelect.tsx`）

## 输入参数

| 参数 | 含义 | 示例 |
|---|---|---|
| `componentName` | 组件文件名（PascalCase） | `<Prefix>CategorySelect` |
| `apiUrl` | 数据来源接口 | `/<service>/anon/v1/<entity>/searches` |
| `httpMethod` | 请求方法 | `POST` |
| `labelKey` | 选项文本字段 | `categoryName` |
| `valueKey` | 选项值字段 | `categoryId` |
| `placeholder` | 占位文本 | `全部` / `请选择` |
| `defaultFilter` | 是否做默认数据过滤 | 例：只保留某条业务线下的选项 |

不清楚时主动用 AskUserQuestion 询问。

## 标准产物

```
src/custom-components/<ComponentName>.tsx
```

每个组件一个 `.tsx` 文件，**不放在子目录**——`custom-components/` 下保持扁平结构。

## 模板代码

### 基础形态（无默认过滤）

```tsx
import { h } from 'vue'

import RemoteSearch from '@/components/remote-search'

interface <ComponentName>Props {
  modelValue?: string | number
  'onUpdate:modelValue'?: (value: string | number) => void
  onAfterRemote?: (list: any[]) => void
}

const <ComponentName> = (_props: <ComponentName>Props, context: any) => {
  return h(RemoteSearch, {
    isRemoteSearch: false,
    url: '<api-url>',
    method: '<http-method>',
    labelKey: '<label-key>',
    valueKey: '<value-key>',
    placeholder: '<placeholder>',
    ...context.attrs,
  })
}

export default <ComponentName>
```

### 带默认过滤的形态

```tsx
import { h } from 'vue'

import RemoteSearch from '@/components/remote-search'

interface <ComponentName>Props {
  modelValue?: string | number
  'onUpdate:modelValue'?: (value: string | number) => void
  onAfterRemote?: (list: any[]) => void
}

// 默认对接口返回做一次业务过滤，调用方可通过 attrs 传入自定义 dataCallback 覆盖。
const defaultDataCallback = (list: any[]) => {
  if (!Array.isArray(list)) return []
  return list.filter(item => /* 过滤条件 */)
}

const <ComponentName> = (_props: <ComponentName>Props, context: any) => {
  return h(RemoteSearch, {
    isRemoteSearch: false,
    url: '<api-url>',
    method: '<http-method>',
    labelKey: '<label-key>',
    valueKey: '<value-key>',
    placeholder: '<placeholder>',
    dataCallback: defaultDataCallback,
    ...context.attrs,
  })
}

export default <ComponentName>
```

> `context.attrs` 在最后展开，**调用方传入的同名 prop 会覆盖默认值**。例如：
>
> ```tsx
> <<Prefix>CategorySelect :data-callback="list => list" />
> // 调用方显式传 dataCallback，覆盖默认过滤逻辑
> ```

### 字典型（带字典 code 参数）

如果项目里的字典接口走"传字典 code 取一组选项"模式（接口的 `code` 字段名 / 返回字段名按项目实际后端约定填，这里只是示意），组件给一个必传 prop：

```tsx
import { h } from 'vue'

import RemoteSearch from '@/components/remote-search'

interface <ComponentName>Props {
  modelValue?: string | number
  dictCode: string  // 字典类型 code，字段名按项目后端约定改
  'onUpdate:modelValue'?: (value: string | number) => void
  onAfterRemote?: (list: any[]) => void
}

const <ComponentName> = (props: <ComponentName>Props, context: any) => {
  return h(RemoteSearch, {
    isRemoteSearch: false,
    url: '<api-url>',
    method: 'POST',
    requestParams: { dictCode: props.dictCode },
    labelKey: '<label-field>',
    valueKey: '<value-field>',
    placeholder: '请选择',
    ...context.attrs,
  })
}

export default <ComponentName>
```

调用方：

```tsx
<<Prefix>StatusSelect
  v-model={model.value}
  dictCode="<DICT_CODE>"
  onAfterRemote={handleStatusOptions}
/>
```

## 调用约定

```tsx
// search-form constants.tsx 里用 render
import <ComponentName> from '@/custom-components/<ComponentName>'

{
  field: 'categoryId',
  label: '类别',
  render: (model: any) => (
    <<ComponentName> v-model={model.value} />
  ),
}

// 弹窗 / 表单里直接当 select 用
<<ComponentName> v-model="formModel.categoryId" placeholder="请选择" />
```

## 强制规则

1. **文件路径**：`src/custom-components/<ComponentName>.tsx`，**绝不放 `src/components/`**（那是通用基础组件，自动注册）
2. **使用方式**：**显式 import**，不依赖自动注册——`custom-components/` 是业务封装层，不进全局自动注册名字空间
3. **二次封装而非新造轮子**：内部一定是 `h(RemoteSearch, ...)`，不要直接写 `h(ElSelect, ...)` + 手动管理数据加载
4. **`...context.attrs` 必须最后展开**：保证调用方能覆盖任何默认行为
5. **业务过滤用 `dataCallback`**：不要在 view 层 watch options 数组再过滤
6. **命名**：`<项目前缀><实体名>Select`（示例：`<Prefix>CategorySelect` / `<Prefix>StatusSelect`），避免和通用基础组件名字冲突

## 反模式

- ❌ 在 `<el-select>` + `v-for="el-option"` 模式里写死数据加载，散落在多个业务模块（用本组件统一）
- ❌ 把组件放在 `src/components/`（会被自动注册到全局，污染基础组件名字空间）
- ❌ 组件内 `import { getXxxList } from '@/api/...'` 然后自己 fetch（用 `RemoteSearch` 的 `url`，让通用组件处理）
- ❌ 默认 `dataCallback` 写死项目业务，且不允许覆盖（始终把 `...context.attrs` 放最后）
- ❌ 用 `<script setup>` 写组件（业务封装组件用 functional `.tsx`，更轻）

## 完成后

提示用户在 search-form 的 `constants.tsx` 或弹窗表单里改用新组件，并删除老的 `xxxOptions` ref / `loadXxxOptions` 函数 / `mapOptions` 调用。

## 引用

主 skill `vue-app-scaffold/references/component-conventions.md` 有更多设计原则；本子 skill 内嵌的模板已是最小可运行版本。
