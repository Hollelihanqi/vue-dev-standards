---
name: vue-scaffold-app
description: 从 0 到 1 搭建 Vue 3 + TS + Vite 中后台工程。当用户说"按统一规范初始化前端项目"、"起个新 vue 工程"、"新建 vue 中后台项目"、"从 0 到 1 搭一个 vue 中后台"、"按本套标准初始化 vue 工程"等时使用。覆盖技术栈、目录结构、配置文件、axios 拦截、加密工具、composable 拆分、UnoCSS 用法、组件分层、路由守卫等完整工程规范，本 skill 自身即为规范来源，不依赖任何外部参考项目。
user-invocable: true
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# vue-scaffold-app — Vue 3 中后台工程脚手架

按本 skill 给出的规范，从 0 到 1 初始化一个 Vue 3 中后台工程。本 skill 自身即为规范来源——所有目录结构、配置、工具、Layout、系统页规范都写在本文件与 `references/` 里，不需要也不应该参考任何外部项目，不再重复造轮子，也不再每个人风格各异。

## 何时使用本 skill

- 用户明确要求初始化 Vue 项目（"新建 vue 工程"、"起个新前端项目"、"参考 xxx 规范搭新项目"）
- 用户已有空目录或刚 `vite create` 出来的项目，要求按本规范整改
- 用户问"项目骨架怎么搭"、"目录怎么分"、"axios / 路由 / store 怎么放"

不要在已有完整工程内对**已成型**的代码做大规模重构，除非用户明确要求"按这个 skill 重构现有项目"。

## 子 skill 划分

主 skill 负责**总体编排与一次性基础设施**（配置 / 工具 / 路由 / 状态 / Layout / 系统页）。
**高频独立操作**拆为可单独触发的子 skill，主 skill 在对应步骤通过 Skill 工具调用它们：

| 子 skill                       | 何时调用                                                                        | 单独触发场景                                                       |
| ------------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `vue-scaffold-layout`          | 写 `Layout.vue` / `Main.vue` 及任意 view 页面时（布局类名与高度契约的权威来源） | "页面有半截 / 不撑满 / 滚动条不对"、"菜单多宽"、"操作列宽度怎么写" |
| `vue-scaffold-hd-ui`           | 主流程 Step 7（基础组件库接入）                                                            | "装基础组件"、"配 HdCustomResolver"                              |
| `vue-scaffold-module`          | 主流程 Step 8（添加第一个业务模块）                                             | 老项目里"加一个 xx 列表 / 详情页"                                  |
| `vue-scaffold-component`       | 业务下拉 / 状态字典需要复用时                                                   | 老项目里"封装一个 xx 选择器"                                       |

更细的子 skill（如 `vue-scaffold-config` / `vue-scaffold-utils`）按需扩展；这两个一次性写完就不动，留在主 skill 内联即可。

## 详细模板索引

主流程涉及的配置 / 工具 / 路由 / 状态 / Layout 等一次性基础设施代码模板放在同级 `references/` 目录：

- `references/config-files.md` —— `package.json` / `vite.config.ts` / `uno.config.ts` / `tsconfig*.json` / `.env` / `.gitignore` / `.gitattributes` / `index.html`
- `references/core-utils.md` —— `utils/request.ts`（业务码统一处理）/ `utils/crypto.ts`（RSA 分段加密）/ `utils/format.ts`（空值占位 / 日期格式化等显示型辅助）/ `utils/regx.ts`（正则常量 + 基于正则的 element-plus 表单校验 rules 收口）
- `references/router-store.md` —— `router/index.ts`（守卫 + 面包屑 + document.title）/ `store/index.ts` + `store/app.ts` + `store/auth.ts`
- `references/layout-and-system-views.md` —— `Layout.vue`（只装配区域）/ `TheSidebar.vue`（侧栏外壳+品牌+菜单+页脚）/ `TheHeader.vue` / `TheMenu.vue`（纯菜单）/ `TheBreadcrumb.vue` / `useLayout.ts` 与 `system-views/login` `register` `reset-password` 全套

业务模块与业务组件不放 references —— 用 **子 skill** 接管，因为它们是反复执行的高频动作，且每次执行都需要独立的"读现有惯例 → 生成新文件"决策流。

每个 reference 文件都是可直接复制粘贴的代码，但不要照搬其中的项目占位符（`<project-name>` / `<api-target>` / 服务路径前缀等）—— 替换为目标项目名 / 后端基址 / 实际接口前缀。

## 技术栈（固定选型，不允许临时换）

| 类别         | 选型                                                        | 备注                                                                                                                                                                            |
| ------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 框架         | Vue 3.5+（`<script setup>` 写法）                           | 强制 setup 语法，禁用 Options API                                                                                                                                               |
| 构建         | Vite 8+                                                     |                                                                                                                                                                                 |
| 类型         | TypeScript 6+ + vue-tsc                                     | `noUnusedLocals` 必开                                                                                                                                                           |
| 路由         | vue-router 5.x（Vue 3 对应的 5.x 版本）                     |                                                                                                                                                                                 |
| 状态         | pinia 3 + pinia-plugin-persistedstate                       |                                                                                                                                                                                 |
| UI           | Element Plus 2.13+ + `@element-plus/icons-vue`              | 组件靠 `ElementPlusResolver` auto-import，CSS 由 theme builder 一次性生成 `assets/generated/element-plus-theme.css`，**禁止 `import 'element-plus/dist/index.css'` 等全量引入** |
| 基础组件库   | `@rdeam/hd-ui`                                              | 增强表格 / 容器 / 远程下拉 / 文本省略等基础组件统一来自此包，经 `HdCustomResolver`（`@rdeam/hd-ui/resolvers`）按需注册，模板写 `<hd-xxx />` |
| 主题         | `@rdeam/vite-plugin-element-plus-theme-builder`             | 主色由 vite 插件编译产出                                                                                                                                                        |
| 原子 CSS     | UnoCSS（presetWind3 + presetAttributify + presetIcons）     | 默认风格首选                                                                                                                                                                    |
| 组件自动注册 | `@rdeam/vue-components-resolver` 的 `AppComponentsResolver` | 只扫 `src/components` 顶层                                                                                                                                                    |
| 自动导入 API | `unplugin-auto-import`（vue / vue-router / pinia）          | 业务文件不用手写 `import { ref }` 等                                                                                                                                            |
| HTTP         | axios                                                       | 统一拦截器，业务层不判 code                                                                                                                                                     |
| 工具集       | @vueuse/core                                                |                                                                                                                                                                                 |
| 加密         | jsencrypt（RSA + PKCS#1 v1.5）                              | 收口到 `utils/crypto.ts`                                                                                                                                                        |
| 样式         | SCSS（少量必要的 :deep 覆盖）                               | UnoCSS 是主旋律                                                                                                                                                                 |

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
    │   └── index.ts          # 仅放跨模块通用接口（logoutApi 等）；模块内接口放各 views/<module>/api.ts
    ├── assets/
    │   ├── generated/        # 由 ep 主题插件生成的 css，禁止手改
    │   └── styles/           # 全局 reset / 基础样式
    ├── components/           # BaseX 本地展示组件，靠 AppComponentsResolver 自动注册
    ├── custom-components/    # 业务封装组件（远程下拉、状态 select、字典 select 等二次封装）
    │                         # 不自动注册，使用时显式 import from '@/custom-components/xxx'
    ├── directives/           # 自定义指令
    ├── hooks/                # 跨模块共享的 composable（如 usePermission / useDict）
    │                         # 单模块专属的 composable 仍放在 views/<module>/use<Module>.ts，不进这里
    ├── i18n.ts               # （可选）启用 vue-i18n 时的入口；纯中文项目没有这个文件
    ├── locales/              # （可选）启用 vue-i18n 时的语言包目录
    ├── layout/
    │   ├── Layout.vue        # 主框架，只装配区域：Sidebar + Header + Breadcrumb + Main（见 vue-scaffold-layout L8）
    │   ├── Main.vue
    │   ├── TheSidebar.vue    # 侧栏：aside 外壳 + 品牌区 + TheMenu + 平台页脚（含侧栏 scoped 样式）
    │   ├── TheHeader.vue
    │   ├── TheMenu.vue       # 只负责菜单本体（el-menu + TheMenuItem），不含品牌 / 页脚
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
    ├── utils/                # [S-utils-naming] 文件名白名单：request / crypto / format / regx / file（需要时新增）
    │   ├── request.ts        # 拦截器统一收口业务码、错误 toast、loading（描述职责，不叫 axios.ts）
    │   ├── crypto.ts         # RSA 分段加密 + 共享公钥
    │   ├── format.ts         # 显示型格式化（空值占位 / 日期格式化等）；分页 / 字典封装不放这里
    │   └── regx.ts           # 正则常量集合 + 基于正则的 element-plus 表单 rules
    │   # [S-utils-barrel] 不预置 utils/index.ts 桶导出，业务文件统一直接 import from '@/utils/request' / '@/utils/format' 等
    │   # 后续如出现文件相关工具（下载、转换、大小格式化），新建 utils/file.ts 收口，不要拆成多个小文件
    ├── views/                # 业务页面（全部走 Layout）
    │   └── <module-name>/    # [S-module-quartet] 模块四件套：api / constants / use<Module> / <Module>List
    │       ├── api.ts
    │       ├── constants.tsx   # 表格列、search-form 控件配置
    │       ├── use<Module>.ts  # 业务 composable
    │       ├── <Module>List.vue
    │       ├── <Module>Detail.vue
    │       └── <Module>Create.vue   # 创建弹窗：文件名不带 Dialog / Drawer 形态后缀
    ├── App.vue
    ├── main.ts
    └── vite-env.d.ts
```

**[S-system-views-split] 两个 system-views/views 分层是核心**：登录注册这类全屏页面**不进 Layout**，与业务页面用不同的视觉容器；这块千万别合并。

## 十四条不可违背的约定（R1–R14）

> 这些编号是稳定 ID，被 `vue-scaffold-review` 报告引用。修改本节请保持编号不变。

1. **[R1] business code 收口**：axios 拦截器内判断业务成功码（默认 `code === 0`，需要时通过 `.env` 的 `VITE_API_SUCCESS_CODE` 覆盖适配不同后端）直接返回 `data.data`，其它 code toast + `throw ApiError`。业务层 `await api()` 直接拿到数据，**禁止 `if (response.code === 0)`**。需要捕获时 `try { await api() } catch (e) {/* 已 toast */ }`。
2. **[R2] 逻辑抽离到 hook 文件**：每个页面都要配一个 `use<Module>.ts`，把加载数据、调接口、弹窗开关这类逻辑全放进去。页面本身的 `<script setup>` **不超过 50 行**，只干三件事——引入 hook、解构出要用的变量和方法、引入图标。hook 分两层存放：**多个模块共用的**（权限判断、字典加载之类）放 `src/hooks/`；**只给当前模块自己用的**放 `views/<模块名>/use<模块名>.ts`。两层别混。
3. **[R3] ref over reactive**：所有响应式数据用 `ref()`。`reactive` 只允许在极少数确实需要 deep 引用的场景使用（默认拒绝）。
4. **[R4] 加密集中**：RSA 公钥 / 分段算法 / 调用入口全部在 `utils/crypto.ts`；公钥从 `.env` 注入；其它文件不允许 `new JSEncrypt()`。
5. **[R5] .env 收口**：应用标题、API 基址、超时、公钥、外部资源 URL 等所有可配置项都进 `.env`，禁止硬编码。
6. **[R6] components vs custom-components vs hd-ui**：基础组件（表格 / 搜索表单 / 远程下拉 / 吸顶容器 / 文本省略 / JSON 查看器等）**一律来自 `@rdeam/hd-ui`**，`HdCustomResolver` 自动注册；`src/components/` 只放 BaseX 本地展示组件；业务封装（特定接口 / 特定字典 / 内置过滤）放 `src/custom-components/`，使用时显式 import。
7. **[R7] UnoCSS 优先**：能用原子类完成的样式都用原子类（含 `!important` 前缀 `!h-[42px]`、伪类 `hover:!bg-white/10`、属性选择器 `[&_span]:!text-white` 等）。`<style scoped>` 只写**必须**用到的 element-plus 深度覆盖（`:deep(.el-input__wrapper)` 等）；禁止用 SCSS 实现可以用原子类解决的事。
8. **[R8] 路由 meta.title 直接中文**：除非项目启用 i18n，否则 `meta.title` 直接写中文字符串（如 `'角色管理'`），不要填 i18n 的 key。页面标题和面包屑都从 `meta.title` 取，不再额外维护映射。
9. **[R9] API 文件返回 T 不返回 AxiosResponse**：`request.post<UserInfo>(url)` 返回 `Promise<UserInfo>`。业务层 `const data = await getXxx()` 拿到的就是数据本身。这是拦截器收口的必然推论。
10. **[R10] 错误已 toast**：业务层 `catch` 块通常**空块**（仅放注释 `// 错误已由 axios 拦截器统一 toast`），不要再 `ElMessage.error(...)` 一次。`finally` 处理 `submitting.value = false` 等状态清理。
11. **[R11] store 模块禁止手动调 `localStorage`**：所有跨会话持久化通过 `defineStore` 第三参数的 `persist: { pick: [...] }` 配置（`pinia-plugin-persistedstate` 全局注册）。**不允许**出现 `localStorage.setItem(...)` / `localStorage.getItem(...)` / `localStorage.removeItem(...)` / `localStorage.clear()` 这类调用。退出登录用"in-memory state 重置"（`token.value = ''` 等），persistedstate 会自动把空值同步回 localStorage——不要用 `localStorage.clear()`，它会把跟登录态无关的偏好（语言 / 侧边栏 / 系统配置）一起误伤。
12. **[R12] KeepAlive 策略不强制**：`Main.vue` 里 `<keep-alive>` 是用 `:include="keepAliveNames"` 白名单还是 `v-if="route.meta.keepAlive"` 条件分支，**由项目自己决定**，脚手架不作硬性要求。两种写法的取舍各有道理（白名单集中、分支显式），选择哪一种是项目内部的工程权衡，不属于"规范"层面。
13. **[R13] 禁止桶式 re-export**：可以建 `index.ts`，但必须是真正的实现文件（如 `router/index.ts`、`store/index.ts`），不能是只做 `export * from './xxx'` 的纯转发桶。业务文件直接从子模块 import（`'@/utils/request'`、`'@/hooks/usePermission'`），不要通过中间层转一道。桶式转发容易把无关依赖拖进循环引用，也妨碍 IDE 跳转和 tree-shaking。
14. **[R14] Element Plus 中文 locale**：`App.vue` 用 `<el-config-provider :locale="zhCn">` 包裹根视图（`import zhCn from 'element-plus/es/locale/lang/zh-cn'`）。本规范按需自动引入 element-plus（没有 `app.use(ElementPlus, { locale })` 这一层），漏了它，分页 / 日期面板 / 空数据等内置文案全是英文。中文工程必须带。

## 反模式（A1–A14，明确禁止）

> 这些编号是稳定 ID，被 `vue-scaffold-review` 报告引用。修改本节请保持编号不变。

- ❌ **[A1]** `const formModel = reactive({...})` —— 改用 `ref`
- ❌ **[A2]** `if (response.data?.code === 0)` —— 拦截器已经处理
- ❌ **[A3]** `const PUBLIC_KEY = 'MIGfMA0...'` 散落各处 —— 用 `utils/crypto.ts` + `.env`
- ❌ **[A4]** view 文件里写 200 行业务逻辑 —— 抽出 `use<Module>.ts`
- ❌ **[A5]** `<style scoped>` 写一大堆自定义 class —— 改 UnoCSS 原子类 + element-plus 属性
- ❌ **[A6]** 业务下拉手写 `el-select` + `loadXxxOptions` + ref 数组 —— 封装到 `custom-components/`
- ❌ **[A7]** `meta.title` 填 i18n 的 key 而不是直接写中文 —— 直接 `meta.title: '登录'`
- ❌ **[A8]** `import t from i18n` 后通篇 `t('PUB_xxx')` —— 中文项目直接写中文
- ❌ **[A9]** 把 fetch / 原生 XHR 与 axios 实例混用 —— 全部走 `request` / `requestWithLoading`
- ❌ **[A10]** 在 `views/` 直接放业务接口的硬编码 URL —— 接口集中在模块同目录 `api.ts`
- ❌ **[A11] store 里手动调 `localStorage.setItem(KEY, value)` / `localStorage.getItem(KEY)` / `localStorage.clear()`** —— 一律用 `defineStore(..., { persist: { pick: [...] } })` 走插件；退出清登录态用 in-memory state 重置，让 persistedstate 自动同步，不要 `localStorage.clear()` 误伤偏好
- ❌ **[A12]** `import 'element-plus/dist/index.css'` / `import 'element-plus/theme-chalk/**.css'` —— 全量引入 element-plus CSS。规范用 `unplugin-vue-components` 的 `ElementPlusResolver` 按需自动 import 组件，CSS 由 `@rdeam/vite-plugin-element-plus-theme-builder` 编译成 `src/assets/generated/element-plus-theme.css`，在 `main.ts` 单次 import 即可。**业务文件任何位置都不应该 import element-plus 的 CSS**
- ❌ **[A13]** 建纯转发桶文件 `index.ts`（里面只有 `export * from './xxx'`） —— 有实现逻辑的 `index.ts` 可以，纯转发的不要
- ❌ **[A14]** 业务页裸用 `<el-table>` —— 列表页（有查询表单）用 `<hd-pro-table>`，无查询表单的表格用 `<hd-table>`；缺特性去扩展 `<hd-table>`，不在业务页裸用。选型边界见 `vue-scaffold-layout` L2 的「hd-pro-table vs hd-table」
- ❌ **[A15]** 把 hd-ui 已有的基础组件源码放进 `src/components/`。

## 执行流程（从 `pnpm create vite` 到可运行的 hello world 业务页）

> 每一步用对应的 reference 文件作为复制源，**不要凭记忆抄代码**。

### Step 0 — 同步项目级 CLAUDE.md（每次必做，最先做）

把 `references/project-CLAUDE.template.md` 写入目标项目根目录的 `CLAUDE.md`，作为**常驻开发规范**（每次会话自动加载、优先级高于 skill 正文）：

- 项目根**没有** `CLAUDE.md` → 直接复制模板过去。
- 已有 `CLAUDE.md` 且首行是 `<!-- vue-dev-standards:project-claude vN -->` → 是本套生成的，模板版本更高时**整体覆盖**（用户的本地改动应回流到模板，而不是留在项目里）。
- 已有 `CLAUDE.md` 但**不是**本套标记（用户自己写的）→ **不要覆盖**，把本套要点合并进去或提示用户，避免误伤。

这一步与"建工程"解耦：哪怕是已有老项目，只要触发本 skill 也应顺手把 `CLAUDE.md` 补齐/更新。

**同时写一个 `AGENTS.md` 指针**（给 Codex 等只认 `AGENTS.md` 的工具）：项目根没有 `AGENTS.md`（或首行是 `<!-- vue-dev-standards:agents-pointer -->`）时，写入下面这份**只指向 CLAUDE.md、不重复内容**的指针，保证规范单一来源：

```markdown
<!-- vue-dev-standards:agents-pointer v1 -->

# 开发规范

本项目的开发规范见 [`./CLAUDE.md`](./CLAUDE.md)，请完整遵守其中全部约定（数据请求、表格、页面布局、业务模块、状态与样式等）。

CLAUDE.md 是规范的唯一来源；本文件仅为 Codex 等读取 `AGENTS.md` 的工具提供入口。
```

已有用户自己写的 `AGENTS.md`（非本套标记）→ 不覆盖，提示用户在其中追加一行指向 `CLAUDE.md` 即可。

### Step 1 — 用官方脚手架起壳子

先用 Vite 官方脚手架生成一个最小的 Vue + TS 项目壳：

```bash
pnpm create vite <project-name> --template vue-ts
cd <project-name>
```

选项答疑（CLI 交互式提问时）：

- Framework：`Vue`
- Variant：`TypeScript`（**不要选 Customize / Router / Pinia 等附加选项**，本 skill 自带这些配置，让脚手架尽量保持最小骨架）

生成完毕后，**删掉 Vite 默认的样例文件**，避免后续步骤跟模板冲突：

```bash
# 默认 demo 资源 —— 全删
rm -rf src/assets src/components src/style.css
rm -f src/App.vue src/main.ts public/vite.svg
```

### Step 2 — 建标准目录

```bash
mkdir -p src/{api,assets/styles,assets/generated,components,custom-components,directives,hooks,layout,router,store,system-views/{login,register,reset-password},types,utils,views}
```

### Step 3 — 覆盖配置文件

按 `references/config-files.md` 用本 skill 规范**覆盖**脚手架默认产物：

1. `package.json`（依赖清单完整复制，包名替换为 `<project-name>`；Vite 默认只有 `vue` + `vue-tsc`，需要补齐 element-plus / unocss / pinia / vue-router / jsencrypt 等全部依赖）
2. `tsconfig.json` / `tsconfig.app.json` / `tsconfig.node.json`（开启 `noUnusedLocals` 等严格规范）
3. `vite.config.ts`（覆盖默认版本，加 alias / 插件 / 代理）
4. `uno.config.ts`（主题色 + shortcuts）
5. `.env`（VITE_APP_TITLE / VITE_API_BASE_URL / VITE_API_TIMEOUT / VITE_RSA_PUBLIC_KEY）
6. `.gitignore`（覆盖 Vite 默认薄版本，确保 `node_modules` / `dist` / `.env` 被忽略）
7. `.gitattributes`（跨平台换行符规范）
8. `index.html`（覆盖默认 `<title>Vite + Vue + TS</title>` 为 `<title>%VITE_APP_TITLE%</title>`，并把 `<script src="/src/main.ts">` 保留）
9. `src/assets/styles/ress.min.css` —— 直接从 `references/assets-styles/ress.min.css` 复制过去（全局 reset，main.ts 已引入）

### Step 4 — 写核心工具

按 `references/core-utils.md` 写：

- `src/utils/request.ts` —— 含 `ApiError` 类、`Request` 接口、`request` / `requestWithLoading`。**文件名是 `request.ts` 而不是 `axios.ts`** —— 命名描述职责（"封装请求"），不绑定底层库；将来换 fetch / undici 文件名不变
- `src/utils/crypto.ts` —— `rsaEncryptChunks` + `encryptPayload`
- `src/utils/format.ts` —— `emptyText` / `formatDateTime` 等显示型格式化辅助（**不要预置分页、字典封装**——它们与后端字段约定强绑定，按各项目沉淀；**文件相关的下载 / 转换 / 大小格式化等需要时统一收口到 `utils/file.ts`**，不预置、也不拆成多个小文件）。**[S-utils-naming]** 禁用泛名 `common.ts` / `helpers.ts`——啥都能装 = 啥都不该装
- `src/utils/regx.ts` —— 正则常量集合 + 基于正则的 element-plus 表单 rules。**[S-utils-naming]** 文件名是 `regx.ts` 而不是 `rules.ts` / `regex.ts` —— 团队约定的正则文件命名
- **[S-utils-barrel]** 不要建 `src/utils/index.ts` 桶导出——业务文件统一直接 `import from '@/utils/request'` / `'@/utils/format'`，避免 barrel 引发的循环依赖与 tree-shaking 失效
- **[S-views-root]** 不要在 `src/views/` 根目录建任何 `.ts` 文件（`shared.ts` / `common.ts` / `types.ts` 都不行）——views 根的直接子节点只能是菜单目录，跨菜单复用的函数下沉到 `utils/`，跨菜单复用的类型下沉到 `src/types/api.ts`

### Step 5 — 写 router / store

按 `references/router-store.md` 写：

- `src/store/index.ts` + `app.ts` + `auth.ts`
- `src/router/index.ts`（白名单 / 守卫 / 面包屑 / document.title）
- `src/api/index.ts` —— 仅放跨模块通用接口（如 `logoutApi`）；业务模块自己的接口写到 `src/views/<module>/api.ts`

### Step 6 — 写 Layout 与 system-views

按 `references/layout-and-system-views.md` 写：

- 整个 Layout 主框架
- 登录 / 注册 / 重置密码三套 system-views（含 useLogin / useRegister 等 composable）

### Step 7 — 接入基础组件库（@rdeam/hd-ui）

基础组件（增强表格 / 查询表单 / 远程下拉 / 吸顶容器 / 文本省略 / JSON 查看器 / 基础 table 等）**统一来自 `@rdeam/hd-ui`**。`src/components/` 只放 BaseX 本地展示组件。

```
src/components/
└── Base*.vue           # BaseX 本地展示组件
```

可用标签（`<hd-pro-table>` / `<hd-table>` / `<hd-sticky-container>` 等，模板直接写、自动注册）见 `vue-scaffold-hd-ui` 的标签速查表。

**落地方式：** 触发 `/vue-scaffold-hd-ui` 子 skill——装依赖、在 `vite.config.ts` 接 `HdCustomResolver`（`@rdeam/hd-ui/resolvers`）+ `element-plus-theme-builder`。

⚠️ **这一步不能跳过** —— `<hd-pro-table>` / `<hd-remote-search>` 是业务模块（`vue-scaffold-module`）和业务组件（`vue-scaffold-component`）的依赖底座。新项目必须先把 hd-ui 接好，再进入 Step 8。

### Step 8 — 添加第一个业务模块

调起 `/vue-scaffold-module` 子 skill 生成模块四件套（或直接读它的 SKILL.md 手工执行）：

```
src/views/example/
├── api.ts                  # request.post<T>(...) 调用，返回 Promise<T>
├── constants.tsx           # createXxxSearchForm() / createXxxColumns()
├── useExample.ts           # 业务逻辑（formModel ref / list 加载 / 提交 / 弹窗）
├── ExampleList.vue         # <hd-pro-table> + 调用 useExample()
├── ExampleCreate.vue       # 弹窗（如有）—— 文件名不带 Dialog / Drawer 后缀
└── ExampleDetail.vue       # 详情页（如有）
```

并在 `src/router/index.ts` 注册路由（路径 / name / meta.title 中文 / Layout 作为 component）。

### Step 9 — 验证

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
4. `src/views/role/RoleList.vue` —— 30 行内：`<hd-pro-table />` + `<RoleEdit />` + 解构 `useRole()`
5. 如有创建 / 编辑，新建 `RoleEdit.vue`（弹框 / 抽屉文件名**不带** `Dialog` / `Drawer` 后缀；独立 props `modelValue`，emit `update:modelValue` + `success`）
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

整个过程不应该超过 1 小时。如果超过了，多半是没有复用 `<hd-pro-table>` / `useXxx` 模式，或者在 view 里写了一堆业务逻辑——回头检查。

## 业务下拉 / 状态字典如何下沉为组件

范式（详见子 skill `vue-scaffold-component`）：

- 包一层 `RemoteSearch`，固定 `url` / `labelKey` / `valueKey`
- 默认 `dataCallback` 做项目级过滤（例如只保留某条业务线下的选项）
- 透传 `context.attrs`，允许调用方覆盖默认行为
- 调用方 `<<Prefix>XxxSelect v-model="..." />` 一行搞定，不再写 `loadXxx` / `xxxOptions` ref

调起 `vue-scaffold-component` 子 skill 自动按上面范式生成 `src/custom-components/<ComponentName>.tsx`。

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

按需打开对应 reference 文件，复制其中代码到目标项目，按项目名 / 接口名替换。**不要凭记忆**重写这些核心文件，差异会让后续协作非常痛苦。
