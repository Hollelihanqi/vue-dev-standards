---
name: vue-scaffold-hd-ui
description: 给工程装 @rdeam/hd-ui 作为基础组件库——装包 + vite.config.ts 接 HdCustomResolver（from '@rdeam/hd-ui/resolvers'）+ element-plus 主题构建插件，模板里 <hd-pro-table /> / <hd-table /> / <hd-sticky-container /> / <hd-text-ellipsis /> / <hd-jdata-viewer /> / <hd-remote-search /> 等按需自动注册、带 theme-chalk 样式。当用户说"装基础组件"、"新工程要 pro-table/table/sticky-container"、"配 HdCustomResolver"等时使用。vue-scaffold-app Step 7 标准落地。
user-invocable: true
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# vue-scaffold-hd-ui — 基础组件库 @rdeam/hd-ui

工程的基础组件来自 npm 包 `@rdeam/hd-ui`。`HdCustomResolver` 按需自动注册，模板写 `<hd-xxx />`，不 import、源码不进业务仓库。

## 何时用

- 新工程 `vue-scaffold-app` Step 7
- 用户要用 `<hd-pro-table>` / `<hd-table>` / `<hd-sticky-container>` 等基础组件

BaseX 放 `src/components/`，由 `AppComponentsResolver` 注册，不走本 skill。

## 标签速查

| 标签 | 用途 |
|---|---|
| `<hd-pro-table>` | 列表页：分页 + 查询区 + 列配置 + 操作列 |
| `<hd-table>` | 纯表格：详情子表 / 弹窗内表（JSX 里作 `<HdTable>`） |
| `<hd-sticky-container>` | 吸顶吸底容器：`#header`/`#default`/`#footer` 插槽 |
| `<hd-text-ellipsis>` | 文本省略（`expand-text`/`collapse-text` 控展开） |
| `<hd-jdata-viewer>` | JSON 查看（`data`/`theme`/`render-h-tag`） |
| `<hd-remote-search>` | 远程下拉（url 模式必须传 `:requester="request"`） |

## 执行步骤

### 1. 装依赖

```bash
pnpm add @rdeam/hd-ui @rdeam/vue-components-resolver @rdeam/vite-plugin-element-plus-theme-builder
```

- `@rdeam/hd-ui`：组件库，`HdCustomResolver` 在子路径 `@rdeam/hd-ui/resolvers`
- `@rdeam/vue-components-resolver`：`AppComponentsResolver`，扫 BaseX 等本地组件
- `@rdeam/vite-plugin-element-plus-theme-builder`：编译品牌主题、按需打包，替代 `element-plus/dist/index.css`

不擅自 install——先列依赖让用户定包管理器。

### 2. 配 vite.config.ts

```ts
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { AppComponentsResolver } from '@rdeam/vue-components-resolver'
import { HdCustomResolver } from '@rdeam/hd-ui/resolvers'                  // ← 子路径
import { elementPlusThemeBuilder } from '@rdeam/vite-plugin-element-plus-theme-builder'

plugins: [
  elementPlusThemeBuilder({
    colors: { primary: '#1558cb', success: '#67c23a', warning: '#e6a23c', danger: '#f56c6c', error: '#f56c6c', info: '#909399' },
    injectTo: 'head-prepend',   // 主题 CSS 必须排在业务样式之前，否则 dev/打包不一致
  }),
  // ...
  AutoImport({
    imports: ['vue', 'vue-router', 'pinia'],
    resolvers: [ElementPlusResolver({ importStyle: false })],   // 样式由 theme-builder 出
    dts: 'src/types/auto-imports.d.ts',
  }),
  Components({
    dirs: [],
    resolvers: [
      ElementPlusResolver({ importStyle: false }),
      AppComponentsResolver(),     // BaseX 等本地组件
      HdCustomResolver(),          // <hd-xxx> 自动带入组件 + theme-chalk
    ],
    dts: 'src/types/components.d.ts',
  }),
],
```

**禁止** `import 'element-plus/dist/index.css'`。

### 3. 校验

跑 `pnpm dev`，任意业务页加 `<hd-sticky-container class="h-full" />`，渲染且主题色对即通过。`src/types/components.d.ts` 首次 dev/build 自动生成 Hd* 类型，不用手改。

## 使用约定（写进工程 CLAUDE.md）

- 模板标签**一律 kebab-case**（`<hd-pro-table>`），**禁止** PascalCase。
- 类型从**根入口**引：`import type { ColumnsItemProps, SearchFormControlProps } from '@rdeam/hd-ui'`；列配置用 `ColumnsItemProps[]`（`copy: true` 等靠索引签名兼容）。
- **JSX/tsx 用 hd-ui 组件必须显式 import + PascalCase**（自动注册对 JSX 不生效）：`import { HdRemoteSearch } from '@rdeam/hd-ui'`。
- **`HdRemoteSearch` 不内置 axios**：url 模式必须传 `:requester="request"`（`@/utils/request`）；`requestApi` 模式不需要。
- `src/components/` 只放 BaseX，不放 hd-ui 已有的组件。

## 与其它 skill 的协作

| skill | 关系 |
|---|---|
| `vue-scaffold-app` | Step 7 调起本 skill |
| `vue-scaffold-module` | 业务页用 `<hd-pro-table>`，列/查询控件类型从 `@rdeam/hd-ui` 引 |
| `vue-scaffold-component` | `custom-components/` 远程下拉用 `HdRemoteSearch` + `requester` |
| `vue-scaffold-layout` | `<hd-sticky-container>` / `<hd-pro-table>` vs `<hd-table>` 选型 |
| `vue-scaffold-review` | 按 hd-ui 口径审查：kebab-case、类型导入源、`HdRemoteSearch` 带 requester |
