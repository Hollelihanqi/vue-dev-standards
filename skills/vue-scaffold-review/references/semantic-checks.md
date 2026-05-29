# semantic-checks — 第二、三层检测

本文件定义两类需要 Read + 判断的规则：
- **第二层：结构 / 命名（S-*）**——Glob 文件树 + 白名单比对
- **第三层：语义（R1–R12 中纯靠 grep 解决不了的部分）**——Read 文件内容 + 上下文判断

> grep 已能覆盖的规则（A1/A2/A3/A6/A7/A8/A9/A10/A11 与对应的 R1/R3/R4/R8/R11）见 `grep-patterns.md`，本文件**不再重复**。

---

## 第二层：结构 / 命名

### [S-utils-naming] utils 文件名白名单

**步骤**：
1. `Glob src/utils/*.ts`
2. 对照白名单 `[request, crypto, format, regx, file]`
3. 不在白名单的文件名 → 违规

**特别命中告警**（高频违规）：
- `common.ts` / `helpers.ts` / `util.ts` / `utils.ts` —— 泛名，禁用
- `rules.ts` / `regex.ts` —— 应为 `regx.ts`（团队约定）
- `axios.ts` / `http.ts` —— 应为 `request.ts`

**严重程度**：🟡 警告

**输出**：`src/utils/common.ts` → 建议重命名为 `format.ts`（或迁入 `format.ts`）

---

### [S-utils-barrel] 禁建 utils 桶导出

**步骤**：
1. 检查 `src/utils/index.ts` 是否存在

**严重程度**：🔴 严重（触发循环依赖与 tree-shaking 失效）

**输出**：删除 `src/utils/index.ts`，业务文件改为直接 import 具体文件。

---

### [S-views-root] views 根禁放 .ts

**步骤**：
1. `Glob src/views/*.ts`（不含子目录）
2. 任何命中即违规

**严重程度**：🔴 严重（破坏菜单目录结构约定）

**输出**：迁移：跨菜单复用的函数 → `utils/`；跨菜单复用的类型 → `src/types/api.ts`。

---

### [S-module-quartet] 模块四件套

**步骤**（对每个 `src/views/<m>/` 目录，且 `<m>` 是叶子菜单——存在 `<X>List.vue` 视为叶子）：
1. 检查是否齐 `api.ts`、`constants.tsx`、`use<Pascal(m)>.ts`、`<Pascal(m)>List.vue`
2. 缺其中任一 → 告警

**例外**：
- 分组目录（不含 `<X>List.vue`，仅作命名空间）不参与本检查
- 详情页独立路由时允许追加 `<X>Detail.vue`，不算多余

**严重程度**：🟡 警告

**输出**：`src/views/role/` 缺 `useRole.ts`，业务逻辑可能堆在 `RoleList.vue` 里——结合 R2 一起判断。

---

### [S-system-views-split] 系统页 / 业务页分层

**步骤**：
1. `Glob src/system-views/`，不存在则告警"未分层"
2. `Glob src/views/{login,register,reset-password,forgot-password}/`，命中即告警"系统页错放业务目录"

**严重程度**：🟡 警告

**输出**：把登录 / 注册 / 重置密码迁到 `src/system-views/`，路由 component 不走 Layout。

---

## 第三层：语义（R1–R12 中需要语义判断的部分）

### [R2] composable 拆分 + view 行数

**两段检查**：

**(a) view 行数**：
1. 对每个 `*.vue` 文件，Read 后解析 `<script setup>` 段
2. 计算非空非注释行数
3. > 50 行 → 违规

```ts
// 解析参考
const SCRIPT_BLOCK = /<script\s+setup[^>]*>([\s\S]*?)<\/script>/
const meaningfulLine = (l: string) =>
  l.trim() && !l.trim().startsWith('//') && !l.trim().startsWith('/*')
```

**(b) composable 拆分**：
1. 若 `src/views/<m>/<M>List.vue` 的 `<script setup>` 含 ≥3 个 ref/computed/method 定义
2. 但同目录无 `use<M>.ts`
3. → 违规

**严重程度**：🟡 警告（行数超 50 是边界，并非硬反模式；但若超 100 升级 🔴）

**输出**：建议抽出 `views/role/useRole.ts`，把 ref / 加载函数 / 编辑提交 / 弹窗 visibility 全部迁入；view 只保留 `const { ... } = useRole()` + template binding。

---

### [R5] .env 收口

**步骤**：
1. Read `.env` / `.env.example` / `.env.development`，记录已收口的变量名（如 `VITE_APP_TITLE` / `VITE_API_BASE_URL` / `VITE_API_TIMEOUT` / `VITE_RSA_PUBLIC_KEY`）
2. Grep `src/**/*.{ts,vue,tsx}`：
   - 应用标题字面量：`document.title\s*=\s*['"][^'"]+['"]`（非 `import.meta.env.*`）
   - API 基址字面量：`baseURL:\s*['"]https?:\/\/[^'"]+['"]`
   - 超时字面量：`timeout:\s*\d{4,}`（直接给毫秒数）
   - 公钥字面量：见 [A3]
3. 命中 → 违规

**严重程度**：🟡 警告（应用标题与基址）；🔴 严重（公钥与超时——超时硬编码会导致环境切换失效）

**输出**：把字面量迁入 `.env`，业务文件改读 `import.meta.env.VITE_XXX`。

---

### [R6] components vs custom-components 归属

**步骤**：
1. Read `src/components/` 每个组件文件
2. 检查是否引用了"业务专属信号"：
   - 模板里写死特定 url（如 `/role/list`）
   - 引用了 `src/views/*/api.ts` 内的接口函数
   - 写死了某业务字典（如 `RoleType.ADMIN`）
3. 若命中 → 应放入 `custom-components/`

**反向检查**：
1. Read `src/custom-components/` 每个组件
2. 若完全没用业务专属信号、仅是通用 UI 封装 → 应放入 `components/`

**严重程度**：🟡 警告

**输出**：`src/components/UserSelect.vue` 引用了 `getUserList`，建议迁到 `src/custom-components/UserSelect.tsx`。

---

### [R7] UnoCSS 优先 / `<style scoped>` 滥用（覆盖 A5）

**步骤**：
1. Read `*.vue` 文件，提取 `<style scoped>` 段
2. 满足以下任一 → 违规：
   - 行数 > 30
   - 含非 `:deep()` 选择器的自定义 class 数 ≥ 3
   - 写了能被 UnoCSS 替代的简单 declaration（如 `display: flex` / `padding: 8px` / `color: #fff`）
3. 允许场景（不算违规）：
   - `:deep(.el-xxx)` 覆盖 element-plus 内部
   - 复杂动画 / @keyframes
   - 仅靠原子类做不到的全局 selector

**严重程度**：🟢 建议（除非整个 `<style>` 全是可替代项，升级 🟡）

**输出**：列出哪几条 declaration 可换 UnoCSS 原子类。

---

### [R9] API 返回 T 不返回 AxiosResponse

**步骤**：
1. `Glob src/views/**/api.ts` 与 `src/api/*.ts`
2. Read 每个文件
3. 检查每个导出函数的返回类型：
   - 期望 `Promise<T>` / `: Promise<T>` 显式标注 或 `request.post<T>(...)` 隐式推导
   - 违规：返回类型是 `Promise<AxiosResponse<T>>` / `AxiosResponse` / `any`
4. 也检查调用方：`Grep` `\.data\.data\b` 或 `response\.data\.code` 表明业务层在拆 AxiosResponse 结构

**严重程度**：🔴 严重（一旦返回 AxiosResponse，整个拦截器收口失效）

**输出**：把 `request.post(url).then(r => r.data.data)` 改为 `request.post<T>(url)` 直接返回。

---

### [R10] 错误已 toast / 防双重 toast

**步骤**：
1. Grep `catch\s*\(`，定位所有 catch 块
2. 对每个命中，Read 上下文 ±5 行
3. 若 catch 块内含 `ElMessage.error(` / `MessageBox.alert(` / `Notification.error(` → 违规（重复 toast）
4. 允许场景：业务确实需要额外 UI 反馈（如跳转、定制弹窗）——人工判断

**严重程度**：🟡 警告

**输出**：删除 catch 内的 `ElMessage.error`，仅保留必要状态清理（`finally` 内 `submitting.value = false`）。

---

### [R12] KeepAlive 策略不混用

**步骤**：
1. Read `src/layout/Main.vue`
2. 检查 `<keep-alive>` 是否**同时**出现 `:include="..."` 和 `v-if="route.meta.keepAlive"` 两种策略
3. 仅一种 → 合规
4. 都没用 → 不告警（项目不需要 keep-alive 是合法选择）
5. 两种混用 → 违规

**严重程度**：🟢 建议（取舍问题，但混用会让 cache 行为难推理）

**输出**：建议二选一统一。

---

### [R1] business code 收口（补充语义）

A2 grep 已覆盖业务层判 code 的反模式。本节补充**拦截器侧**的语义检查：

**步骤**：
1. Read `src/utils/request.ts`
2. 检查拦截器内部：
   - 必须有 `response.interceptors.use((res) => { if (res.data.code === 0) return res.data.data; throw new ApiError(...) })` 等价逻辑
   - 必须 toast 非 0 业务码错误
3. 缺失 → 违规

**严重程度**：🔴 严重（整套规范的根基）

**输出**：补全拦截器，给出 `references/core-utils.md` 的模板代码引用。

---

### [R4] 加密集中（补充语义）

A3 grep 已覆盖公钥散落与 JSEncrypt 散落。本节补充**集中点存在性**检查：

**步骤**：
1. 检查 `src/utils/crypto.ts` 是否存在
2. 不存在但工程任何地方用了 `JSEncrypt` / `node-forge` → 违规
3. 存在但没有导出 `encryptPayload` 等标准入口 → 警告

**严重程度**：🔴 严重

**输出**：建立 `utils/crypto.ts`，按 `references/core-utils.md` 模板写。

---

## 输出归并

第二、三层结果与第一层 grep 结果统一汇入报告渲染层。每条违规仍走四要素：`位置 / 违规内容 / 规则引用 / 修复建议`。

语义层规则可能产生**模糊命中**（如"可能滥用 reactive"）—— 报告里明确标注 `[模糊]` 前缀，提示需人工确认。

---

## 性能优化提示

- 第三层执行慢，对每个文件**只 Read 一次**，把所有需要的检查在那次 Read 后合并跑（避免对同一文件重复 Read）
- 大文件（> 2000 行）默认跳过 R2 行数检查，给出"文件过大，建议拆分"的元告警
- 给用户进度反馈：`读 12/47 个文件...`
