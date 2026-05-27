# vue-dev-standards

Vue 3 中后台门户工程前端开发标准，集中维护 Claude Code 和 Codex CLI 的 skill。

克隆一次 + 跑一次配置脚本，之后 `git pull` 即可同步所有 skill 更新，无需重建链接。

---

## 当前 skill 清单

| Skill | 触发方式 | 说明 |
|---|---|---|
| `vue-scaffold-app` | `/vue-scaffold-app` | 从 0 到 1 搭建 Vue 3 + TS + Vite 中后台门户工程 |
| `vue-scaffold-module` | `/vue-scaffold-module` | 在已有工程内添加业务模块（列表 / 弹窗 / 详情四件套） |
| `vue-scaffold-component` | `/vue-scaffold-component` | 封装业务级自动加载组件（远程下拉 / 状态选择器等） |
| `daily-work-report` | `/daily-work-report` | 生成和维护中文日报、周报与日报缓存 |
| `ui-test` | `/ui-test` | 对前端工程做 UI 自动化测试，覆盖所有按钮、表单、校验 |

---

## 配置步骤

### 第一步：克隆仓库

选择一个固定路径存放，**配置完成后不要移动**（junction / symlink 指向绝对路径）。

```
# Windows（推荐路径）
git clone https://github.com/Hollelihanqi/vue-dev-standards.git E:\Dr\dev-standards

# Mac / Linux（推荐路径）
git clone https://github.com/Hollelihanqi/vue-dev-standards.git ~/dev-standards
```

### 第二步：根据你使用的工具运行配置脚本

#### Windows（PowerShell）

```powershell
# 进入仓库
cd E:\Dr\dev-standards

# 只配置 Claude Code
.\scripts\setup.ps1 -Claude

# 只配置 Codex CLI
.\scripts\setup.ps1 -Codex

# 两个都配置
.\scripts\setup.ps1 -Claude -Codex
```

> 脚本使用 `mklink /J`（Junction）创建链接，**无需管理员权限**，也无需开启开发者模式。

#### Mac / Linux（Terminal）

```bash
# 进入仓库
cd ~/dev-standards

# 赋予脚本执行权限（首次）
chmod +x scripts/setup.sh

# 只配置 Claude Code
./scripts/setup.sh --claude

# 只配置 Codex CLI
./scripts/setup.sh --codex

# 两个都配置
./scripts/setup.sh --claude --codex
```

### 第三步：验证

**Claude Code**：在任意项目目录打开 Claude Code，输入 `/vue-scaffold-app`，能识别并触发 ✅

**Codex CLI**：在任意项目目录输入 `/vue-scaffold-app`，能识别并触发 ✅

---

## 更新 skill

```bash
cd E:\Dr\dev-standards   # 或 ~/dev-standards
git pull
```

链接建立后永久生效，**更新不需要重建链接**。两个工具立即读到新版。

---

## 工具兼容说明

每个 skill 只维护一份 `SKILL.md`，两套工具都能识别：

| frontmatter 字段 | Claude Code | Codex CLI |
|---|---|---|
| `name` | ✅ 读取 | ✅ 读取 |
| `description` | ✅ 读取 | ✅ 读取 |
| `user-invocable` | ✅ 读取 | — 忽略 |
| `allowed-tools` | ✅ 读取 | — 忽略 |
| `agents/openai.yaml` | — 忽略 | ✅ 读取（模型配置） |

Codex 专属的 `agents/openai.yaml` 放在 skill 目录内，Claude Code 不会读取；Claude Code 专属的 `allowed-tools` Codex 不会识别。两套工具共用同一份文件，互不干扰。

---

## 链接原理

```
~/.claude/skills/vue-scaffold-app   ──junction──▶  E:\Dr\dev-standards\skills\vue-scaffold-app
~/.claude/skills/vue-scaffold-module ──junction──▶  E:\Dr\dev-standards\skills\vue-scaffold-module
...（共 5 条）

~/.codex/skills/vue-scaffold-app   ──junction──▶  E:\Dr\dev-standards\skills\vue-scaffold-app
~/.codex/skills/vue-scaffold-module ──junction──▶  E:\Dr\dev-standards\skills\vue-scaffold-module
...（共 5 条）
```

Junction / symlink 对工具透明，工具读取 skills 目录时看到的与普通目录无异。`git pull` 更新仓库内容后，链接自动指向最新版，无需任何额外操作。

---

## 配置组合速查

| 平台 | Claude Code | Codex CLI |
|---|---|---|
| **Windows** | `.\scripts\setup.ps1 -Claude` | `.\scripts\setup.ps1 -Codex` |
| **Mac / Linux** | `./scripts/setup.sh --claude` | `./scripts/setup.sh --codex` |

谁需要哪个工具就配哪个，两个都用就两个都配，互不影响。

---

## 添加新 skill

1. 在 `skills/` 下新建目录，写 `SKILL.md`（参考现有 skill 格式）
2. 本地重新跑 setup 脚本（会自动为新 skill 建链接）
3. 提交推送：`git add . && git commit -m "feat: add xxx skill" && git push`
4. 其他人 `git pull` 后跑一次 setup 脚本即可

---

## 注意事项

- **不要移动仓库目录**——Junction / symlink 使用绝对路径，移动后需重新建链接
- **Windows 使用原生 PowerShell**——Git Bash 的 `ln -s` 在 Windows 上可能创建假链接，请用 `setup.ps1`
- **Mac 的 `ln -s` 参数顺序**——第一个参数是真身（target），第二个是门牌（link），脚本已处理，手动创建时注意不要搞反
