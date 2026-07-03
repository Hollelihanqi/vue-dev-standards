<!-- vue-dev-standards:project-claude v3 -->
<!-- 本文件由 vue-dev-standards skill 写入/同步。完整规范见 skills: vue-scaffold-app / vue-scaffold-layout / vue-scaffold-module。 -->
<!-- 本文件是规范的常驻摘要,不是来源:与各 skill 正文冲突时,以 skill 正文为准——冲突说明本文件已漂移,应改 skill 模板后重新同步。 -->

# 项目开发规范(精简常驻版)

这是日常开发必须遵守的核心约定。**只列高频要点**,完整规则和代码模板在对应 skill 里。

## 技术栈(锁定,不临时换)

Vue 3.5+(`<script setup>`,禁用 Options API)· TypeScript · Vite · Element Plus(按需自动 import,**禁止** `import 'element-plus/dist/index.css'`)· `@rdeam/hd-ui`(基础组件库)· UnoCSS(原子类为主)· Pinia + persistedstate · vue-router · axios · jsencrypt。

## 数据请求(每次写接口都遵守)

- axios 拦截器已收口业务码:api 函数返回 `Promise<T>`,业务层 `await api()` **直接拿到数据**。
- **禁止** `if (res.code === 0)` 这种判断 —— 拦截器处理过了。
- catch 块**默认空**(`// 错误已由 axios 拦截器 toast`),不要再 `ElMessage.error` 一次;`finally` 里清 `submitting` 等状态。
- 读接口用 `request`;涉及密码/敏感字段用 `encryptPayload()`。
- **按钮触发接口 = 必须防重复点击**:点击会调接口的按钮(保存/提交/确定等),点击后立刻 `loading` 或 `disabled`(绑 `submitting`),接口回来再恢复,杜绝连点发多次请求。**例外**:列表操作列里的按钮(编辑/删除/查看)一般不做。
- **loading 挂哪 → 决定用 `request` 还是 `requestWithLoading`**,判断标准是"这次操作有没有一个按钮在替它显示进度":
  - **有按钮**(表单页/弹框的保存、提交):loading 挂在那个按钮上(`:loading="submitting"`),接口走**普通 `request`**。**禁止再用 `requestWithLoading`** —— 按钮已转圈,全屏遮罩是第二层重复反馈(点保存却弹出盖住整页的大遮罩)。
  - **没有按钮承载**(动作没专属按钮,或必须阻断整页交互直到完成):才用 **`requestWithLoading`** 弹全屏遮罩。
  - 一句话:**按钮 loading 与全屏遮罩二选一,有按钮就别上全屏遮罩。**
- 接口放 `views/<module>/api.ts`,函数名统一 `getList / getDetail / createItem / updateItem / deleteItem`,**不加实体名前缀**。

## 表格(关键)

- **列表页**(有查询表单 + 分页)→ `<hd-pro-table>`;**无查询表单**(详情子表、弹窗内表)→ `<hd-table>`;**禁止业务页裸用 `<el-table>`**。基础组件统一来自 `@rdeam/hd-ui`(经 `HdCustomResolver` 自动注册),模板里一律 kebab-case,**禁止** PascalCase `<HdXxx>`。
- 列表页根节点只写 `<div class="view-w h-full w-full">`,里面直接放 `<hd-pro-table>` —— **hd-pro-table 自带白底卡片**,不要再套灰底容器、不要手写 `bg-white`。
- **操作列用 `width`(固定锁死)不用 `minWidth`**,`fixed: 'right'`;普通数据列可用 `minWidth`。
- 列与查询区配置写在 `constants.tsx`:简单字段映射用 `formatText`,复杂渲染用 `render`;查询区"新增"按钮放 `#tableHeader` 插槽。
- 业务下拉(状态/字典/远程)**不要内嵌 `el:'select'+options`**,用 `render` + `custom-components/` 里封装的 select。

## 页面布局(避免"半截 / 滚动条不对")

- **view 根节点必须挂 `view-w` + `h-full`** —— 这是 Layout 识别业务页的标识,缺了页面会"半截"。
- **不准**给页面或 `layout-main` 加 `overflow-auto / overflow-y-scroll` 凑合滚动;内容确实超长用 `<hd-sticky-container>`。
- **`<hd-sticky-container>` 用法**:它**只负责"内容超出滚动"**,不负责布局。**高度由包裹它的父容器决定**(默认 `h-full` 100%),不要在它身上算高度 —— 撑满靠父容器(如 `view-w h-full` 根节点)。背景色 / 内边距可直接挂在它自身。
  - 内部内容**需要 flex / grid 布局** → 在容器里加**一层 `<div>`**,在这层 div 上对子模块做 flex/grid;内容是一整块、不需要 flex/grid → **直接放进去,不加多余 div**。
  - 用到 `#header` / `#footer` 插槽时,**插槽与这层内容 div 平级**(同为容器的直接子节点),**不要**把插槽塞进内容 div 里。
  - 撑满 + 平分高度靠"父给 `h-full` → 内容 div `flex flex-col` → 子模块 `flex-1`"。
- 详情页/表单页根节点带 `bg-white rounded-2 p-6`;列表页不用(hd-pro-table 自带圆角白底)。
- 弹层(Dialog/Drawer)挂在 **`view-w` 同级**(多根节点),不要嵌进根 `<div>`。
- 左侧菜单由路由派生(`buildMenuTree`),不硬编码;收起态 `w-16`。
- **业务页禁止使用布局类语义标签**(`section` / `main` / `header` / `footer` / `nav` / `aside` / `article`),一律用 `<div>`;这些标签**只允许出现在 layout 层**。文本级标签(`h1~h6` / `p` / `b` / `span` 等)不受限。

## 业务模块(加页面时的结构)

- 模块四件套:`api.ts` / `constants.tsx` / `use<Menu>.ts` / `<Entity>List.vue`(按需加 `<Entity>Edit.vue` / `<Entity>Detail.vue`)。
- **详情页含多个内容模块 → 建独立 `detail/` 目录,与列表页同一层级,内部扁平化**:装配页 `<Entity>Detail.vue` + `use<Entity>Detail.ts` + 各内容模块组件平铺。装配页只做组装,内容模块各自拆成独立组件;单一内容的简单详情页不必拆。
- **一个菜单一个目录,平铺在 `views/` 下;绝不为"分组"单独建父目录**。目录名即命名空间,内部文件不带实体前缀(就叫 `api.ts` / `constants.tsx`)。
  - 二级菜单用**前缀**表达归属,不用**嵌套**:目录名 `<一级>-<二级>`。
    - ✅ `views/<一级>-<二级A>/`、`views/<一级>-<二级B>/`
    - ❌ `views/<一级>/<二级A>/`(多出一层只分组、自己没有页面文件的父目录)
  - 一级菜单本身即叶子(只挂一个菜单)→ 直接 `views/<菜单>/`,不加前缀。
  - 判错信号,命中即拆目录:① 文件名带实体前缀(`<entity>-api.ts`);② 存在只含子目录、自己没有页面文件的纯分组目录。
- **一个菜单一个主 composable** `use<Menu>.ts`,按业务/菜单命名。**禁止** `useXxxDialog.ts` / `useXxxDrawer.ts` / `useXxxModal.ts` 这类组件形态命名 —— 看到就是反模式。
- **Dialog 自包含**:自己持有 `formModel / submitting / rules / validators / formRef`;通过 `props.onSubmit: (payload) => Promise<void>` 注入提交逻辑,`await` + `try/finally` 保证 submitting 一定重置,成功后 `visible.value = false`。Dialog **不知道**调哪个接口。
- view 的 `<script setup>` **≤ 50 行**,逻辑全进 composable;view 只做装配。
- **装配页(view / `<Entity>Detail.vue`)只组装,不替子组件背布局/样式**:**禁止在子组件标签上挂 `class` 给它打布局补丁**(如 `<Foo class="min-h-[400px] flex-1" />`)。组件自身的**高度契约 / 布局**(`flex-1` / `min-h-*` / 圆角白底等)写进**组件自己的根节点**,做到自包含、调用方零负担;装配页只保留真正属于"组装"的容器(如并排多块用的 `flex` 父容器)。
- Dialog / Drawer 用 `defineAsyncComponent(() => import('./Xxx.vue'))` 动态引入,别静态 import。
- **弹框 / 抽屉等覆盖层组件 `.vue` 文件名不带 `Dialog` / `Drawer` 形态后缀**,用 业务 + 动作 命名:`<Entity>Edit.vue` / `<Entity>Detail.vue`,**不是** `<Entity>EditDialog.vue` / `<Entity>DetailDrawer.vue` —— 组件形态由文件内部的 `el-dialog` / `el-drawer` 体现,不进文件名。(注:composable 同样不带形态后缀,见上"禁止 `useXxxDialog.ts`"。)

## 状态 & 样式 & 杂项

- **重复结构必须配置数组 + `v-for`,模板只留一份,禁止抄 N 份**;动态 class 放完整字面量进配置(`'bg-amber-50/30 ...'`),禁止拼 `bg-${x}`(UnoCSS 扫不到)。
- 响应式一律 `ref()`,默认拒绝 `reactive`。
- 持久化走 `defineStore(..., { persist: { pick: [...] } })`,**禁止手写 `localStorage.setItem/getItem/clear`**;退登用 in-memory 重置。
- **样式一律走 UnoCSS 原子类**(含 `!`/`hover:`/`[&_x]:`/`[计算值]` 等):能用原子类就别开 `<style>` 手写 class;间距 / 颜色 / flex / 圆角 / 尺寸等全用原子类。在 `<style>` 里手写自定义 class 是反模式。
- **`:deep()` 是最后手段,不是样式入口**:确实**必须穿透**才能改的样式(如 element-plus 内部节点、第三方组件内部结构),才用 `<style scoped>` + `:deep()` 精确改**那一处**。**禁止用 `:deep()` 大面积穿透重塑组件原生外观**——优先走组件配置 / 插槽 / 原子类 / 全局主题;重复皮肤下沉成全局 opt-in class 或封装进组件,绝不每页各抄一份 `:deep`。
- **样式归属:`layout/` 少碰,业务 view 别堆样式**。`layout/` 样式牵动全局,**非必要不改**;page 级 `<style>` 只留真正页面专属、又必须穿透的零碎。
- **字体对齐 Ant Design,正文 14px 下限**:字号只用 `text-*` 字阶(`sm/base`=14、`lg`=16、`xl`=20、`2xl`=24、`3xl`=30、`4xl`=38),**禁止硬编码 `font-size`**;12px 并入 14px;文本色分级用 `--app-text-color`。
- 加密集中在 `utils/crypto.ts`;可配置项(API 基址、标题、公钥)进 `.env`,禁止硬编码。
- 路由 `meta.title` 直接写中文(除非启用 i18n)。
- 不建纯转发桶 `index.ts`(`export * from`);业务文件直接 from 子模块 import。
- **渲染函数 / 内联组件一律用 JSX/tsx 函数式(`lang="tsx"` + `<Tag />`),禁止用 `h()` 渲染函数**。
- **`<script setup>` 不写 `defineOptions({ name })`**:组件名由文件名自动推断,keep-alive 用 `<keep-alive :max>`(无 `:include`)不依赖 name,显式声明纯属多余样板。

## 基础组件库(@rdeam/hd-ui)

- **基础组件统一来自 `@rdeam/hd-ui`**(经 `HdCustomResolver` 自动按需引入,配在 `vite.config.ts`):模板里直接写标签、无需手动 import。标签一律 **kebab-case**(`<hd-pro-table>`/`<hd-table>`/`<hd-sticky-container>` 等),**禁止** PascalCase。
- **类型从根入口引**:`import type { ColumnsItemProps, SearchFormControlProps } from '@rdeam/hd-ui'`;hd-ui 不导出 `ProTableColumn`,列配置用 `ColumnsItemProps[]`。
- **JSX / tsx 里用 hd-ui 组件必须显式 import + PascalCase**(自动注册只对 `<template>` 生效,JSX 走另一条编译链):`import { HdRemoteSearch, HdTable } from '@rdeam/hd-ui'`。
- **`HdRemoteSearch` 不内置 axios**:url 模式必须传 `:requester="request"`(`@/utils/request`);`requestApi` 模式不需要。
- **BaseX 组件**是工程本地展示组件,仍放 `src/components/`,由 `AppComponentsResolver` 注册。除 BaseX 外,**禁止**在 `src/components/` 放 hd-ui 已有的组件源码。
