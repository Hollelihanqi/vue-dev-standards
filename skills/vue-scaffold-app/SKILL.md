---
name: vue-scaffold-app
description: 从 0 到 1 搭建 Vue 3 + TS + Vite 中后台门户工程。当用户说"按这个 skill 起新 vue 项目"、"参考 portal 规范初始化新工程"、"按门户工程套路从 0 搭一个 vue 应用"、"用这套架构搭新项目"、"按统一规范初始化前端项目"等时使用。覆盖技术栈、目录结构、配置文件、axios 拦截、加密工具、composable 拆分、UnoCSS 用法、组件分层、路由守卫等完整工程规范。
user-invocable: true
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# vue-scaffold-app — Vue 中后台门户工程脚手架

按本 skill 给出的规范，从 0 到 1 初始化一个 Vue 3 中后台门户工程。目标是让任意业务方拿到第一天就能直接写功能页，不再重复造轮子，也不再每个人风格各异。

## 何时使用本 skill

- 用户明确要求初始化 Vue 项目（"新建 vue 工程"、"起个新前端项目"、"参考 xxx 规范搭新项目"）
- 用户已有空目录或刚 `vite create` 出来的项目，要求按本规范整改
- 用户问"项目骨架怎么搭"、"目录怎么分"、"axios / 路由 / store 怎么放"

不要在已有完整工程内对**已成型**的代码做大规模重构，除非用户明确要求"按这个 skill 重构现有项目"。

## 子 skill 划分

主 skill 负责**总体编排与一次性基础设施**（配置 / 工具 / 路由 / 状态 / Layout / 系统页）。
**高频独立操作**拆为可单独触发的子 skill，主 skill 在对应步骤通过 Skill 工具调用它们：

| 子 skill | 何时调用 | 单独触发场景 |
|---|---|---|
| `vue-scaffold-module` | 主流程 Step 7（添加第一个业务模块） | 老项目里"加一个 xx 列表 / 详情页" |
| `vue-scaffold-component` | 业务下拉 / 状态字典需要复用时 | 老项目里"封装一个 xx 选择器" |

更细的子 skill（如 `vue-scaffold-config` / `vue-scaffold-utils`）按需扩展；这两个一次性写完就不动，留在主 skill 内联即可。

## 详细模板索引

主流程涉及的配置 / 工具 / 路由 / 状态 / Layout 等一次性基础设施代码模板放在同级 `references/` 目录：

- `references/config-files.md` —— `package.json` / `vite.config.ts` / `uno.config.ts` / `tsconfig*.json` / `.env` / `index.html`
- `references/core-utils.md` —— `utils/axios.ts`（业务码统一处理）/ `utils/crypto.ts`（RSA 分段加密）/ `utils/portal.ts`（分页 / 字典 / 下载工具）
- `references/router-store.md` —— `router/index.ts`（守卫 + 面包屑 + document.title）/ `store/index.ts` + `store/app.ts` + `store/auth.ts`
- `references/layout-and-system-views.md` —— `Layout.vue` / `TheHeader.vue` / `TheMenu.vue` / `TheBreadcrumb.vue` / `useLayout.ts` 与 `system-views/login` `register` `reset-password` 全套

业务模块与业务组件不放 references —— 用 **子 skill** 接管，因为它们是反复执行的高频动作，且每次执行都需要独立的"读现有惯例 → 生成新文件"决策流。

每个 reference 文件都是可直接复制粘贴的代码，但不要照搬其中的项目占位符（`<project-name>` / `<api-target>` / 服务路径前缀等）—— 替换为目标项目名 / 后端基址 / 实际接口前缀。

## 技术栈（固定选型，不允许临时换）

| 类别 | 选型 | 备注 |
|---|---|---|
| 框架 | Vue 3.5+（`<script setup>` 写法） | 强制 setup 语法，禁用 Options API |
| 构建 | Vite 8+ | |
| 类型 | TypeScript 6+ + vue-tsc | `noUnusedLocals` 必开 |
| 路由 | vue-router 5.x（Vue 3 对应的 5.x 版本） | |
| 状态 | pinia 3 + pinia-plugin-persistedstate | |
| UI | Element Plus 2.13+ + `@element-plus/icons-vue` | |
| 主题 | `@rdeam/vite-plugin-element-plus-theme-builder` | 主色由 vite 插件编译产出 |
| 原子 CSS | UnoCSS（presetWind3 + presetAttributify + presetIcons） | 默认风格首选 |
| 组件自动注册 | `@rdeam/vue-components-resolver` 的 `AppComponentsResolver` | 只扫 `src/components` 顶层 |
| 自动导入 API | `unplugin-auto-import`（vue / vue-router / pinia） | 业务文件不用手写 `import { ref }` 等 |
| HTTP | axios | 统一拦截器，业务层不判 code |
| 工具集 | @vueuse/core | |
| 加密 | jsencrypt（RSA + PKCS#1 v1.5） | 收口到 `utils/crypto.ts` |
| 样式 | SCSS（少量必要的 :deep 覆盖） | UnoCSS 是主旋律 |

## 顶层目录结构（必须严格按此组织）

```
<project-root>/
├── .env                      # 全部可配置项（API 基址、超时、RSA 公钥、应用标题）
├── index.html                # <title>%VITE_APP_TITLE%</title>
├── package.json
├── pnpm-lock.yaml            # 推荐 pnpm，可选 npm
├── tsconfig.json
├── tsconfig.app.json         # noUnusedLocals 必开
├── tsconfig.node.json
├── uno.config.ts             # 主题色 + shortcuts + 字号兼容规则
├── vite.config.ts            # 代理 + 插件 + alias
└── src/
    ├── api/
    │   ├── index.ts          # 仅放跨模块通用接口（logoutApi 等）
    │   └── portal.ts         # 跨业务的字典查询，例如 getStatusOptions
    ├── assets/
    │   ├── generated/        # 由 ep 主题插件生成的 css，禁止手改
    │   └── styles/           # 全局 reset / 基础样式
    ├── components/           # 通用基础组件（pro-table / search-form / remote-search / sticky-container / text-ellipsis / table / pro-table 等）
    │                         # 靠 AppComponentsResolver 自动注册，template 直接用 <pro-table />，不需 import
    ├── custom-components/    # 业务封装组件（如 PortalChainFrameworkSelect、状态 select 等）
    │                         # 不自动注册，使用时显式 import from '@/custom-components/xxx'
    ├── directives/           # 自定义指令
    ├── layout/
    │   ├── Layout.vue        # 主框架（Header + Menu + Main + Breadcrumb）
    │   ├── Main.vue
    │   ├── TheHeader.vue
    │   ├── TheMenu.vue
    │   ├── TheMenuItem.vue
    │   ├── TheBreadcrumb.vue
    │   └── useLayout.ts      # Layout 所有交互逻辑
    ├── router/
    │   └── index.ts          # 路由 + 守卫 + breadcrumbs 生成 + document.title
    ├── store/
    │   ├── index.ts          # 创建 pinia 实例 + 注册 persistedstate
    │   ├── app.ts            # 应用级（语言 / 侧边栏 / 标题 / 面包屑）
    │   └── auth.ts           # 登录态（token / userInfo / permissions）
    ├── system-views/         # 系统级页面（不走 Layout，自带背景）
    │   ├── login/
    │   ├── register/
    │   └── reset-password/
    ├── types/                # 自动生成的 .d.ts（auto-imports / components）
    ├── utils/
    │   ├── axios.ts          # 拦截器统一收口业务码、错误 toast、loading
    │   ├── crypto.ts         # RSA 分段加密 + 共享公钥
    │   ├── file.ts
    │   ├── index.ts
    │   └── portal.ts         # 分页 / 字典 / 空值占位 / 下载
    ├── views/                # 业务页面（全部走 Layout）
    │   └── <module-name>/
    │       ├── api.ts
    │       ├── constants.tsx   # 表格列、search-form 控件配置
    │       ├── use<Module>.ts  # 业务 composable
    │       ├── <Module>List.vue
    │       ├── <Module>Detail.vue
    │       └── <Module>CreateDialog.vue
    ├── App.vue
    ├── main.ts
    └── vite-env.d.ts
```

**两个 system-views/views 分层是核心**：登录注册这类全屏页面**不进 Layout**，与业务页面用不同的视觉容器；这块千万别合并。

## 十条不可违背的约定

1. **business code 收口**：axios 拦截器内 `code === 0` 直接返回 `data.data`，其它 code toast + `throw ApiError`。业务层 `await api()` 直接拿到数据，**禁止 `if (response.code === 0)`**。需要捕获时 `try { await api() } catch (e) {/* 已 toast */ }`。
2. **composable 拆分**：每个业务模块必须有 `use<Module>.ts`，view 的 `<script setup>` **不超过 50 行**，只做"import composable + 解构 + icon"。
3. **ref over reactive**：所有响应式数据用 `ref()`。`reactive` 只允许在极少数确实需要 deep 引用的场景使用（默认拒绝）。
4. **加密集中**：RSA 公钥 / 分段算法 / 调用入口全部在 `utils/crypto.ts`；公钥从 `.env` 注入；其它文件不允许 `new JSEncrypt()`。
5. **.env 收口**：应用标题、API 基址、超时、公钥、外部资源 URL 等所有可配置项都进 `.env`，禁止硬编码。
6. **components vs custom-components**：通用原子组件（表格 / 搜索表单 / 远程下拉等）放 `src/components/`，由 `AppComponentsResolver` 自动注册，template 直接使用；业务封装（特定接口 / 特定字典 / 内置过滤）放 `src/custom-components/`，使用时显式 import。
7. **UnoCSS 优先**：能用原子类完成的样式都用原子类（含 `!important` 前缀 `!h-[42px]`、伪类 `hover:!bg-white/10`、属性选择器 `[&_span]:!text-white` 等）。`<style scoped>` 只写**必须**用到的 element-plus 深度覆盖（`:deep(.el-input__wrapper)` 等）；禁止用 SCSS 实现可以用原子类解决的事。
8. **路由 meta.title 直接中文**：除非项目强制启用 i18n，否则 meta.title 用中文字符串，不要塞 `MSGG0002` 这种 key。Layout 与 document.title 同步直接读 meta.title。
9. **API 文件返回 T 不返回 AxiosResponse**：`request.post<UserInfo>(url)` 返回 `Promise<UserInfo>`。业务层 `const data = await getXxx()` 拿到的就是数据本身。这是拦截器收口的必然推论。
10. **错误已 toast**：业务层 `catch` 块通常**空块**（仅放注释 `// 错误已由 axios 拦截器统一 toast`），不要再 `ElMessage.error(...)` 一次。`finally` 处理 `submitting.value = false` 等状态清理。

## 反模式（明确禁止）

- ❌ `const formModel = reactive({...})` —— 改用 `ref`
- ❌ `if (response.data?.code === 0)` —— 拦截器已经处理
- ❌ `const PUBLIC_KEY = 'MIGfMA0...'` 散落各处 —— 用 `utils/crypto.ts` + `.env`
- ❌ view 文件里写 200 行业务逻辑 —— 抽出 `use<Module>.ts`
- ❌ `<style scoped>` 写一大堆自定义 class —— 改 UnoCSS 原子类 + element-plus 属性
- ❌ 业务下拉手写 `el-select` + `loadXxxOptions` + ref 数组 —— 封装到 `custom-components/`
- ❌ `meta.title: 'MSGG0002'` —— 直接 `meta.title: '登录'`
- ❌ `import t from i18n` 后通篇 `t('PUB_xxx')` —— 中文项目直接写中文
- ❌ 把 fetch / 原生 XHR 与 axios 实例混用 —— 全部走 `request` / `requestWithLoading`
- ❌ 在 `views/` 直接放业务接口的硬编码 URL —— 接口集中在模块同目录 `api.ts`

## 执行流程（从空目录到可运行的 hello world 业务页）

> 每一步用对应的 reference 文件作为复制源，**不要凭记忆抄代码**。

### Step 1 — 初始化目录

```bash
mkdir -p src/{api,assets/styles,assets/generated,components,custom-components,directives,layout,router,store,system-views/{login,register,reset-password},types,utils,views}
```

### Step 2 — 写配置文件

按 `references/config-files.md` 写：
1. `package.json`（依赖清单完整复制，包名替换）
2. `tsconfig.json` / `tsconfig.app.json` / `tsconfig.node.json`
3. `vite.config.ts`（含 alias / 插件 / 代理）
4. `uno.config.ts`（主题色 + shortcuts）
5. `.env`（VITE_APP_TITLE / VITE_API_BASE_URL / VITE_API_TIMEOUT / VITE_RSA_PUBLIC_KEY）
6. `.gitattributes`（跨平台换行符规范，**新项目首次提交时必加**，并执行一次 `git add --renormalize .`）
7. `index.html`（`<title>%VITE_APP_TITLE%</title>`）

### Step 3 — 写核心工具

按 `references/core-utils.md` 写：
- `src/utils/axios.ts` —— 含 `ApiError` 类、`Request` 接口、`request` / `requestWithLoading`
- `src/utils/crypto.ts` —— `rsaEncryptChunks` + `encryptPayload`
- `src/utils/portal.ts` —— `createPagePayload` / `pickPageResult` / `createOptionMap` / `formatEmpty` / `downloadByUrl`

### Step 4 — 写 router / store

按 `references/router-store.md` 写：
- `src/store/index.ts` + `app.ts` + `auth.ts`
- `src/router/index.ts`（白名单 / 守卫 / 面包屑 / document.title）
- `src/api/index.ts` + `src/api/portal.ts`

### Step 5 — 写 Layout 与 system-views

按 `references/layout-and-system-views.md` 写：
- 整个 Layout 主框架
- 登录 / 注册 / 重置密码三套 system-views（含 useLogin / useRegister 等 composable）

### Step 6 — 写 components（通用基础组件）

**基础组件库不在本 skill 内嵌代码** —— 单个组件就几百行，全部贴到 reference 会显著拖慢加载与生成。这一步走"复用 + 抽包"的路线：

1. **当前（最快）**：从已有同栈项目（如 portal）的 `src/components/` 整个目录复制到新项目，保持以下子目录结构：
   ```
   src/components/
   ├── pro-table/           # 增强表格（分页 + 查询区集成 + 列配置 + 操作列）
   ├── search-form/         # 查询表单（field+label+el 配置驱动，支持 render）
   ├── remote-search/       # 远程下拉（url/labelKey/valueKey/dataCallback）
   ├── sticky-container/    # 吸顶吸底容器（#header / #footer slot + 中间滚动）
   ├── text-ellipsis/       # 文本省略 + tooltip
   └── table/               # 基础 table（el-table 二次封装）
   ```
   导入路径相对独立（用 `@/components/...`），复制后无需改源码即可使用。

2. **中期（推荐）**：基础组件抽成内部 npm 包（如 `@<your-org>/vue-components`），所有项目通过 `pnpm add` 引入，统一版本管理。

3. **远期**：基础组件库自己也变成 skill 子项（`vue-scaffold-base-components`），按需挑选组件 + 自动生成 import。

⚠️ **这一步不能跳过** —— 后续 `pro-table` / `search-form` / `remote-search` 是业务模块（`vue-scaffold-module`）和业务组件（`vue-scaffold-component`）的依赖底座。如果新项目脱离了 portal，建议先把这 6 个目录抽成内部包再启动新工程。

### Step 7 — 添加第一个业务模块

按 `references/module-template.md` 在 `src/views/<module>/` 新建四件套：

```
src/views/example/
├── api.ts                  # request.post<T>(...) 调用，返回 Promise<T>
├── constants.tsx           # createXxxSearchForm() / createXxxColumns()
├── useExample.ts           # 业务逻辑（formModel ref / list 加载 / 提交 / 弹窗）
├── ExampleList.vue         # <pro-table> + <search-form> + 调用 useExample()
├── ExampleCreateDialog.vue # 弹窗（如有）
└── ExampleDetail.vue       # 详情页（如有）
```

并在 `src/router/index.ts` 注册路由（路径 / name / meta.title 中文 / Layout 作为 component）。

### Step 8 — 验证

```bash
pnpm install
pnpm dev
```

打开 `http://localhost:5173`，应能：
- 看到登录页（背景图 + 玻璃卡片）
- 浏览器 tab 显示 `登录 - <VITE_APP_TITLE>`
- 路由跳转、面包屑、菜单正常
- 第一个业务页能拉到 mock / 真实接口数据（按代理配置）

## 新增业务模块的最小步骤（开发期日常）

老项目里加一个 module，比如"角色管理"：

1. `src/views/role/api.ts` —— 写 `getRoleList` / `createRole` / `updateRole` / `deleteRole`，全部 `request.post<T>(...)`
2. `src/views/role/constants.tsx` —— 写 `createRoleSearchForm()` 和 `createRoleColumns({ onEdit, onDelete })`
3. `src/views/role/useRole.ts` —— `useTemplateRef('tableRef')`、`searchFormList = computed(...)`、`columns = computed(...)`、`requestTableData` / `handleEdit` / `handleDelete` 等方法
4. `src/views/role/RoleList.vue` —— 30 行内：`<pro-table />` + `<RoleEditDialog />` + 解构 `useRole()`
5. 如有创建 / 编辑，新建 `RoleEditDialog.vue`（独立 props `modelValue`，emit `update:modelValue` + `success`）
6. `src/router/index.ts` 加路由：
   ```ts
   {
     path: '/role',
     component: Layout,
     meta: { title: '角色管理', icon: 'UserFilled', breadcrumbClickable: false },
     children: [
       { path: 'list', name: 'RoleList', component: () => import('@/views/role/RoleList.vue'), meta: { title: '角色列表', keepAlive: true } },
     ],
   }
   ```

整个过程不应该超过 1 小时。如果超过了，多半是没有复用 `pro-table` / `useXxx` 模式，或者在 view 里写了一堆业务逻辑——回头检查。

## 业务下拉 / 状态字典如何下沉为组件

参考 `src/custom-components/PortalChainFrameworkSelect.tsx` 范式：
- 包一层 `RemoteSearch`，固定 `url` / `labelKey` / `valueKey`
- 默认 `dataCallback` 做项目级过滤（例如只保留某条链）
- 透传 `context.attrs`，允许调用方覆盖默认行为
- 调用方 `<PortalXxxSelect v-model="..." />` 一行搞定，不再写 `loadXxx` / `xxxOptions` ref

详细见 `references/component-conventions.md`。

## CSS 风格

- **首选**：UnoCSS 原子类（`flex items-center gap-2 h-[42px] !rounded-2 hover:!bg-white/10`）
- **次选**：element-plus 内置属性（`type="primary" plain size="large"`）
- **必要时**：`<style scoped>` 写 `:deep(.el-xxx)` 覆盖
- **绝不**：在 `<style scoped>` 写 200 行自定义 class

颜色 / 间距等设计 token 放 `uno.config.ts` 的 `theme.colors` 与 `shortcuts`，业务文件用 `text-glass-50` / `glass-border` 这种语义类，避免色值散落。

## 引用文件

详细模板与代码片段：
- `references/config-files.md`
- `references/core-utils.md`
- `references/router-store.md`
- `references/layout-and-system-views.md`
- `references/module-template.md`
- `references/component-conventions.md`

按需打开对应 reference 文件，复制其中代码到目标项目，按项目名 / 接口名替换。**不要凭记忆**重写这些核心文件，差异会让后续协作非常痛苦。
