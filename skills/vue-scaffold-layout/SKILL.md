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
└ .layout-root             flex h-full w-full overflow-hidden bg-[#eef2f8]
  ├ aside.layout-sider     flex-shrink-0 h-full overflow-hidden  ← 展开 w-[220px] / 收起 w-16
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
> `L1` layout-main padding · `L2` 撑满不溢出 / sticky-container 慎用 · `L3` 不准半截（白底圆角）· `L4` 菜单宽度 220 · `L5` 操作列用 width · `L6` view 根节点挂 view-w。

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
- **默认就应该让内容在一屏内放下**——list 页内部滚动由 `pro-table` 自己处理；detail / 表单页优先靠精简字段、分区、合理留白把内容塞进剩余高度，而不是让它溢出。

#### `sticky-container` —— 慎用，不是默认方案

- **当前标准项目里没有任何页面用到 `sticky-container`**。它只是一个备用逃生口，不是"内容一多就上"的常规手段。
- 只有在**详情页内容确实超长、且无法通过精简 / 分区 / 设计塞进一屏**时，才用 `sticky-container` 包裹内容区。能不用就不用。
- 引入前先问自己：这页是不是可以重新设计成自适应一屏？大多数情况答案是"可以"。
- 反模式：① 默认给每个详情页都套 `sticky-container`；② 给 view 根节点或 layout-main 直接挂 `overflow-auto` / `overflow-y-scroll` 凑合滚动。要滚动就用 `sticky-container`，但先确认真的需要滚动。

### 规则 L3 · 任何页面都不能"半截"——view 自带白底 + 圆角

"半截" = view 没铺满白色卡片，底部灰色背景（`#eef2f8`）透出来。**每个 view 根节点必须自带白底 + 圆角，并 `h-full` 撑满**，三种标准形态：

| 页面类型 | view 根节点写法 | 白底来源 |
|---|---|---|
| **增删改查列表页** | `<div class="view-w h-full w-full">` 内直接放 `<pro-table>` | **pro-table 自带卡片**，无需手写白底——保持标准列表态即可（见下方"列表页标准态"） |
| **详情页** | `<div class="view-w h-full flex flex-col bg-white rounded-2 p-6 gap-6">` | 根节点自身 `bg-white rounded-2` |
| **表单 / 资料页** | `<div class="view-w h-full w-full">` 内放 `<el-card class="page-fill-card" shadow="never">` | `page-fill-card` 撑满的卡片 |

**列表页标准态**：只要根节点 `view-w h-full` + 直接用 `pro-table`，就是合规的，不会"半截"。不要在 pro-table 外再套自定义灰底容器。

### 规则 L4 · 左侧菜单宽度 220

```
<aside class="layout-sider flex-shrink-0 h-full overflow-hidden"
       :class="sidebarCollapsed ? 'w-16' : 'w-[220px]'">
```

- 展开：`w-[220px]`
- 收起：`w-16`（64px，只剩图标）

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
  <div class="view-w h-full w-full">   <!-- ✅ 根节点 view-w + h-full -->
    <pro-table ... />
  </div>

  <!-- 弹层组件挂在 view-w 同级，不嵌进根 div（见 vue-scaffold-module 规则） -->
  <SomeCreateDialog v-model="visible" />
</template>
```

- `view-w` 是 view 页面的统一标识类，Layout 通过它识别"这是走 Layout 容器的业务页"。
- 其余原子类（`h-full` / `w-full` / `flex flex-col` / `bg-white rounded-2 p-6` 等）按页面类型（规则 3）追加。
- 反模式：用自定义 class（如 `class="project-page"`）替代 `view-w`。

## 自检清单

起新页面 / review 时逐条过：

- [ ] view 根节点挂了 `view-w` 且带 `h-full`
- [ ] 列表页：`view-w h-full` 内直接 `pro-table`，没套多余灰底容器
- [ ] 详情页：根节点带 `bg-white rounded-2 p-6`，铺满无"半截"
- [ ] 页面内无 `overflow-auto`/`overflow-y-scroll` 凑合滚动；要滚动用 `sticky-container`
- [ ] 没有改动外壳 `layout-main` 的 `overflow-hidden` / `p-4 md:px-5`
- [ ] 菜单展开 `w-[220px]`、收起 `w-16`
- [ ] 表格操作列用 `width` 不用 `minWidth`，`fixed: 'right'`

## 与其它 skill 的关系

- 外壳（`Layout.vue` / `Main.vue` / 各 `layout/*`）的完整模板在 `vue-scaffold-app` 的 `references/layout-and-system-views.md`——但**布局类名与高度契约以本 skill 为准**。
- view 根节点 `view-w` 规范、弹层同级规范、pro-table/search-form 用法，详见 `vue-scaffold-module`。
- `sticky-container` 组件本体来自 `vue-scaffold-base-components`。
