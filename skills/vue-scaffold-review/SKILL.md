---
name: vue-scaffold-review
description: 按 vue-scaffold-app 规范对 Vue 3 中后台工程做合规审查。当用户说"审查项目规范"、"按规范审一下代码"、"检查这个工程是否符合规范"、"审一下 xx 模块"、"vue 规范合规检查"、"扫一下违规"、"按本套标准审一下"等时使用。默认审 src/ 全量代码（不挂钩 git 分支），输出按严重程度分组的违规清单 + file:line + 规则引用 + 修复建议，写入工程 docs/code-review/ 目录。**只读不写**：本 skill 不修改任何业务代码，仅生成报告。
user-invocable: true
allowed-tools:
  - Bash
  - Read
  - Write
  - Glob
  - Grep
---

# vue-scaffold-review — Vue 工程规范合规审查

按 `vue-scaffold-app` 主 skill 定义的规范，扫描目标工程的代码，给出按严重程度分组的违规清单。本 skill **只读不写**——不会修改任何业务代码，只生成一份报告交给你看。修复永远由人决定。

## 何时使用本 skill

用户要求按规范审查工程代码时使用——"审查项目规范"、"按规范审一下"、"扫一下违规"、"检查合规"、"按本套标准检查"等。

本 skill 的唯一目的就是回答"当前代码符不符合 vue-scaffold-app 规范"这一个问题——无任何场景化约束。

## 设计原则

### 1. 规范来源单一：永远读规范 skill 本身

本 skill **不复制任何规则**。每次执行先 Read `<本仓库>/skills/vue-scaffold-app/SKILL.md` 与其 `references/*.md`（`R1`–`R14`、`A1`–`A14`、`S-*`），再 Read `<本仓库>/skills/vue-scaffold-module/SKILL.md`（`M1`–`M16`，模块内部结构规则）与 `<本仓库>/skills/vue-scaffold-layout/SKILL.md`（`L1`–`L8`），从中提取编号的当前定义。

规范文档改了，本 skill 自动跟着改，**零同步成本**。

### 2. 只读：不修改业务代码

本 skill 不提供 `--fix` 选项。生成的报告里**只描述**违规与建议，**不动**用户代码。修复必须由人决定（哪些该改、改成什么、什么时候改）。

写文件**仅限**目标工程的 `docs/code-review/<timestamp>.md` 报告本身。

### 3. 三层检测分层

| 层 | 检测手段 | 适用规则 |
|---|---|---|
| 第一层 | 机械 grep | A1–A14 反模式（正则一打就中） |
| 第二层 | Glob + 文件名比对 | S-* 与 M14 / M15 等结构 / 命名规则 |
| 第三层 | Read + 语义判断 | R1–R14、M12 / M16 等需要理解上下文的硬规则 |

不同层用不同手段，**别一把梭**。第一层 1 秒出结果，第三层最慢但价值最高（linter 干不了）。

## 输入识别

| 模式 | 触发 | 范围 |
|---|---|---|
| **默认（全量）** | 不传额外参数 | 扫 `src/` 全部 |
| **指定路径** | "审 src/views/role/" | 仅扫该路径下 `.vue` / `.ts` / `.tsx` |
| **仅报告位置** | `--report-only` | 报告生成后不在 chat 里完整展示，只回报告路径 |

默认全量扫描 `src/`——**规范审查的语义是"当前代码合不合规"，与 git 状态完全无关**。不调用任何 git 命令，不依赖 main / master / develop 等任何分支名，工程是不是 git 仓库都能跑。

用户传了路径就只扫该路径，否则一律全量。没有其它分支条件、没有场景化默认。

## 执行流程

### Step 1 — 读规范源

```
读取顺序：
1. <本仓库>/skills/vue-scaffold-app/SKILL.md
2. <本仓库>/skills/vue-scaffold-app/references/config-files.md
3. <本仓库>/skills/vue-scaffold-app/references/core-utils.md
4. <本仓库>/skills/vue-scaffold-app/references/router-store.md
5. <本仓库>/skills/vue-scaffold-app/references/layout-and-system-views.md
6. <本仓库>/skills/vue-scaffold-module/SKILL.md   ← 模块结构规则 M1–M16 的权威来源
7. <本仓库>/skills/vue-scaffold-layout/SKILL.md   ← 布局与高度契约规则 L1–L8 的权威来源
```

从中提取：
- R1–R14 的最新文字
- A1–A14 的最新文字
- S-* 的最新文字与所在锚点的具体约束
- M1–M16 的最新文字（来自 `vue-scaffold-module`）
- L1–L8 的最新文字（来自 `vue-scaffold-layout`）

> **本仓库路径解析**：本 skill 文件实际通过 junction / symlink 安装到 `~/.claude/skills/`，要找到原仓库可以：
> 1. 优先看用户在对话中给过的仓库路径
> 2. 否则尝试 `~/vue-dev-standards/` 与 Windows 上的 `E:/Dr/vue-dev-standards/`（默认推荐路径，README 有写）
> 3. 都没有就明确询问用户仓库在哪

### Step 2 — 圈定审查范围

根据"输入识别"分支：

- **默认（全量）**：`Glob` 命中 `src/**/*.{vue,ts,tsx}`，排除：
  - `node_modules/` / `dist/`
  - `src/types/`（自动生成的 d.ts）
  - `src/components/` / `src/custom-components/`（基础组件与业务封装组件，不纳入审查）
  - `src/assets/`（静态资源）
- **指定路径**：`Glob` 命中 `<path>/**/*.{vue,ts,tsx}`，同样应用上面的排除规则

> 因 `components` / `custom-components` 不扫描，R6（组件归属）不在本 skill 检查范围。

把命中文件列出来（chat 里显示数量与示例 3–5 个文件名，避免刷屏）。**不调用任何 git 命令**——不读 HEAD、不比 diff、不依赖分支。

### Step 3 — 第一层：机械 grep（A1–A14）

按 `references/grep-patterns.md` 的清单逐条跑 `Grep`。每条规则带：
- 正则
- 排除条件（哪些文件 / 哪些目录不算违规）
- 期望命中数（0 = 合规）

实操：把所有 A* 规则的 Grep 调用**并行发**（同一条消息里多个 Grep tool call），一次拿全部命中。

### Step 4 — 第二层：结构 / 命名（S-* 与 M14 / M15）

按 `references/semantic-checks.md` 中"结构层"一节：

- `[S-utils-naming]` — `Glob src/utils/*.ts`，对照白名单 `[request, crypto, format, regx, file]`，命中其他名字（尤其 `common.ts` / `helpers.ts` / `rules.ts` / `regex.ts`）即违规
- `[S-utils-barrel]` — 检查 `src/utils/index.ts` 是否存在
- `[S-views-root]` — `Glob src/views/*.ts`，命中即违规
- `[S-module-quartet]` — 每个 `src/views/<m>/`，检查是否齐 `api.ts` + `constants.tsx` + `use<M>.ts` + `<M>List.vue`（缺则告警，但允许 `<m>` 是分组目录，需结合是否存在 `<X>List.vue` 判断）
- `[S-menu-dir-namespace]` — `Glob src/views/**/*-api.ts` / `**/*-constants.tsx`（带实体前缀的模块文件）命中即违规；或一个目录里出现 ≥2 套互不相干的页面 `.vue`（如 `<二级A>List.vue` + `<二级B>List.vue`）→ 目录塞了多个菜单，应拆成 `views/<父>-<子>/` 平铺目录、文件去前缀
- `[S-system-views-split]` — `Glob src/system-views/`，未存在告警；登录 / 注册 / 重置密码在 `views/` 下而非 `system-views/` 也告警
- `[M14]` — `Glob src/views/**/use*Dialog.ts` / `use*Drawer.ts` / `use*Modal.ts` / `use*Popover.ts`，命中即违规；同一菜单目录里 `use*.ts` 多于一个（`use<Menu>Detail.ts` / `use<Menu>Form.ts` 路由页例外）也告警
- `[M15]` — `Glob src/views/**/*Dialog.vue` / `*Drawer.vue` / `*Modal.vue`，命中即违规（文件名带组件形态后缀）

### Step 5 — 第三层：语义判断（R1–R14 与 M12 / M16）

按 `references/semantic-checks.md` 中"语义层"一节：

逐条 Read 命中文件，按规则定义判断。重点：
- **R2** 行数：解析 `.vue` 文件的 `<script setup>` 段，计算非空非注释行数，超 50 即违规
- **R2** composable 拆分：检查 `views/<m>/` 是否存在 `use<M>.ts`；不存在但 `<M>List.vue` 有 >30 行业务逻辑即违规
- **R7** UnoCSS 优先：Read `.vue` 的 `<style scoped>`，统计行数与是否在做"可用原子类替代"的事
- **R10** 错误已 toast：Grep `catch.*ElMessage\.error` 找疑似双重 toast，再 Read 上下文确认
- **M12** 弹层挂 view-w 同级：Read 各 `<X>List.vue` 模板，弹层组件嵌在根 `view-w` div 内部即违规
- **M16** 弹层动态引入：列表页 `<script setup>` 里静态 `import Xxx from './Xxx.vue'` 的，Read 确认该组件是弹层（v-model visible 用法）→ 违规；详情装配页静态引入内容模块组件不算

这一层执行慢，给用户进度反馈（"读 12/47 个文件..."）。

### Step 5.5 — 布局合规（L1–L8，来自 `vue-scaffold-layout`）

L1–L8 多数可机械 grep，少数需 Read 判断。按下表执行（具体文字以 `vue-scaffold-layout/SKILL.md` 为准）：

| 规则 | 检测手段 | 命中即违规的信号 |
|---|---|---|
| `[L1]` layout-main padding | Read `src/layout/Main.vue` | `layout-main` 那行不是 `flex-1 overflow-hidden p-4 md:px-5` |
| `[L2]` 禁止溢出 / sticky 慎用 | Grep `overflow-auto\|overflow-y-scroll`（限 `src/layout/Main.vue` 与各 `views/**/*.vue` 根节点）；Grep `StickyContainer\|sticky-container`（用量统计） | Main.vue 出现 `overflow-auto`；或 view 根节点直接挂 `overflow-auto/scroll` 凑合滚动；或 `sticky-container` 被大面积套用（逐个 Read 确认是否真有超长内容，疑似滥用则 🟢 提示） |
| `[L3]` 不准半截 | Read `views/**/*.vue` 根节点 | 详情/表单页根节点既无 `pro-table`、又无 `bg-white`/`page-fill-card`，且无 `h-full`（灰底会透出来） |
| `[L4]` 菜单收起态 | Read `src/layout/TheSidebar.vue`（不存在则 `Layout.vue`） | 无展开/收起两态，或收起态不是 `w-16`（只剩图标）；展开宽度不限具体值，不命中 |
| `[L5]` 操作列用 width | Grep `label: ['\"]操作` 定位 `constants.tsx`，Read 该列 | 操作列（`fixed: 'right'`）用了 `minWidth` 而非 `width` |
| `[L6]` view 根节点挂 view-w | Glob `src/views/**/*.vue`（独立路由页），Read 根节点首个 `<div>` | 根节点缺 `view-w`，或用自定义 class 替代 |
| `[L7]` 菜单由路由派生 | Read `src/layout/TheMenu.vue` 与 `useLayout.ts` | TheMenu 写死菜单数组（对象字面量 title/path）/ 不渲染 `TheMenuItem`；或 `useLayout` 把原始路由直接返回、未经派生函数处理（标准名 `buildMenuTree`，叫别的名字但做同样的事不算违规） |
| `[L8]` 外壳组件职责边界 | Read `src/layout/Layout.vue` 与 `TheSidebar.vue` / `TheMenu.vue` | `Layout.vue` 模板出现 `aside` 外壳 / 品牌 / 页脚等内部 DOM（应只装配区域组件）；或 `TheMenu` 里塞了品牌 / 页脚 |

`[L6]` 注意排除：非路由页的纯子组件（dialog / 局部片段）不要求挂 `view-w`——只查挂到 router 的 list/detail/表单主页面。

### Step 6 — 汇总报告

按 `references/report-template.md` 渲染。报告写到目标工程：

```
<目标工程>/docs/code-review/<yyyy-MM-dd-HHmm>.md
```

不存在则创建目录。**不**污染工程根。

报告中每条违规固定四要素：
1. **位置**：`file:line`
2. **违规内容**：原文片段
3. **规则引用**：`[R3]` / `[A5]` / `[S-utils-naming]`，并在报告底部给一份"规则速查表"列出每个引用的完整文字（避免读者跳到原 SKILL.md）
4. **修复建议**：自然语言描述，不写代码

报告头部摘要：
- 🔴 严重数 / 🟡 警告数 / 🟢 建议数
- 合规率：(总规则数 - 违规规则数) / 总规则数

### Step 7 — 退出

- 🔴 数 = 0 → chat 里回 "合规通过 ✅" + 报告路径
- 🔴 数 > 0 → chat 里给摘要 + 报告路径 + 提示"违规需人工修复"
- `--report-only` 模式只回路径，不展示摘要

**禁止**：不要在 chat 里把整份报告复制贴出来，会把对话刷爆——给路径即可。

## 严重程度分级

| 级别 | 含义 | 包含规则 |
|---|---|---|
| 🔴 严重 | 反模式 / 不可违背 | A1–A12、R1 / R3 / R4 / R5 / R9 / R10 / R11、`[S-utils-barrel]`、`[S-views-root]`、`[M14]`（composable 形态后缀命名）、`[L2]`（Main.vue 改 overflow-auto）、`[L6]` |
| 🟡 警告 | 结构 / 命名 / 强建议 | A13 / A14、R2 / R8 / R13 / R14、`[S-utils-naming]`、`[S-module-quartet]`、`[S-menu-dir-namespace]`、`[S-system-views-split]`、`[M12]` / `[M15]` / `[M16]`、`[L1]` / `[L3]` / `[L4]` / `[L5]` / `[L7]` / `[L8]` |
| 🟢 建议 | 风格 / 取舍 | R7、R12、`[L2]`（sticky-container 疑似滥用） |

> M1–M11 / M13 与 R/A/S/L 系列存在交叠（如 M7≈R3、M8≈R8、M11≈L6、M13≈R7），报告中**优先引用 R/A/S/L 编号**，M 编号只用于上面列出的模块专属规则（M12 / M14 / M15 / M16），避免同一违规挂两个编号。

`R12`（KeepAlive 策略）规范本身说"不强制"，所以本 skill 永远归类为 🟢，且只在用户**两种策略混用**时才告警。

## 输出位置

```
<目标工程>/docs/code-review/<yyyy-MM-dd-HHmm>.md
```

- 时间戳精确到分钟，便于多次审查归档对比
- 默认创建 `docs/code-review/.gitkeep` 让目录可入 git
- 报告本身**不强制入 git**，由用户决定（建议入 git 便于回溯，但不动 `.gitignore`）

## 与其它 skill 的协作

| 配合方 | 协作方式 |
|---|---|
| `vue-scaffold-module` | 它生成完模块后，用户可直接 `/vue-scaffold-review src/views/<new-module>/` 验收 |
| `vue-scaffold-component` | 同上，验收 `src/custom-components/<NewComp>.tsx` |
| `vue-scaffold-app` | 主规范文档，本 skill 完全依赖它定义 R/A/S 编号 |
| 内置 `/code-review` | 跑完合规审查后建议用户再跑通用 review 找正确性 bug，两者互补 |
| `ui-test` | 合规 ≠ 功能正确，建议两个都跑 |

## 引用文件

详细检测规则与报告骨架：
- `references/grep-patterns.md` — 第一层 A1–A14 的全部 grep 规则
- `references/semantic-checks.md` — 第二层 S-* / M14 / M15 与第三层 R1–R14 / M12 / M16 的判断框架
- `references/report-template.md` — 报告 markdown 骨架

执行时按需打开对应 reference。

## 退出标准（用于 CI 接入）

虽然本 skill 不直接产生退出码，但报告头部固定写入：

```
合规结论: PASS | FAIL
```

`FAIL` 当且仅当 🔴 严重数 > 0。CI 脚本可 `grep "^合规结论: PASS"` 报告文件来判断。
