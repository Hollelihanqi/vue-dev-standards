---
name: ui-test
description: 对前端工程做 UI 自动化测试，覆盖所有按钮、表单、校验。触发场景：用户说"按 ui-test 测试 xx 页面"、"测一下 xx 工程功能"、"跑一遍 UI 测试"、"测试 xxx 页面"、"测下 react/vue 页面功能"等。Claude 自动启动 dev server、登录（含读验证码）、覆盖所有交互、发现 bug 自动修复、清理测试数据、生成测试报告到工程的 docs/ 目录。
user-invocable: true
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - mcp__playwright__browser_navigate
  - mcp__playwright__browser_snapshot
  - mcp__playwright__browser_take_screenshot
  - mcp__playwright__browser_click
  - mcp__playwright__browser_type
  - mcp__playwright__browser_fill_form
  - mcp__playwright__browser_press_key
  - mcp__playwright__browser_select_option
  - mcp__playwright__browser_wait_for
  - mcp__playwright__browser_evaluate
  - mcp__playwright__browser_handle_dialog
---

# ui-test — UI 自动化测试

参数：`$ARGUMENTS`

## 启动条件

调用本 skill 时，用户应该已经提供（或在 `$ARGUMENTS` 里）：
- **工程目录**（必需）：如 `E:\华能\devops\devops-react` 或 `E:\华能\devops`
- **测试范围**（可选）：未指定 = 测全部；指定了页面名 = 只测该页面
- **账号**（可选）：默认 `mengbotian / 123456qwe`

如果用户没给工程目录，**先问清楚**再开始。

## 执行流程

### Step 1 — 启动 dev server（不汇报，闷头干）
1. `cd` 到工程目录
2. 后台启动 `pnpm run dev`（用 Bash 的 `run_in_background`）
3. 等 5 秒读输出文件，提取实际端口号（5173 / 5174 / 5176 等都可能）
4. 用 `mcp__playwright__browser_navigate` 打开 `http://localhost:<port>/login`

### Step 2 — 自动登录
1. `mcp__playwright__browser_take_screenshot` 截验证码图（target 选中验证码元素）
2. `Read` 读截图，识别验证码字符
3. `mcp__playwright__browser_fill_form` 填入用户名、密码、验证码
4. `mcp__playwright__browser_click` 点登录按钮
5. 验证跳转到 dashboard。验证码读错就刷新重试

### Step 3 — 执行测试

**测试范围判定：**
- 用户指定了页面（如"测白名单"）→ 进入该页面，只测它
- 用户要求测全部 → 遍历侧边栏所有菜单，每页都测

**每个页面要测的：**
所有可见按钮和操作，常见有：新增、编辑、详情、删除、禁用/启用、重置密码、搜索、重置、导出、批量操作……能点的都点。

**测试数据规则：**
- 改数据的操作（新增/编辑/删除/禁用/重置密码）**只用测试数据**：
  - 名称/地址：`test_` 或 `0xCLAUDE` 开头 + 时间戳后 6 位
  - 备注/描述：填"自动化测试"
- 不改数据的操作（搜索/详情/导出）正常用
- **保护数据**：账号 `admin` / `operator` / `mengbotian` 不能动；原有真实业务数据不能改

**表单校验专项：**
- 每个新增/编辑弹窗都试一次"什么都不填直接提交" → **必须截图报错**
- 有特殊格式的字段（邮箱、手机号、地址哈希）→ 试一次非法格式 → **必须截图报错**

**截图原则（省 token 关键）：**
- 普通页面打开 → **不截**
- 这些情况**必须截**：
  - 表单校验报错
  - 错误提示弹窗
  - 详情页关键字段（信息密度高）
  - 报告里要附的证据

### Step 4 — 发现 bug 自动修复

测试中如果发现 bug：
1. 根据现象定位代码（用 Grep / Read 找）
2. 能直接修就改代码，修完**重新测一遍这个功能**确认通过
3. 不确定怎么改 / 涉及业务逻辑 → **停下问用户**
4. 已知问题不能绕过，必须记录到报告

### Step 5 — 清理

测试结束前：
- 删除所有 `test_` 和 `0xCLAUDE` 开头的数据
- 如果某种数据不支持删除，备注里追加 `[已废弃]` 标记

### Step 6 — 生成报告

保存到 `<工程目录>/docs/test-report-<YYYY-MM-DD-HHmm>.md`

报告结构：

```markdown
# UI 测试报告

- 工程：<工程目录>
- 时间：<开始时间> → <结束时间>
- 范围：<测了哪些页面>
- 总览：✅ X 项通过 / ❌ Y 项失败 / 🔧 Z 项已修复

---

## <页面名 1>

| 功能 | 结果 | 备注 |
|------|------|------|
| 新增 | ✅ | — |
| 编辑 | ❌ → 🔧 已修复 | 见下方问题 #1 |
| 搜索 | ✅ | — |
| ... |

### 问题 #1: <简短标题>
- 现象：<描述>
- 截图：<相对路径>
- 定位：`src/features/xxx/yyy.tsx:42`
- 修复：<改动说明>

---

## <页面名 2>
...

---

## 总结
- 总测试项数：N
- 通过：X
- 失败未修：Y
- 已修复：Z
- 建议后续关注：<可选>
```

## 重要原则

1. **全程不汇报中间状态** —— 不列举按钮、不说"我现在要点 XX"、不问"要不要继续"。用户只看最终报告。
2. **失败就修，不绕过** —— 遇到 bug 直接定位+修复+重测，不要跳过。
3. **保护数据** —— admin、operator、mengbotian 和所有原有真实数据绝对不能改。
4. **节省 token** —— 普通页面打开不截图；用 `browser_snapshot` 的 yaml 操作，不要每步都截图。
5. **报告即交付** —— 用户拿到报告就能验收，不需要回看对话历史。

## 调用示例

用户输入：
```
请按 ui-test 测试 E:\华能\devops\devops-react 的全部功能
```

或：
```
按 ui-test 测一下 E:\华能\devops 的链账户白名单页面
```

或简化：
```
/ui-test 工程：E:\华能\devops\devops-react
```

任何一种我都能理解 → 直接开始执行 Step 1。
