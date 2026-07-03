---
name: vue-scaffold-layout
description: Vue 3 中后台门户的页面布局与高度契约规范（撑满不溢出、不出现"半截"、view 根节点、菜单宽度、操作列写法）。当用户说"按布局规范检查页面"、"页面为什么有半截 / 留白 / 滚动条不对"、"layout-main 高度怎么算"、"新页面根节点怎么写"、"操作列用 width 还是 minWidth"、"菜单多宽"等时使用。本 skill 是 vue-scaffold-app / vue-scaffold-module 生成页面时布局相关规则的唯一权威来源，所有具体像素值均从标准工程真实代码提取。
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# vue-scaffold-layout — 页面布局与高度契约

本 skill 是「页面外壳如何撑满、内容如何滚动、view 根节点怎么写」的**唯一权威来源**。
`vue-scaffold-app`（生成 `Layout.vue` / `Main.vue`）和 `vue-scaffold-module`（生成 list / detail 页）凡涉及布局，一律以本文件为准。

目标：**用脚手架起项目、加功能时，页面第一眼就是规范化的——撑满、不溢出、不"半截"，所有人写出来长一个样。**

## 何时使用本 skill

- 起新项目 / 加新页面前，确认外壳与 view 根节点的写法
- 页面出现"半截"（灰底透出来、内容没铺满白卡片）、莫名留白、双滚动条、内容被裁切时排查
- review 时检查某页是否符合布局契约

## 核心心智模型：一条从 100vh 向下分配的高度链

整个应用的高度是一条**自上而下逐级分配**的链。每一级都用 flex 把高度交给下一级，**最底下的内容区永远等于"剩余高度"**，绝不靠内容把页面顶高。

```
#app                       width:100vw; height:100vh        ← 唯一的 100vh 源头（App.vue 全局 <style>）
└ .layout-root             flex h-full w-full overflow-hidden
  ├ <TheSidebar/>          渲染 aside.layout-sider（品牌区 + <TheMenu/> + 平台页脚），展开 w-[220px] / 收起 w-16
  └ section.layout-body    flex min-h-screen min-w-0 flex-1 flex-col
    ├ .layout-header       flex h-16 ...                     ← 固定高 64px
    ├ .layout-breadcrumb   flex h-10 ...                     ← 固定高 40px
    └ main.layout-main     flex-1 overflow-hidden p-4 md:px-5 ← 吃掉剩余高度，自身禁止滚动
      └ div                h-full w-full + 圆角(见下)         ← 高度容器，把 h-full 透传给 view
        └ <RouterView/> → view 页面根节点（view-w h-full ...）← 你写的业务页从这里开始
```

**关键不变量**：`layout-main` 用 `flex-1 overflow-hidden` —— 它**吃掉除 header/breadcrumb 外的全部剩余高度**，且**自己永远不滚动**。需要滚动时，滚动发生在 view 内部的专用容器里，不是 layout-main 身上。

## 六条强制规则（均带真实参数）

> **规则编号（供 `vue-scaffold-review` 引用）**：
> `L1` layout-main padding · `L2` 撑满不溢出 / hd-sticky-container 慎用 · `L3` 不准半截（白底 + 按需圆角）· `L4` 菜单宽度（展开自定 / 收起 w-16）· `L5` 操作列用 width · `L6` view 根节点挂 view-w · `L7` 菜单由路由派生（与面包屑同源）· `L8` 外壳组件职责边界（Layout 只装配 / TheSidebar 拥有侧栏 / TheMenu 只管菜单）。

### 规则 L1 · layout-main 的 padding 是 `p-4 md:px-5`

```
<main class="layout-main flex-1 overflow-hidden p-4 md:px-5">
```

- 移动端（<768px）：四周 `p-4` = 16px
- 桌面端（≥768px）：左右 `px-5` = 20px（上下仍是 16px，由 `p-4` 提供）

这是 view 页面外侧唯一的留白来源，**view 自己不要再加外边距**。

### 规则 L2 · 高度自动撑满，layout-main 禁止溢出（以真实 `Main.vue` 为准）

真实 `Main.vue` 就是这么写的，照抄即可，**不要改动**：

```vue
<div class="layout-main flex-1 overflow-hidden p-4 md:px-5">
  <div class="h-full w-full max-md:rounded-[0.875rem] max-md:p-3.5 md:rounded-[1rem]">
    <RouterView ... />
  </div>
</div>
```

- 默认情况下，**list 页的列表区、detail 页的内容区都自动占满剩余高度**——靠的就是上面那条 `h-full` 高度链，view 根节点挂 `h-full` 即可继承。
- `layout-main` 必须是 `overflow-hidden`，**绝不允许改成 `overflow-auto` 让外壳自己滚动**（那会出现整页滚动 + header 跟着滚的坏体验）。
- **默认就应该让内容在一屏内放下**——list 页内部滚动由 `<hd-pro-table>` 自己处理；detail / 表单页优先靠精简字段、分区、合理留白把内容塞进剩余高度，而不是让它溢出。

#### `hd-sticky-container` —— 内容超长时的滚动容器

- `<hd-sticky-container>` 是详情 / 表单页内容**确实超长、无法精简进一屏时**的滚动容器。优先把内容精简 / 分区到一屏内；真要滚动才用它。
- **判断标准**：页面**最后一个模块若高度自适应**（用 `flex-1` 吃掉剩余高度），整页就能在一屏内放下，**不需要 `<hd-sticky-container>`**——根节点 `view-w h-full` + 内容 `flex h-full flex-col`，最后一块挂 `flex-1` 即可撑满。只有最后一块也无法自适应、内容确实溢出时，才用它。
- 违规写法：给 view 根节点或 `layout-main` 直接挂 `overflow-auto` / `overflow-y-scroll` 凑合滚动。要滚动就用 `<hd-sticky-container>`。

#### hd-pro-table 的高度契约（list 页能否自滚的关键，照抄勿简化）

「list 页内部滚动由 hd-pro-table 自己处理」能成立，**前提是 hd-pro-table 自身实现了高度自适应**。`@rdeam/hd-ui` 的标准实现就是这套结构：

```vue
<!-- hd-pro-table 根：撑满父级 + 纵向 flex + overflow-hidden -->
<div class="pro-table-w h-[100%] w-[100%] flex flex-col overflow-hidden gap-2">
  <hd-search-form ... />                              <!-- 查询区：自然高度 -->
  <div class="ptable-box flex-1 h-0 p-[16px] bg-white"> <!-- 表体区：flex-1 h-0 吃掉剩余高度 + 自带白底 -->
    <hd-table ... />                                  <!-- 表格在此容器内部滚动 -->
  </div>
</div>
```

- **撑高统一用 `flex-1 h-0`，不要用 `min-h-0`**：`flex-1` 吃掉剩余高度、`h-0` 让其可收缩到内容以下从而内部滚动。全站统一（`<hd-sticky-container>`、`<hd-table>` 同理）。
- hd-pro-table **自带白底**（`ptable-box bg-white`）：list 页 view 根节点只写 `view-w h-full w-full`，**不要**再包灰底容器、也不要手写 `bg-white`。
- view 根节点的 `h-full` 是喂给 hd-pro-table 的**唯一高度来源**——它是 `h-[100%]`，缺了这层 `h-full` 会塌成 0。

> ⚠️ **list 页被裁 / 不滚，根因只会是组件没按上面的高度契约实现**。修复方式是**用标准 `<hd-pro-table>`**（`@rdeam/hd-ui`），**绝不是**在调用方打补丁——给业务页或 `layout-main` 套 `overflow-auto`、给 list 页手加滚动容器都是错的，会掩盖组件缺陷并破坏 L2。

#### hd-pro-table vs hd-table —— 选型边界（必须分清）

两者功能不同，按场景选，业务页一律**不准裸用 `<el-table>`**：

| 场景 | 用哪个 | 说明 |
|---|---|---|
| 标准 CRUD **列表页**（有查询表单 + 分页） | `<hd-pro-table>` | = `<hd-search-form>` + `<hd-table>` 组合，自带查询/重置联动、白底卡片、`flex-1 h-0` 高度自适应（满足 L2/L3） |
| 只要表格、**无查询表单**（详情页子表、弹窗内表格、无查询的简单表） | `<hd-table>` | 纯表格：列配置 / 排序 / 分页 / 合计行 / 多级表头 / 空状态，可传 `request-api` 自拉或直接喂 `data`，不含查询表单 |
| 原生 `<el-table>` | ❌ 禁止 | 缺特性应去扩展 `<hd-table>`，不在业务页裸用（见 `[A14]`） |

- **判据**：页面要不要顶部查询表单——要 → `<hd-pro-table>`；不要 → `<hd-table>`。
- `<hd-pro-table>` 已包含 `<hd-table>`，二者不叠用（别在 `<hd-pro-table>` 外再套 `<hd-table>`）。

### 规则 L3 · 任何页面都不能"半截"——view 自带白底（列表页不需要圆角，hd-pro-table 已自带）

"半截" = view 没铺满白色卡片，底部背景色透出来。**每个 view 根节点必须 `h-full` 撑满**，白底和圆角按类型处理：

| 页面类型           | view 根节点写法                                                                             | 白底来源                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **增删改查列表页** | `<div class="view-w h-full w-full">` 内直接放 `<hd-pro-table>`                              | **hd-pro-table 自带卡片**，无需手写白底——保持标准列表态即可（见下方"列表页标准态"） |
| **详情页**         | `<div class="view-w h-full flex flex-col bg-white rounded-2 p-6 gap-6">`                    | 根节点自身 `bg-white rounded-2`                                                  |
| **表单 / 资料页**  | `<div class="view-w h-full w-full">` 内放 `<el-card class="page-fill-card" shadow="never">` | `page-fill-card` 撑满的卡片                                                      |

**列表页标准态**：只要根节点 `view-w h-full` + 直接用 `<hd-pro-table>`，就是合规的，不会"半截"。不要在 hd-pro-table 外再套自定义灰底容器。

> **列表页标准结构**：根节点 `view-w h-full w-full` 下只放一个 `<hd-pro-table>`；查询区用 `:form-controls` 传入，"新增"等按钮放 `#tableHeader` 插槽，弹层挂在 `view-w` 同级（template 多根）。
>
> ```vue
> <div class="view-w h-full w-full">
>   <hd-pro-table :columns="columns" :form-controls="searchFormList" :request-api="requestTableData">
>     <template #tableHeader>
>       <el-button type="primary" @click="handleCreate">创建项目</el-button>
>     </template>
>   </hd-pro-table>
> </div>
> <XxxCreate v-model="createDialogVisible" />
> ```

### 规则 L4 · 左侧菜单宽度（展开自定，收起 w-16）

```
<aside class="layout-sider flex-shrink-0 h-full overflow-hidden"
       :class="sidebarCollapsed ? 'w-16' : 'w-[220px]'">
```

- 展开宽度**由项目自定**，推荐 `w-[220px]`（220–260 之间都合理），不强制具体像素值。
- 收起：`w-16`（64px，只剩图标）——只要求保留折叠两态且收起后只剩图标。

### 规则 L5 · 表格操作列用 `width`，不要用 `minWidth`

操作列内容固定（几个按钮），宽度应当**锁死**，不能跟随表格弹性伸缩：

```tsx
{
  prop: 'operation',
  label: '操作',
  fixed: 'right',
  width: 160,        // ✅ 固定宽度，按钮多就调大（如 300）
  // minWidth: 160,  // ❌ 操作列禁止用 minWidth
  render: ...
}
```

普通数据列可以继续用 `minWidth`（需要弹性）；**唯独操作列用 `width`**。

### 规则 L6 · view 根节点必须挂 `view-w` class

`views/` 下凡是**独立路由页面**（list / detail / 表单页等，即挂到 router、走 Layout `<RouterView>` 的页面），其模板**根节点必须挂 `view-w`**。

```vue
<template>
  <div class="view-w h-full w-full">
    <!-- ✅ 根节点 view-w + h-full -->
    <hd-pro-table ... />
  </div>

  <!-- 弹层组件挂在 view-w 同级，不嵌进根 div（见 vue-scaffold-module 规则）；文件名不带 Dialog / Drawer 后缀 -->
  <SomeCreate v-model="visible" />
</template>
```

- `view-w` 是 view 页面的统一标识类，Layout 通过它识别"这是走 Layout 容器的业务页"。
- 其余原子类（`h-full` / `w-full` / `flex flex-col` / `bg-white rounded-2 p-6` 等）按页面类型（规则 3）追加。
- 反模式：用自定义 class（如 `class="project-page"`）替代 `view-w`。

### 规则 L7 · 左侧菜单由路由派生，禁止硬编码

菜单经 `buildMenuTree(menuRoutes)` 派生，`TheMenu` 递归渲染 `TheMenuItem`；不写死菜单数组、不在 `useLayout` 直接返回原始路由。单子路由模块自动提升为一级，需保留父级分组时给父路由加 `meta.alwaysShow: true`。这样菜单与面包屑（`createBreadcrumbs(route.matched)`，两级）同源一致。

```ts
// useLayout.ts
const layoutMenuRoutes = computed(() => buildMenuTree(menuRoutes))
return { menuRoutes: layoutMenuRoutes /* ... */ }
```

```vue
<!-- TheMenu.vue -->
<el-menu :default-active="activeMenu" :default-openeds="openedPaths" router>
  <TheMenuItem v-for="item in routes" :key="item.path" :menu="item" />
</el-menu>
```

### 规则 L8 · 外壳组件职责边界（Layout 只装配）

```
Layout.vue        只装配区域，自身几乎无样式
├ <TheSidebar/>   aside 外壳 + 品牌区 + <TheMenu/> + 平台页脚（含侧栏 scoped 样式）
└ <section>
  ├ <TheHeader/>
  ├ <TheBreadcrumb/>
  └ <Main/>
TheMenu.vue       只含 el-menu + 递归 TheMenuItem，不含品牌 / 页脚
```

- `Layout.vue` 模板只能是区域组件装配；出现 `aside` 外壳 / 品牌 / 页脚等内部 DOM 即违规，下沉到对应区域组件。
- 侧栏外壳、品牌、页脚及其 scoped 样式归 `TheSidebar.vue`，不留在 `Layout.vue`。
- 命名即职责：`TheMenu` 只能是菜单。塞品牌 / 页脚进 `TheMenu` 是反模式。
- 数据 props 自上而下透传（`Layout`→`TheSidebar`→`TheMenu`），事件逐层 emit 回 `Layout` 决策;`TheSidebar` 对菜单事件只透传不决策。

### 规则 L9 · 业务页只用 `<div>`，布局语义标签仅限 layout 层

`views/` 下的业务页（list / detail / 表单 / 内容模块组件）一律用 `<div>`，**禁用** `section` / `main` / `header` / `footer` / `nav` / `aside` / `article`。

- 这些标签只允许出现在 layout 外壳（`Layout.vue` / `TheSidebar.vue` / `Main.vue`）。
- 文本级标签不限：`h1~h6` / `p` / `b` / `span` 等照常用。

## 自检清单

起新页面 / review 时逐条过：

- [ ] view 根节点挂了 `view-w` 且带 `h-full`
- [ ] 列表页：`view-w h-full` 内直接 `<hd-pro-table>`，没套多余灰底容器
- [ ] 详情页 / 表单页：根节点带 `bg-white rounded-2 p-6`，铺满无"半截"；列表页只挂 `view-w h-full`，圆角由 hd-pro-table 自带
- [ ] 页面内无 `overflow-auto`/`overflow-y-scroll` 凑合滚动；内容超长需滚动时用 `<hd-sticky-container>`
- [ ] 没有改动外壳 `layout-main` 的 `overflow-hidden` / `p-4 md:px-5`
- [ ] 菜单有展开/收起两态，收起 `w-16` 只剩图标（展开宽度自定，不限具体值）
- [ ] 表格操作列用 `width` 不用 `minWidth`，`fixed: 'right'`
- [ ] `Layout.vue` 只装配区域组件（`TheSidebar`/`TheHeader`/`TheBreadcrumb`/`Main`），没把 `aside` 外壳 / 品牌 / 页脚的内部 DOM 摊在自己模板里（L8）
- [ ] 侧栏外壳 + 品牌 + 页脚及其 scoped 样式收在 `TheSidebar.vue`；`TheMenu.vue` 只含菜单，无品牌 / 页脚（L8）
- [ ] 业务页模板只用 `<div>`，无 `section`/`main`/`header`/`footer`/`nav`/`aside`/`article`（仅限 layout 外壳，L9）
