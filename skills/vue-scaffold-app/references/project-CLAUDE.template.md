<!-- vue-dev-standards:project-claude v2 -->
<!-- 本文件由 vue-dev-standards skill 写入/同步。完整规范见 skills: vue-scaffold-app / vue-scaffold-layout / vue-scaffold-module。 -->
<!-- 本文件是规范的常驻摘要,不是来源:与各 skill 正文冲突时,以 skill 正文为准——冲突说明本文件已漂移,应改 skill 模板后重新同步。 -->

# 项目开发规范(精简常驻版)

这是日常开发必须遵守的核心约定。**只列高频要点**,完整规则和代码模板在对应 skill 里。

## 技术栈(锁定,不临时换)

Vue 3.5+(`<script setup>`,禁用 Options API)· TypeScript · Vite · Element Plus(按需自动 import,**禁止** `import 'element-plus/dist/index.css'`)· UnoCSS(原子类为主)· Pinia + persistedstate · vue-router · axios · jsencrypt。

## 数据请求(每次写接口都遵守)

- axios 拦截器已收口业务码:api 函数返回 `Promise<T>`,业务层 `await api()` **直接拿到数据**。
- **禁止** `if (res.code === 0)` 这种判断 —— 拦截器处理过了。
- catch 块**默认空**(`// 错误已由 axios 拦截器 toast`),不要再 `ElMessage.error` 一次;`finally` 里清 `submitting` 等状态。
- 写接口(增删改)用 `requestWithLoading`,读接口用 `request`;涉及密码/敏感字段用 `encryptPayload()`。
- 接口放 `views/<module>/api.ts`,函数名统一 `getList / getDetail / createItem / updateItem / deleteItem`,**不加实体名前缀**。

## 表格(关键)

- **列表页**(有查询表单 + 分页)→ `<pro-table>`;**无查询表单**(详情子表、弹窗内表)→ `<Table>`(HTable);**禁止业务页裸用 `<el-table>`**。
- 列表页根节点只写 `<div class="view-w h-full w-full">`,里面直接放 `<pro-table>` —— **pro-table 自带白底卡片**,不要再套灰底容器、不要手写 `bg-white`。
- **操作列用 `width`(固定锁死)不用 `minWidth`**,`fixed: 'right'`;普通数据列可用 `minWidth`。
- 列与查询区配置写在 `constants.tsx`:简单字段映射用 `formatText`,复杂渲染用 `render`;查询区"新增"按钮放 `#tableHeader` 插槽。
- 业务下拉(状态/字典/远程)**不要内嵌 `el:'select'+options`**,用 `render` + `custom-components/` 里封装的 select。

## 页面布局(避免"半截 / 滚动条不对")

- **view 根节点必须挂 `view-w` + `h-full`** —— 这是 Layout 识别业务页的标识,缺了页面会"半截"。
- **不准**给页面或 `layout-main` 加 `overflow-auto / overflow-y-scroll` 凑合滚动;内容确实超长用 `<sticky-container>`。
- 详情页/表单页根节点带 `bg-white rounded-2 p-6`;列表页不用(pro-table 自带圆角白底)。
- 弹层(Dialog/Drawer)挂在 **`view-w` 同级**(多根节点),不要嵌进根 `<div>`。
- 左侧菜单由路由派生(`buildMenuTree`),不硬编码;收起态 `w-16`。

## 业务模块(加页面时的结构)

- 模块四件套:`api.ts` / `constants.tsx` / `use<Menu>.ts` / `<Entity>List.vue`(按需加 `<Entity>Edit.vue` / `<Entity>Detail.vue`)。
- **详情页含多个内容模块 → 建独立 `detail/` 目录,与列表页同一层级,内部扁平化**:装配页 `<Entity>Detail.vue` + `use<Entity>Detail.ts` + 各内容模块组件平铺。装配页只做组装,内容模块各自拆成独立组件;单一内容的简单详情页不必拆。
- **一个菜单一个主 composable** `use<Menu>.ts`,按业务/菜单命名。**禁止** `useXxxDialog.ts` / `useXxxDrawer.ts` / `useXxxModal.ts` 这类组件形态命名 —— 看到就是反模式。
- **Dialog 自包含**:自己持有 `formModel / submitting / rules / validators / formRef`;通过 `props.onSubmit: (payload) => Promise<void>` 注入提交逻辑,`await` + `try/finally` 保证 submitting 一定重置,成功后 `visible.value = false`。Dialog **不知道**调哪个接口。
- view 的 `<script setup>` **≤ 50 行**,逻辑全进 composable;view 只做装配。
- Dialog / Drawer 用 `defineAsyncComponent(() => import('./Xxx.vue'))` 动态引入,别静态 import。
- **弹框 / 抽屉等覆盖层组件 `.vue` 文件名不带 `Dialog` / `Drawer` 形态后缀**,用 业务 + 动作 命名:`<Entity>Edit.vue` / `<Entity>Detail.vue`,**不是** `<Entity>EditDialog.vue` / `<Entity>DetailDrawer.vue` —— 组件形态由文件内部的 `el-dialog` / `el-drawer` 体现,不进文件名。(注:composable 同样不带形态后缀,见上"禁止 `useXxxDialog.ts`"。)

## 状态 & 样式 & 杂项

- 响应式一律 `ref()`,默认拒绝 `reactive`。
- 持久化走 `defineStore(..., { persist: { pick: [...] } })`,**禁止手写 `localStorage.setItem/getItem/clear`**;退登用 in-memory 重置。
- 样式优先 UnoCSS 原子类(含 `!`/`hover:`/`[&_x]:` 等);`<style scoped>` **只**允许放 element-plus `:deep()` 深度覆盖,禁止大段自定义 class。
- 加密集中在 `utils/crypto.ts`;可配置项(API 基址、标题、公钥)进 `.env`,禁止硬编码。
- 路由 `meta.title` 直接写中文(除非启用 i18n)。
- 不建纯转发桶 `index.ts`(`export * from`);业务文件直接 from 子模块 import。
