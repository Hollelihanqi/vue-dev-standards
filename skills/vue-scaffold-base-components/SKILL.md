---
name: vue-scaffold-base-components
description: 把 vue-scaffold-app 规范要求的 6 个基础组件（pro-table / search-form / remote-search / sticky-container / text-ellipsis / table）一次性拷进目标工程的 src/components/，并附带 search-form 依赖的 resize-element directive。当用户说"安装基础组件"、"拉一下 pro-table"、"我没有内部组件包"、"给我 6 个基础组件"、"按规范装基础组件"、"新工程加 pro-table"等时使用。供没有内部 npm 组件包的项目作为过渡方案，让 vue-scaffold-app 流程 Step 7 不卡壳。
user-invocable: true
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# vue-scaffold-base-components — 基础组件源码分发

把 6 个基础组件 + 1 个配套 directive 的源码一次性拷进目标工程。这是 `vue-scaffold-app` Step 7 在**没有内部 npm 组件包**时的过渡方案——目标是让用户立刻能用 `<pro-table />` / `<search-form />` 等，不卡在"找不到组件源码"。

## 何时使用本 skill

- 用户跑完 `vue-scaffold-app` 主流程，走到 Step 7"获取基础组件"
- 用户公司没有内部 npm 包（`@<your-org>/vue-components` 这类）
- 用户明确说"安装基础组件"、"拉 pro-table"、"我没有内部组件包"

不要在以下场景使用：
- 用户已有内部 npm 包 → 走 `vue-scaffold-app` Step 7 选项 1
- 用户工程已经有这 6 个组件 → 不要重复覆盖（执行前先检查）

## 本 skill 交付清单

```
目标工程/src/
├── components/
│   ├── pro-table/          # ProTable.vue + use-table.ts
│   ├── search-form/        # tsx + scss + Grid + SearchFormItem
│   ├── remote-search/      # tsx + scss
│   ├── sticky-container/   # tsx + scss
│   ├── text-ellipsis/      # tsx + scss
│   └── table/              # vue + ts + scss + TableColumn
└── directives/
    └── resize-element/     # search-form 用到，必带
```

总计 36 个文件。

## 执行流程

### Step 1 — 检查目标工程位置

确认当前工作目录是 Vue 工程根（含 `package.json` 且 `package.json` 里有 `vue` 依赖）。如果不是，向用户确认："是要安装到 `<cwd>` 这个工程吗？"

### Step 2 — 检查是否会覆盖

```bash
ls src/components/{pro-table,search-form,remote-search,sticky-container,text-ellipsis,table} 2>/dev/null
ls src/directives/resize-element 2>/dev/null
```

任一存在 → 列出已存在的项，**询问用户**是覆盖还是跳过。**不要静默覆盖**——可能丢失用户的本地改动。

### Step 3 — 复制源码

```bash
SKILL_DIR="$HOME/.claude/skills/vue-scaffold-base-components"
mkdir -p src/components src/directives
cp -r "$SKILL_DIR/references/components/." src/components/
cp -r "$SKILL_DIR/references/directives/resize-element" src/directives/
```

> **路径解析**：本 skill 通过 junction / symlink 安装到 `~/.claude/skills/vue-scaffold-base-components/`，`references/` 在 skill 根目录下。Windows 用户用 git-bash 时 `$HOME` 自动展开为 `C:/Users/<name>`，junction 会被透明跟随。

### Step 4 — 校验 vite.config.ts 配置

读 `vite.config.ts`，检查是否已注册 `AppComponentsResolver`：

```ts
import Components from 'unplugin-vue-components/vite'
import { AppComponentsResolver } from '@rdeam/vue-components-resolver'

Components({
  resolvers: [AppComponentsResolver()],   // ← 默认扫 src/components/ 顶层
})
```

- ✅ 已配置 → 通过
- ❌ 未配置 → **不要自动改 `vite.config.ts`**，提示用户照 `vue-scaffold-app/references/config-files.md` 补全配置
- ⚠️ 配置了但 `from: '@xxx/vue-components'`（指向 npm 包）→ 提示用户改回默认（去掉 `from` 参数），让 resolver 扫本地 `src/components/`

### Step 5 — 校验 peer 依赖

检查 `package.json` 的 `dependencies` 是否齐这些（基础组件的运行时依赖）：

| 包 | 用途 |
|---|---|
| `vue` | 框架 |
| `element-plus` | UI |
| `@element-plus/icons-vue` | 图标 |
| `@vueuse/core` | text-ellipsis / table 用 |
| `unplugin-vue-components` | resolver 宿主 |
| `@rdeam/vue-components-resolver` | AppComponentsResolver |

缺哪个就列出，让用户跑 `pnpm add <pkg>`。**不要自动 install**——可能影响 lockfile，需要用户决定包管理器（pnpm / npm / yarn）。

### Step 6 — 总结回执

在 chat 里给：

```
✅ 基础组件安装完成

复制：
- src/components/  ← 6 个组件（35 文件）
- src/directives/resize-element/  ← 1 个文件

后续动作：
- [ ] vite.config.ts 已配 AppComponentsResolver（已校验 / 待补全）
- [ ] peer 依赖齐全（已校验 / 缺：xxx, yyy）
- [ ] 运行 pnpm install && pnpm dev，在 template 直接试 <pro-table />
```

## 已知限制

- **此为过渡方案**：6 个组件源码进了用户工程，未来组件升级要手动覆盖（或重跑本 skill 选"覆盖"）。最终目标仍是公司内部 npm 包。
- **不维护版本号**：本 skill 提供"快照版"组件。当前快照来自 `vue-dev-standards` 仓库的最新 commit，没有独立版本号；要追踪版本就 `git -C <repo> log skills/vue-scaffold-base-components/references/`。
- **依赖 `@/utils/request`**：`remote-search` import 了 `@/utils/request`——这是 `vue-scaffold-app` Step 4 规定每个工程都要有的，所以默认应存在。若不存在，先跑 vue-scaffold-app 主流程的 Step 4。
- **不动 router / store / Layout**：本 skill 只装"组件文件 + directive"，不修改任何其它文件。

## 与其它 skill 的协作

| skill | 关系 |
|---|---|
| `vue-scaffold-app` | 主流程 Step 7 调起本 skill；本 skill 假设 Step 4（utils/request）已完成 |
| `vue-scaffold-module` | 业务模块用到的 `<pro-table />` / `<search-form />` 由本 skill 提供 |
| `vue-scaffold-component` | 在 `custom-components/` 里二次封装时，会 import 本 skill 提供的 `remote-search` |
| `vue-scaffold-review` | 审查不检查本 skill 复制进来的组件代码本身，只查业务层使用是否符合规范 |

## FAQ

**Q：复制进来的组件能改吗？**
A：技术上能，但不建议——下次重跑本 skill 选"覆盖"就丢了。如果要项目特化，建议在 `custom-components/` 包一层。

**Q：能不能只装其中几个？**
A：不行。6 个组件互相依赖（`ProTable` import `SearchForm` 和 `Table`；`SearchForm` import `RemoteSearch`），全装是最简单的方案。

**Q：如何升级到新版本？**
A：`cd <vue-dev-standards 仓库> && git pull`，然后重跑 `/vue-scaffold-base-components`，选"覆盖"。

**Q：什么时候迁到内部 npm 包？**
A：当公司基础组件团队成型、有人愿意承接维护时。届时把 `src/components/` 下的 6 个目录删掉，改装 npm 包 + 调整 resolver 配置即可（删除已被 npm 包替代的本地组件）。
