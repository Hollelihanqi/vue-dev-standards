# report-template — 审查报告 markdown 骨架

本文件定义 `docs/code-review/<yyyy-MM-dd-HHmm>.md` 的输出格式。占位符以 `{{...}}` 包裹，执行时由 review skill 替换。

> **报告写完后**：只在 chat 里回 **摘要 + 报告路径**，不要把整份报告 echo 到对话——会刷爆上下文。

---

## 文件名约定

```
docs/code-review/2026-05-29-1430.md
```

时间戳精确到分钟。同分钟二次审查覆盖。

---

## 完整骨架

```markdown
# Vue 规范合规审查报告

**审查时间**：{{yyyy-MM-dd HH:mm}}
**审查范围**：{{mode}}（{{n_files}} 个文件，{{n_lines}} 行）
**规范版本**：vue-scaffold-app @ {{commit_sha_short}}
**审查者**：vue-scaffold-review skill

---

## 摘要

| 级别 | 数量 |
|---|---|
| 🔴 严重 | {{count_critical}} |
| 🟡 警告 | {{count_warning}} |
| 🟢 建议 | {{count_suggestion}} |

**合规率**：{{passed_rules}} / {{total_rules}}  ({{pct}}%)

**合规结论**：{{PASS_or_FAIL}}

> `FAIL` 当且仅当 🔴 严重数 > 0。`PASS` 不代表代码完美，仅代表无硬反模式。

---

## 🔴 严重违规

> 必须修复。属反模式或不可违背的硬规则。

{{#each critical_findings}}
### {{rule_id}} {{rule_title}}

- **位置**：`{{file}}:{{line}}`
- **违规内容**：
  ```{{lang}}
  {{snippet}}
  ```
- **规则**：见 [`vue-scaffold-app/SKILL.md`](../../../<repo>/skills/vue-scaffold-app/SKILL.md) 搜索 `{{rule_id}}`
- **修复建议**：{{suggestion}}

{{/each}}

---

## 🟡 警告

> 强烈建议修复，但允许临时保留。

{{#each warning_findings}}
### {{rule_id}} {{rule_title}}

- **位置**：`{{file}}:{{line}}`
- **违规内容**：
  ```{{lang}}
  {{snippet}}
  ```
- **规则引用**：`{{rule_id}}`
- **修复建议**：{{suggestion}}

{{/each}}

---

## 🟢 建议

> 可改可不改，体现风格取舍。

{{#each suggestion_findings}}
### {{rule_id}} {{rule_title}}

- **位置**：`{{file}}:{{line}}`
- **修复建议**：{{suggestion}}

{{/each}}

---

## 规则速查表

> 报告中引用的全部规则，从 `vue-scaffold-app/SKILL.md` 提取，方便对照。

{{#each referenced_rules}}
### {{rule_id}}

{{rule_full_text}}

{{/each}}

---

## 检测范围明细

**审查文件清单**（{{n_files}}）：

{{#each scanned_files}}
- `{{path}}` ({{lines}} 行)
{{/each}}

**未审查项**：
- `node_modules/`、`dist/`、`src/types/`（自动生成）、`src/assets/generated/`
- 二进制 / 非源码文件
- 用户显式指定排除的目录

---

## 下一步

- 🔴 严重违规请按"修复建议"逐条处理，处理完重跑本 skill 验证
- 🟡 警告酌情处理
- 🟢 建议可在迭代过程中渐进改进

```

---

## 字段定义

| 占位符 | 含义 | 来源 |
|---|---|---|
| `{{yyyy-MM-dd HH:mm}}` | 审查时间戳 | `Date.now()` |
| `{{mode}}` | "全量（src/）" / "路径: src/views/role/" | 输入识别决定 |
| `{{n_files}}` | 实际审查的文件数 | Step 2 结果 |
| `{{n_lines}}` | 这些文件的总行数 | `wc -l` 累加 |
| `{{commit_sha_short}}` | vue-scaffold-app 当前提交 sha 前 7 位 | `git -C <repo> log -1 --format=%h skills/vue-scaffold-app` |
| `{{count_critical/warning/suggestion}}` | 三档计数 | 归并结果 |
| `{{passed_rules}}` | 未违规的规则数 | `total_rules - 触发规则数（不是触发次数）` |
| `{{total_rules}}` | 本次纳入审查的规则总数 | 取决于 mode（i18n 工程跳过 A8 等会减少） |
| `{{pct}}` | `passed/total * 100`，保留 1 位 | 计算 |
| `{{PASS_or_FAIL}}` | 字符串 `PASS` 或 `FAIL` | `critical == 0 ? PASS : FAIL` |
| `{{rule_id}}` | `R1` / `A2` / `S-utils-naming` | 检测层产出 |
| `{{rule_title}}` | 从 SKILL.md 提取的标题 | Step 1 缓存 |
| `{{file}}:{{line}}` | 命中位置（line 缺失时给 `?`） | grep / read 结果 |
| `{{snippet}}` | 违规原文片段（取 ±0 行，最多 80 字符截断） | grep / read 结果 |
| `{{lang}}` | 代码块语言（`ts` / `vue` / `tsx`） | 文件扩展名推断 |
| `{{suggestion}}` | 自然语言修复建议 | 检测层产出；尽量具体到改哪个 token |
| `{{rule_full_text}}` | 规则原文 | Step 1 缓存 |

---

## chat 回执模板

报告写完后，在 chat 里给出（**不要 echo 整份报告**）：

```
✅ 审查完成。报告：docs/code-review/2026-05-29-1430.md

合规结论：FAIL
- 🔴 严重 3
- 🟡 警告 7
- 🟢 建议 12

合规率：53/65 (81.5%)

打开报告查看详细违规清单与修复建议。
```

若 PASS：

```
✅ 审查通过。报告：docs/code-review/2026-05-29-1430.md

合规结论：PASS
- 🔴 严重 0
- 🟡 警告 2
- 🟢 建议 5

合规率：63/65 (96.9%)

无硬反模式。警告与建议可在后续迭代中处理。
```

---

## 报告归档

- 报告位置：`<目标工程>/docs/code-review/`
- 默认**入 git**（便于回溯历史合规趋势），但不强制；本 skill 不动 `.gitignore`
- 同一天多次审查会按分钟戳留多份报告，覆盖同分钟报告
- 老旧报告由项目自行决定何时清理；建议保留最近 30 天 + 每月最后一次
