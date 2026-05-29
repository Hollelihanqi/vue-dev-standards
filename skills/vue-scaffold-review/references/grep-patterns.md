# grep-patterns — 第一层检测（A1–A11 反模式）

本文件列出每条 A* 反模式的 ripgrep 检测规则。`Grep` 工具底层就是 ripgrep，正则语法直接套用。

> **执行建议**：把所有规则的 Grep 调用**并行发出**（一条消息里多个 Grep tool call），一次性拿全部命中，避免串行延迟。

> **未列入本文件的反模式**：A4 / A5 是语义判断（行数 / 风格），放在 `semantic-checks.md`，本层不处理。

---

## [A1] reactive 滥用

**规则**：所有响应式数据用 `ref()`，`reactive` 默认拒绝。

**正则**：

```
\b(const|let|var)\s+\w+\s*=\s*reactive\s*\(
```

**文件范围**：`src/**/*.{ts,vue,tsx}`

**排除**：`src/types/**`（自动生成）

**期望命中数**：0

**违规示例**：
```ts
const formModel = reactive({ name: '', age: 0 })
```

**合规重写**：
```ts
const formModel = ref({ name: '', age: 0 })
```

---

## [A2] 业务层判 code

**规则**：拦截器统一处理 code，业务层禁止 `if (response.code === 0)`。

**正则**：

```
\.code\s*[!=]==?\s*0\b
```

**文件范围**：`src/**/*.{ts,vue,tsx}`

**排除**：
- `src/utils/request.ts`（拦截器本身要判 code）
- `src/utils/request/**`（如果拆成多文件）

**期望命中数**：0

**违规示例**：
```ts
const response = await getUser()
if (response.code === 0) { /* ... */ }
```

**合规重写**：
```ts
try {
  const data = await getUser()  // 拦截器已判 code，data 就是 UserInfo
  // ...
} catch (e) { /* 错误已 toast */ }
```

---

## [A3] RSA 公钥散落

**规则**：公钥从 `.env` 注入；其它文件不允许内嵌公钥字面量。

**正则**：

```
MIGfMA0|BEGIN PUBLIC KEY|BEGIN RSA PUBLIC KEY
```

**文件范围**：`src/**/*.{ts,vue,tsx}` 以及项目根（用于检查 .env 也别在 src 里复制）

**排除**：
- `src/utils/crypto.ts`（这是公钥消费者，但应该通过 `import.meta.env` 读，不内嵌；命中也需告警）
- `.env*`（合法存放位置）

**期望命中数**：0

**违规示例**：
```ts
const PUBLIC_KEY = '-----BEGIN PUBLIC KEY-----\nMIGfMA0...'
```

**合规重写**：
```ts
// utils/crypto.ts
const publicKey = import.meta.env.VITE_RSA_PUBLIC_KEY
```

**配套检查**：grep `new\s+JSEncrypt\(`，文件 ≠ `src/utils/crypto.ts` 即违规（公钥可能从 .env 来，但 JSEncrypt 实例化必须集中）。

---

## [A6] 业务下拉手写 el-select

**规则**：业务下拉（特定接口 / 字典）封装到 `src/custom-components/`，不在 view 内联写。

**正则**（启用 multiline）：

```
<el-select[^>]*\bremote\b[\s\S]{0,500}?:remote-method
```

**文件范围**：`src/views/**/*.vue`

**排除**：
- `src/custom-components/**`（封装内部允许）
- `src/components/**`（基础 remote-search 组件允许）

**期望命中数**：0（视图层不应有 remote el-select）

**违规示例**：
```vue
<el-select v-model="x" remote :remote-method="loadOptions" :loading="loading">
  <el-option v-for="o in xOptions" :key="o.value" :value="o.value" :label="o.label" />
</el-select>
```

**合规重写**：
```vue
<RoleSelect v-model="x" />   <!-- 封装到 custom-components/RoleSelect.tsx -->
```

---

## [A7] meta.title 用 i18n key

**规则**：除非项目强制启用 i18n，meta.title 用中文字符串。

**正则**：

```
title:\s*['"][A-Z][A-Z0-9_]{2,}['"]
```

**文件范围**：`src/router/**/*.ts` 以及 view 文件里的 `meta:` 块

**排除**：
- 项目明确启用 i18n 时跳过此规则（启动时询问用户或读 `package.json` 是否依赖 `vue-i18n`）
- 中文 / 数字 / 小写组合不命中（已被正则首字符大写限定）

**期望命中数**：0

**违规示例**：
```ts
{ path: '/login', meta: { title: 'MSGG0002' } }
```

**合规重写**：
```ts
{ path: '/login', meta: { title: '登录' } }
```

---

## [A8] i18n key 散落业务文件

**规则**：中文项目直接写中文，不通篇用 `t('PUB_xxx')`。

**两步检测**：

**步骤 1**：找 i18n import：

```
from\s+['"](vue-i18n|@/i18n|@/locales)['"]
```

如果工程没用 i18n，此步空命中，跳过步骤 2。

**步骤 2**：找 key 调用：

```
\bt\(['"][A-Z][A-Z0-9_]{2,}['"]
```

**文件范围**：`src/**/*.{ts,vue,tsx}`

**排除**：
- 工程显式启用 i18n（`package.json` 含 `vue-i18n` 依赖且 `src/main.ts` 注册了 i18n 插件）→ 此规则降级为 🟢 建议而非 🔴 严重

**期望命中数**：0

---

## [A9] fetch / 原生 XHR

**规则**：全部走 `request` / `requestWithLoading`。

**正则**：

```
\bfetch\s*\(|new\s+XMLHttpRequest\s*\(
```

**文件范围**：`src/**/*.{ts,vue,tsx}`

**排除**：
- `src/mock/**`
- `src/utils/request.ts`（封装本身可能内嵌）
- 文件名含 `.spec.` / `.test.` / `__tests__`
- 注释行（`Grep` 无法直接排除注释，命中后 Read 上下文确认）

**期望命中数**：0

**违规示例**：
```ts
const res = await fetch('/api/user')
```

**合规重写**：
```ts
const data = await request.post<UserInfo>('/api/user')
```

---

## [A10] views 内硬编码 URL

**规则**：接口集中在模块同目录 `api.ts`。

**正则**：

```
request\.(post|get|put|delete|patch)\s*<[^>]*>?\s*\(\s*['"]\/
```

**文件范围**：`src/views/**/*.{vue,ts,tsx}`

**排除**：
- `src/views/**/api.ts`（这就是该放的地方）

**期望命中数**：0

**违规示例**（在 `RoleList.vue` 或 `useRole.ts` 里）：
```ts
const list = await request.post<Role[]>('/role/list', params)
```

**合规重写**：
```ts
// views/role/api.ts
export const getRoleList = (params) => request.post<Role[]>('/role/list', params)
// views/role/useRole.ts
const list = await getRoleList(params)
```

---

## [A11] 手调 localStorage

**规则**：store 模块禁止手动调 `localStorage`；统一走 `persist: { pick: [...] }`。

**正则**：

```
localStorage\.(setItem|getItem|removeItem|clear)\s*\(
```

**文件范围**：`src/**/*.{ts,vue,tsx}`

**严重程度分级**：
- `src/store/**` 命中 → 🔴 严重（违反 [A11] / [R11] 本意）
- 其他 src 目录命中 → 🟡 警告（仍是反模式，但本规则没明文禁外部，需评估是否能转走 store）

**排除**：
- `src/utils/storage.ts`（如果项目封装了 storage 工具层）—— 但更建议不要这层，直接走 persistedstate

**期望命中数**：store 目录 = 0；全工程理想为 0

**违规示例**：
```ts
// src/store/auth.ts
const token = ref('')
const setToken = (t: string) => {
  token.value = t
  localStorage.setItem('TOKEN', t)
}
```

**合规重写**：
```ts
// src/store/auth.ts
export const useAuthStore = defineStore('auth', () => {
  const token = ref('')
  const setToken = (t: string) => { token.value = t }
  return { token, setToken }
}, {
  persist: { pick: ['token'] }
})
```

---

## 附：A4 / A5 不在本文件

| 反模式 | 处理位置 | 原因 |
|---|---|---|
| [A4] view 写 200 行业务 | `semantic-checks.md` R2 | 行数判断 / 含义判断，非正则 |
| [A5] `<style scoped>` 写一堆自定义 class | `semantic-checks.md` R7 | 风格判断，非正则 |

---

## 执行结果归并

每条 Grep 调用结果按如下结构收集：

```ts
{
  ruleId: 'A2',
  ruleTitle: '业务层判 code',
  hits: [
    { file: 'src/views/role/api.ts', line: 18, snippet: 'if (response.code === 0) {' },
    // ...
  ],
  severity: '🔴',
}
```

把所有规则结果交给报告渲染层（`report-template.md`）。
