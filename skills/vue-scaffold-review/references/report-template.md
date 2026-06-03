# report-template — 审查报告骨架

输出到 `docs/code-review/<yyyy-MM-dd-HHmm>.md`（时间戳到分钟，同分钟覆盖）。占位符 `{{...}}` 由 skill 替换。报告写完只在 chat 回摘要 + 路径，不 echo 全文。

---

## 骨架

```markdown
# Vue 规范合规审查报告

**审查时间**：{{yyyy-MM-dd HH:mm}}
**审查范围**：{{mode}}（{{n_files}} 个文件，{{n_lines}} 行）
**规范版本**：vue-scaffold-app @ {{commit_sha_short}}

## 摘要

| 级别 | 数量 |
|---|---|
| 🔴 严重 | {{count_critical}} |
| 🟡 警告 | {{count_warning}} |
| 🟢 建议 | {{count_suggestion}} |

**合规率**：{{passed_rules}} / {{total_rules}}（{{pct}}%）
**合规结论**：{{PASS_or_FAIL}}（🔴 > 0 即 FAIL）

## 🔴 严重违规

{{#each critical_findings}}
### {{rule_id}} {{rule_title}}
- **位置**：`{{file}}:{{line}}`
- **违规内容**：`{{snippet}}`
- **修复建议**：{{suggestion}}
{{/each}}

## 🟡 警告

{{#each warning_findings}}
### {{rule_id}} {{rule_title}}
- **位置**：`{{file}}:{{line}}`
- **违规内容**：`{{snippet}}`
- **修复建议**：{{suggestion}}
{{/each}}

## 🟢 建议

{{#each suggestion_findings}}
### {{rule_id}} {{rule_title}}
- **位置**：`{{file}}:{{line}}`
- **修复建议**：{{suggestion}}
{{/each}}

## 规则速查表

{{#each referenced_rules}}
### {{rule_id}}
{{rule_full_text}}
{{/each}}

## 未审查项
- `node_modules/` / `dist/` / `src/types/`
- `src/components/` / `src/custom-components/` / `src/assets/`
- 用户显式排除的目录
```

---

## 占位符

| 占位符 | 含义 | 来源 |
|---|---|---|
| `{{mode}}` | "全量（src/）" 或 "路径: xxx" | 输入识别 |
| `{{n_files}}` / `{{n_lines}}` | 审查文件数 / 总行数 | Step 2 |
| `{{commit_sha_short}}` | 规范当前 sha 前 7 位 | `git -C <repo> log -1 --format=%h skills/vue-scaffold-app` |
| `{{count_*}}` | 三档计数 | 归并 |
| `{{passed_rules}}` / `{{total_rules}}` | 未触发规则数 / 纳入规则数（i18n 工程跳 A8 等会减少） | 计算 |
| `{{PASS_or_FAIL}}` | `critical == 0 ? PASS : FAIL` | 计算 |
| `{{rule_id}}` / `{{rule_title}}` / `{{rule_full_text}}` | 规则编号 / 标题 / 原文 | Step 1 缓存 |
| `{{file}}:{{line}}` | 命中位置（缺失给 `?`） | 检测层 |
| `{{snippet}}` | 违规原文（≤ 80 字符） | 检测层 |
| `{{suggestion}}` | 修复建议（具体到改哪个 token） | 检测层 |

---

## chat 回执

```
✅ 审查完成。报告：docs/code-review/2026-05-29-1430.md
合规结论：FAIL
- 🔴 3  🟡 7  🟢 12
合规率：53/65（81.5%）
```

PASS 时同格式，结论改 PASS。

---

## 归档

报告位于 `<目标工程>/docs/code-review/`，建议入 git（不动 `.gitignore`），同分钟覆盖。
