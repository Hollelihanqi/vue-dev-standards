# grep-patterns — 第一层检测（A1–A12 反模式）

每条反模式一条 ripgrep 正则。所有规则的 Grep 调用并行发出，一次拿全部命中。

- 全部规则的文件范围默认套用 SKILL.md Step 2 的排除目录（`types` / `components` / `custom-components` / `assets` / `node_modules` / `dist`），下文只列规则专属的额外排除。
- 期望命中数 0 = 合规。
- A4 / A5 是行数 / 风格判断，在 `semantic-checks.md`，本层不处理。

---

## [A1] reactive 滥用

- 正则：`\b(const|let|var)\s+\w+\s*=\s*reactive\s*\(`
- 范围：`src/**/*.{ts,vue,tsx}`

## [A2] 业务层判 code

- 正则：`\.code\s*[!=]==?\s*0\b`
- 范围：`src/**/*.{ts,vue,tsx}`
- 额外排除：`src/utils/request.ts`（拦截器本身要判 code）

## [A3] RSA 公钥散落

- 正则：`MIGfMA0|BEGIN PUBLIC KEY|BEGIN RSA PUBLIC KEY`
- 范围：`src/**/*.{ts,vue,tsx}`
- 额外排除：`.env*`
- 配套：`new\s+JSEncrypt\(` 出现在 `src/utils/crypto.ts` 以外即违规

## [A6] 业务下拉手写 el-select

- 正则（multiline）：`<el-select[^>]*\bremote\b[\s\S]{0,500}?:remote-method`
- 范围：`src/views/**/*.vue`

## [A7] meta.title 用 i18n key

- 正则：`title:\s*['"][A-Z][A-Z0-9_]{2,}['"]`
- 范围：`src/router/**/*.ts` 及 view 内 `meta:` 块
- 跳过条件：项目启用 i18n（依赖 `vue-i18n`）

## [A8] i18n key 散落业务文件

- 步骤 1（找 import）：`from\s+['"](vue-i18n|@/i18n|@/locales)['"]`，无命中则跳过步骤 2
- 步骤 2（找 key 调用）：`\bt\(['"][A-Z][A-Z0-9_]{2,}['"]`
- 范围：`src/**/*.{ts,vue,tsx}`
- 启用 i18n 的工程：降级为 🟢 建议

## [A9] fetch / 原生 XHR

- 正则：`\bfetch\s*\(|new\s+XMLHttpRequest\s*\(`
- 范围：`src/**/*.{ts,vue,tsx}`
- 额外排除：`src/mock/**`、`src/utils/request.ts`、`*.spec.` / `*.test.` / `__tests__`、注释行（命中后 Read 确认）

## [A10] views 内硬编码 URL

- 正则：`request\.(post|get|put|delete|patch)\s*<[^>]*>?\s*\(\s*['"]\/`
- 范围：`src/views/**/*.{vue,ts,tsx}`
- 额外排除：`src/views/**/api.ts`（接口就该放这）

## [A11] 手调 localStorage

- 正则：`localStorage\.(setItem|getItem|removeItem|clear)\s*\(`
- 范围：`src/**/*.{ts,vue,tsx}`
- 分级：`src/store/**` 命中 → 🔴；其他目录命中 → 🟡

## [A12] 全量引入 element-plus CSS

- 正则：`import\s+['"]element-plus/(dist|theme-chalk|lib)/`
- 范围：`src/**/*.{ts,vue,tsx}`
- 修复：删除该 import，ep 组件由 `ElementPlusResolver` 按需引入

---

## 结果归并

每条结果按 `{ ruleId, ruleTitle, hits: [{ file, line, snippet }], severity }` 收集，交给 `report-template.md` 渲染。
