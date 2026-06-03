# semantic-checks — 第二、三层检测

- **第二层（S-*）**：Glob 文件树 + 白名单比对。
- **第三层（R*）**：Read 文件 + 上下文判断（grep 解决不了的部分）。

grep 已覆盖的反模式见 `grep-patterns.md`，本文件不重复。R6（组件归属）因 `components` / `custom-components` 不在扫描范围，本 skill 不检查。

---

## 第二层：结构 / 命名

### [S-utils-naming] utils 文件名白名单

- `Glob src/utils/*.ts`，对照白名单 `[request, crypto, format, regx, file]`，其余文件名违规
- 高频违规：`common.ts` / `helpers.ts` / `util(s).ts`（泛名）、`rules.ts` / `regex.ts`（应为 `regx.ts`）、`axios.ts` / `http.ts`（应为 `request.ts`）
- 🟡 警告

### [S-utils-barrel] 禁建 utils 桶导出

- 检查 `src/utils/index.ts` 是否存在
- 🔴 严重（循环依赖 + tree-shaking 失效）

### [S-views-root] views 根禁放 .ts

- `Glob src/views/*.ts`（不含子目录），命中即违规
- 🔴 严重

### [S-module-quartet] 模块四件套

- 对每个含 `<X>List.vue` 的叶子菜单目录，检查是否齐 `api.ts` / `constants.tsx` / `use<Pascal>.ts` / `<Pascal>List.vue`
- 分组目录（无 `<X>List.vue`）不参与；详情页 `<X>Detail.vue` 允许
- 🟡 警告

### [S-system-views-split] 系统页 / 业务页分层

- `Glob src/system-views/` 不存在 → 告警
- `Glob src/views/{login,register,reset-password,forgot-password}/` 命中 → 告警（系统页错放业务目录）
- 🟡 警告

---

## 第三层：语义

### [R2] composable 拆分 + view 行数

- view 行数：Read `*.vue` 的 `<script setup>`，非空非注释行 > 50 违规（> 100 升 🔴）
- composable 拆分：`<X>List.vue` 含 ≥3 个 ref/computed/method 但同目录无 `use<X>.ts` → 违规
- 🟡 警告

### [R5] .env 收口

- Read `.env*` 记录已收口变量，再 Grep 业务文件中的硬编码字面量：
  - 标题：`document.title\s*=\s*['"][^'"]+['"]`
  - 基址：`baseURL:\s*['"]https?:\/\/[^'"]+['"]`
  - 超时：`timeout:\s*\d{4,}`
  - 公钥：见 [A3]
- 🟡（标题 / 基址）；🔴（公钥 / 超时）

### [R7] UnoCSS 优先 / `<style scoped>` 滥用

- Read `*.vue` 的 `<style scoped>`，命中任一违规：行数 > 30；非 `:deep()` 自定义 class ≥ 3；写了可用原子类替代的 declaration（`display: flex` / `padding` / `color` 等）
- 允许：`:deep(.el-xxx)`、@keyframes、原子类做不到的全局 selector
- 🟢 建议（整段全可替代时升 🟡）

### [R9] API 返回 T 不返回 AxiosResponse

- Read `src/views/**/api.ts` + `src/api/*.ts`，导出函数返回类型应为 `Promise<T>`；`Promise<AxiosResponse<T>>` / `AxiosResponse` / `any` 违规
- 调用方 Grep `\.data\.data\b`（拆 AxiosResponse 结构）
- 🔴 严重

### [R10] 错误已 toast / 防双重 toast

- Grep `catch\s*\(` 定位，Read 上下文：catch 块内含 `ElMessage.error(` / `MessageBox.alert(` / `Notification.error(` → 违规
- 🟡 警告

### [R12] KeepAlive 策略不混用

- Read `src/layout/Main.vue`：`<keep-alive>` 同时出现 `:include` 和 `v-if="route.meta.keepAlive"` → 违规；仅一种或都没用 → 合规
- 🟢 建议

### [R1] 拦截器收口（补充）

- Read `src/utils/request.ts`：拦截器须 `code === 0` 返回 `data.data`、非 0 抛错 + toast；缺失违规
- 🔴 严重

### [R4] 加密集中（补充）

- `src/utils/crypto.ts` 不存在但工程用了 `JSEncrypt` / `node-forge` → 违规；存在但无 `encryptPayload` 等入口 → 告警
- 🔴 严重

### [R13] App.vue 注入中文 locale

- Read `src/App.vue`：须 `<el-config-provider :locale="zhCn">` 包裹 `<router-view>` + `import zhCn from 'element-plus/es/locale/lang/zh-cn'`
- 缺失且 `main.ts` 也无 `app.use(ElementPlus, { locale })` → 违规
- 🟡 警告

---

## 归并

第二、三层结果与第一层统一汇入报告，每条走四要素：位置 / 违规内容 / 规则引用 / 修复建议。语义层的模糊命中加 `[模糊]` 前缀。第三层每文件只 Read 一次合并跑；> 2000 行文件跳过 R2 行数检查。
