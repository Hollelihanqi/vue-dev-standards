---
name: vue-scaffold-module
description: 在已有 Vue 3 + TS 中后台工程内，按 vue-scaffold-app 规范添加一个新的业务模块（列表 + 详情 + 弹窗）。当用户说"加一个 xx 列表页"、"在项目里新增 xx 模块"、"按模板加 xx 业务页"、"按本套规范加 xx 管理页"、"新增一个 crud 页面"等时使用。生成模块四件套（api.ts / constants.tsx / use<Module>.ts / <Module>List.vue），自动接入 router、列表页复用 <hd-pro-table>，业务码统一走 axios 拦截器。
user-invocable: true
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# vue-scaffold-module — 业务模块四件套生成器

按 `vue-scaffold-app` 主 skill 规定的工程规范，在 `src/views/<module>/` 下生成一个完整业务模块。可被主 skill 调度，也可独立触发。

## 设计哲学：主业务 vs 子业务分层

业务模块由 **"列表（主业务）"** 和 **"创建 / 编辑 / 详情等操作（子业务）"** 两层组成。它们之间的协同**必须层级分明**——否则 composable 会变成大杂烩、view 文件会膨胀成 200 行怪物、每一次维护都要从头读起。

**不是要求把所有东西都拆**。是要求识别"哪些是大的层级边界"，在边界上做职责切分；边界内部保持简单。

### 🛑 一个菜单一个主 composable —— 这是最容易被违反的底线

**默认情况下，一个菜单目录（`src/views/<menu>/`）下只有 ONE 个主 composable 文件**：`use<Menu>.ts`，导出 `use<Menu>()`。它承载列表页的所有顶层交互（搜索、分页、行操作编排、所有弹层 / 抽屉的 visibility 与 submit handler）。

- ✅ **绝大多数模块就一个 composable 文件，到此为止。**
- ✅ 唯一允许的额外 composable：**独立路由的页面**——详情页出现复杂操作流（审批流 / 多阶段编辑 / 多 tab 状态同步等）时追加 `use<Menu>Detail.ts`，独立路由的表单页追加 `use<Menu>Form.ts`。**仅路由页例外**，且应是少数。
- ❌ **每个 `.vue` 文件配一个 composable —— 错。** Dialog / Drawer / Form 子组件 **不允许** 有伴生 composable。它们的状态自己持有（见下"分层契约"和"Dialog 自包含"）。
- ❌ **看到 `useXxxDialog.ts` / `useXxxDrawer.ts` / `useXxxModal.ts` / `useXxxForm.ts`（除非 Form 是独立路由页）—— 这就是反模式本身，名字一出现就错了**。

> 命名是个硬信号：composable 名称 **绝不能跟某个具体组件挂钩**。`useEnergyRecharge` 可以（按业务命名），`useEnergyRechargeDialog` 不可以（按组件命名 = 状态散落到 Dialog 之外）。
>
> 文件命名规则补强：composable 文件名以 **业务 / 菜单 / 视图** 命名，不以 **组件形态** 命名。出现 `Dialog` / `Drawer` / `Modal` / `Popover` 这类组件形态词作为 composable 文件名后缀，**直接判错**，回去把状态搬回组件内部。

### 分层契约

| 层                                                                                                         | 持有的状态                                                   | 持有的逻辑                                                                  |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------- |
| **主业务 composable**<br>`use<Menu>`（一个菜单一个）                                                       | 列表数据 / 分页 / 查询 / 子操作的 visibility / 当前编辑行 id | 调 API + 刷列表 + 业务编排（决定调 create 还是 update、成功后是否 refresh） |
| **子业务组件**<br>`<EntityName>Edit.vue` / `<EntityName>Detail.vue` 等<br>(弹框 / 抽屉文件名不带 `Dialog` / `Drawer` 后缀)<br>**🚫 没有伴生 composable** | 表单 formModel / submitting / formRef / rules / validators   | 表单校验 / UI 状态自管 / 通过 `props.onSubmit` 把 payload 抛给父端          |

**主业务 composable 不知道**：

- 表单字段长什么样、有什么校验规则
- 弹窗的尺寸 / 标题 / 按钮文案
- 校验器（`integerValidator` 之类）的实现细节

**子业务组件不知道**：

- 提交后调的是哪个接口（create 还是 update）
- 提交后是否需要刷新列表
- 当前登录用户是谁、要不要带 operator 字段

### 子业务组件的标准协作：props 传 async 函数

Dialog 通过 `onSubmit` 函数 prop 接收父端提交逻辑，自己 `await` 调用并用 `try/finally` 管理 submitting 状态：

```ts
// Dialog
const visible = defineModel<boolean>({ default: false });
const props = defineProps<{
  // ...其它 props，如 userId / roleId
  onSubmit: (payload: PayloadType) => Promise<void>;
}>();

const submitting = ref(false);

const handleSubmit = async () => {
  if (submitting.value) return;
  await formRef.value?.validate();
  submitting.value = true;
  try {
    await props.onSubmit(buildPayload());
    visible.value = false;
  } catch {
    // 失败时保持打开，错误已由 axios 拦截器 toast，用户改字段后可重试
  } finally {
    submitting.value = false; // ✅ 一定执行，永远不会卡 loading
  }
};
```

```ts
// 父端列表 composable
const handleEditSubmit = async (payload: PayloadType) => {
  if (currentId.value) {
    await api.updateItem({ ...payload, id: currentId.value });
  } else {
    await api.createItem(payload);
  }
  ElMessage.success("保存成功");
  refresh();
};
```

```vue
<!-- 父端模板 -->
<XxxEdit
  v-model="editVisible"
  :id="currentId"
  :on-submit="handleEditSubmit"
/>
```

### 什么时候 NOT 应用这个模式（同样重要）

- **简单确认框**（`ElMessageBox.confirm` 删除提示）：直接在 composable 里调，不拆
- **整页表单**（非弹窗）：直接在 view 里写或抽 composable，没有 Dialog 边界
- **不复用、不到 20 行的内嵌弹窗**：保持内嵌

**判断标准**：当一个 Dialog 同时承担"UI 自己的状态"**和**"业务调用 / 列表协同"两类不同关注点时，就该拆；否则保持简单。

## 何时使用

- 用户说 "在 xx 项目里加一个角色管理模块"
- 用户说 "新增一个 xx 列表页 / xx 管理页 / xx CRUD 页"
- 主 skill `vue-scaffold-app` Step 8（添加第一个业务模块）调用本 skill

## 前置假设（不满足时报错）

调用本 skill 前，目标项目应当已经具备：

1. `@rdeam/hd-ui` 已接入；没接先跑 `/vue-scaffold-hd-ui`
2. `src/utils/request.ts` 拦截器收口（业务层 await 直接拿数据）
3. `src/router/index.ts` 用 Layout 包业务页

如果上述任一不满足，提示用户先按 `vue-scaffold-app` 主 skill 完成基础设施搭建。

> **顺手同步 CLAUDE.md**：进入本 skill 时若项目根没有 `CLAUDE.md`（或不是 `<!-- vue-dev-standards:project-claude -->` 标记的版本），按 `vue-scaffold-app` 的 Step 0 规则从 `vue-scaffold-app/references/project-CLAUDE.template.md` 补齐常驻规范，再继续生成模块。

> **分页参数 / 返回结构按各项目后端约定来**——脚手架不预置 `createPagePayload` / `pickPageResult`。本 skill 生成 `api.ts` 时如果项目里已经有同类封装就复用；没有就在该模块的 `api.ts` 里直接组装 payload、直接 pick `{ items, total }`，等项目里出现 2–3 个稳定用法再考虑下沉到 `utils/` 下按职责命名的文件（如 `utils/pagination.ts`）——**不要用泛名 `common.ts` / `helpers.ts`**（见 vue-scaffold-app `[S-utils-naming]`）。

## 输入参数

调用时尽量从用户描述里抽取以下信息；缺失则向用户提问（AskUserQuestion）：

| 参数           | 含义                                 | 示例                                  |
| -------------- | ------------------------------------ | ------------------------------------- |
| `moduleName`   | 模块名（kebab-case）                 | `role-management`                     |
| `entityName`   | 业务实体名（PascalCase）             | `Role`                                |
| `displayName`  | 中文菜单名                           | "角色管理"                            |
| `listFields`   | 列表展示的字段（中英对照）           | `roleName=角色名`, `description=描述` |
| `searchFields` | 查询条件字段                         | `roleName / status`                   |
| `actions`      | 行操作（create/edit/delete/view 等） | `create + edit + delete`              |
| `apiPrefix`    | 接口 URL 前缀                        | `/xxx/sys/v1/role`                    |

## 标准产物

```
src/views/<menu-name>/
├── api.ts                            # 模块级 API 调用
├── constants.tsx                     # search-form + columns 配置
├── use<Menu>.ts                      # 🎯 主 composable —— 一个菜单一个，覆盖列表页全部顶层交互（必有）
├── use<Menu>Detail.ts                # ⚠️ 仅当详情页内部有"操作流 / 审批流 / 多阶段编辑"等复杂流程时才追加（少见）
├── <Menu>List.vue                    # 列表页（≤ 50 行 script setup，仅装配）
├── <EntityName>Edit.vue              # 创建 / 编辑弹窗（如有 create / edit 动作）—— 自包含，无伴生 composable；文件名不带 Dialog / Drawer 后缀
├── <EntityName>Form.vue              # 创建 / 编辑表单路由页（如富文本编辑这种不适合 Dialog 的场景）
└── <EntityName>Detail.vue            # 详情页（单一内容直接放此处；多内容模块时拆独立 detail/ 目录、与列表同级，见下"详情页多内容模块"）
```

> 按需生成，没有该动作的就别建空文件。

> **🛑 一个菜单一个目录,目录即命名空间,平铺在 `views/` 下。** 一级菜单挂多个二级菜单时,**不建只分组的父目录**,每个二级菜单各自建 `views/<父>-<二级>/`(目录名带一级前缀),四件套放进去;一级菜单本身即叶子(只挂一个菜单)就直接 `views/<菜单>/`,不加前缀。文件名出现 `<entity>-api.ts` / `<entity>-constants.tsx` 的实体前缀,就是目录塞了多个菜单 —— 拆目录、去前缀。
>
> ```
> ✅ src/views/<父>-<二级A>/   api.ts  constants.tsx  use<二级A>.ts  <二级A>List.vue
>    src/views/<父>-<二级B>/   api.ts  constants.tsx  use<二级B>.ts  <二级B>List.vue
>
> ❌ src/views/<父>/           ← 多出一层只分组、自己没有页面文件的父目录
>    ├── <二级A>/  ...
>    └── <二级B>/  ...
>
> ❌ src/views/<父>/           ← 多个菜单挤一个目录,被迫给文件加实体前缀
>    ├── <二级A>-api.ts  <二级A>List.vue
>    └── <二级B>List.vue
> ```

### Composable 文件拆分原则

**默认一个菜单一个主 composable 文件**（`use<Menu>.ts`），覆盖列表页全部顶层交互。

允许追加的唯一情况：详情页是独立路由 **且** 内部有复杂操作流（审批流、多阶段编辑、多 tab 状态同步等），追加 `use<Menu>Detail.ts`。**没有复杂操作流的详情页，逻辑直接写在 `.vue` 的 `<script setup>` 里**，不要为了"对称"造 composable。

✅ 标准形态：

```
src/views/energy-value/
├── useEnergyValue.ts          → 导出 useEnergyValue（列表 + 充值 Dialog 的 visibility 与 submit handler）
└── EnergyRecharge.vue        → 充值弹窗，自己持有 formModel / submitting / rules / validators（文件名不带 Dialog 后缀）
```

✅ 复杂详情页（少见）：

```
src/views/contract-approval/
├── useContractApproval.ts      → 列表
└── useContractApprovalDetail.ts → 仅当详情页内含多阶段审批流、操作流编排时才出现
```

❌ 反例 1（按组件拆 composable —— 状态散落）：

```
src/views/energy-value/
├── useEnergyValue.ts
├── useEnergyRechargeDialog.ts  ← ❌ 把 Dialog 的 formModel / submitting / rules 抽出来
└── EnergyRecharge.vue          ← 空壳，只剩 template
```

❌ 反例 2（每个 .vue 都配一个 composable）：

```
useNoticeManagement.ts
useNoticeEditDialog.ts   ← ❌ Dialog 不需要伴生 composable
useNoticeDetail.ts       ← ❌ 没有复杂操作流的详情页不需要 composable
```

**判错信号**：composable 文件名里出现 `Dialog` / `Drawer` / `Modal` / `Popover` 这类**组件形态词**，或者跟某个具体 `.vue` 子组件一一对应 —— 都是反模式。composable 名按**业务 / 菜单 / 视图**命名，不按**组件形态**命名。

### 详情页多内容模块 → 独立 `detail/` 目录（与列表同级，扁平化）

详情页有多个内容模块（基础信息 / 字段表 / 密文 / 存证…）就拆。在**菜单目录内**建 `detail/` 子目录（与列表四件套同级，不单独建 `list/` 子目录），内部**扁平化**：

```
src/views/<menu>/             ← 菜单目录：列表四件套直接放根
├── api.ts / constants.tsx / use<Menu>.ts / <Menu>List.vue
└── detail/                   ← 菜单目录内唯一子目录，与列表文件同级
    ├── <Menu>Detail.vue      ← 装配页：只摆位，<script setup> ≤ 50 行
    ├── use<Menu>Detail.ts    ← 详情 composable
    └── <Entity>Xxx.vue       ← 每个内容模块一个独立组件
```

铁律：

- **扁平化**：`detail/` 只放装配页 + composable + 模块组件，不套 `components/`，不另建 `constants.tsx` / `utils.ts`（列配置内联进模块组件，通用工具复用全局）。
- **装配页只装配**：每个内容模块拆独立 `.vue`，装配页只负责摆位。
- **composable 进 `detail/`**，不与列表 `use<Menu>.ts` 混在一起。
- 命名守无形态后缀：`<Entity>BasicInfo.vue`，不带 `Card` / `Panel` / `Dialog` 后缀。

单一内容、无模块边界的简单详情不拆，`<Entity>Detail.vue` 放菜单目录即可。样板：`views/<menu>/detail/`。

### Dialog 模式 vs 路由表单模式

| 场景                                       | 推荐            | 文件                                                                         |
| ------------------------------------------ | --------------- | ---------------------------------------------------------------------------- |
| 字段少、操作快、不离开列表上下文           | **Dialog 弹窗** | `<EntityName>Edit.vue` + 主 composable 里加 `handleEditSubmit` handler |
| 富文本编辑 / 字段超多 / 需要专注的输入流程 | **独立路由页**  | `<EntityName>Form.vue` + `use<EntityName>Form.ts`                            |

## 生成步骤

### Step 1 — api.ts

**严格遵守**：

- **函数名统一标准化**：`getList` / `getDetail` / `createItem` / `updateItem` / `deleteItem`，**不要加实体名前缀**（模块目录已经是命名空间了）
- **不在 api.ts 里定义响应 Item 接口**：只定义"前端控制"的类型（payload / query）；响应行 / 详情的类型在使用处声明（见 Step 3）
- **分页 payload / 返回结构按本项目后端约定来**——脚手架不预置 `createPagePayload` / `pickPageResult`。如果项目里已经沉淀了同类封装就复用；没有就在本文件里直接组装、直接 pick `{ items, total }`
- 写接口（create / update / delete / 重置等）用 `requestWithLoading`，读接口用 `request`
- 加密接口（涉及密码 / 敏感字段）用 `encryptPayload(params)`
- 调用方**建议**用 `import * as api from './api'` 命名空间引入，使用时 `api.getList(...)` / `api.createItem(...)`——模块名通过目录路径承载、函数名保持简短统一，读起来更清楚。**这是推荐写法，不是强制要求**：用 `import { getList, createItem } from './api'` 命名导入也行，选哪种由项目自己定

```ts
import { request, requestWithLoading } from '@/utils/request'

// 只定义"前端控制"的类型：query、payload
export interface <EntityName>Query {
  pageNum?: number   // 分页字段按后端约定命名，可能是 current / page
  pageSize?: number  // 也可能是 size / limit
  // 其他查询条件字段
}

export interface <EntityName>Payload {
  // 创建 / 更新时传给后端的字段
}

// 列表查询：分页 payload / 返回字段按后端约定，下面是示意
export const getList = async (params: <EntityName>Query) => {
  const { pageNum = 1, pageSize = 10, ...data } = params
  const body = await request.post<any>('<api-prefix>/searches', {
    page: { pageNum, pageSize },
    data,
  })
  return {
    items: body?.data ?? body?.items ?? [],
    total: Number(body?.resultPageInfo?.total ?? body?.total ?? 0),
  }
}

// 详情
export const getDetail = (id: string | number) =>
  request.post('<api-prefix>/detail', { id })

// 创建
export const createItem = (params: <EntityName>Payload) =>
  requestWithLoading.post('<api-prefix>/save', params)

// 更新
export const updateItem = (params: <EntityName>Payload) =>
  requestWithLoading.post('<api-prefix>/modify', params)

// 删除
export const deleteItem = (id: string | number) =>
  requestWithLoading.post('<api-prefix>/remove', { id })
```

#### 接口类型定义的边界

| 类型                                            | 在哪声明                           | 写多严格                 |
| ----------------------------------------------- | ---------------------------------- | ------------------------ |
| **请求 payload**（创建 / 更新发送给后端的对象） | `api.ts` 里 `interface XxxPayload` | **严格**，前端控制       |
| **请求 query**（列表查询条件、详情参数等）      | `api.ts` 里 `interface XxxQuery`   | **严格**，前端控制       |
| **响应 Item**（后端列表行 / 详情对象）          | **不在 api.ts 里定义**             | 在使用处按需声明（见下） |

#### 在使用处怎么标注 row 类型（**不要默认用裸 `any`**）

`any` 是放弃所有类型信息的特殊场景退路，不是默认值。按下面表选合适的标注：

| 场景                                           | 怎么写                                           | 例子                                                                     |
| ---------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------ |
| **业务 handler，依赖具体字段**                 | **inline 类型，只列依赖的字段**                  | `(row: { roleId?: string \| number; id?: string \| number }) => { ... }` |
| **column callback / formatText，纯透传给显示** | `Record<string, any>`                            | `(row: Record<string, any>) => emptyText(row.someField)`                 |
| **持有响应数据的 ref / state**                 | `Record<string, any>` 或 `Record<string, any>[]` | `const detail = ref<Record<string, any>>({})`                            |
| **normalize / parse 工具函数的入口参数**       | `any`（这是 `any` 合理的少数场景）               | `const normalizeList = (payload: any) => { ... }`                        |

**inline 类型 vs `Record<string, any>` 选用准则**：

- handler 有**条件判断 / 路由跳转 / 提交字段**依赖某些字段 → 用 inline 类型，把依赖明确写在签名上
- callback 只是把 row 喂给 formatText / render 显示 → 用 `Record<string, any>`，更诚实地表示"这是个对象，但具体字段我不关心"
- **裸 `any` 在业务代码里应该被视为代码 review 红线**

#### 非 CRUD 的特殊操作怎么命名

5 个标准名覆盖 90% 场景。剩下的（启用/禁用、子列表、批量操作等）保留**简短描述性**名字，**仍然不加实体前缀**：

```ts
export const enable = (id: string | number) => ...
export const disable = (id: string | number) => ...
export const getRecordList = (params) => ...    // 子列表
export const batchDelete = (ids: string[]) => ...
export const exportExcel = (params) => ...
```

调用处：`api.enable(...)` / `api.getRecordList(...)`，模块上下文已经清楚。

### Step 2 — constants.tsx

- search-form 配置走 `field + label + el + props` 模式
- 业务下拉（链 / 状态 / 用户类型 / 字典 select）**不要内嵌 `el: 'select' + options`**，**改用 `render` + 业务封装组件**（参考 `vue-scaffold-component` 子 skill 封装的下拉），由组件自请求数据
- columns 用 `formatText` 处理简单字段映射，`render` 处理复杂渲染（标签 / 按钮组）
- 操作列 `label: '操作'` + `fixed: 'right'`，**宽度用 `width`（固定锁死）不要用 `minWidth`**，用 `ElPopconfirm` 包裹危险操作

```tsx
import { ElButton, ElPopconfirm, ElSpace, ElTag } from 'element-plus'

import type { <EntityName>Payload } from './api'
// 业务下拉示例（按需引入，组件名按项目前缀自定）：
// import <Prefix>CategorySelect from '@/custom-components/<Prefix>CategorySelect'

export const create<EntityName>SearchForm = () => [
  {
    field: 'name',
    label: '名称',
    el: 'input',
    props: { placeholder: '请输入名称', clearable: true, maxlength: 32 },
  },
  // 业务下拉用 render + 封装组件
  // {
  //   field: 'categoryId',
  //   label: '类别',
  //   render: (model: any) => <<Prefix>CategorySelect v-model={model.value} />,
  // },
]

export const create<EntityName>Columns = ({
  onEdit,
  onDelete,
}: {
  onEdit: (row: Record<string, any>) => void
  onDelete: (row: Record<string, any>) => void
}) => [
  { prop: 'name', label: '名称', minWidth: 160 },
  { prop: 'createDate', label: '创建时间', minWidth: 180 },
  {
    prop: 'action',
    label: '操作',
    fixed: 'right',
    width: 220,
    render: ({ row }: { row: Record<string, any> }) => (
      <ElSpace wrap>
        <ElButton type="primary" link onClick={() => onEdit(row)}>编辑</ElButton>
        <ElPopconfirm title="确认删除？" onConfirm={() => onDelete(row)}>
          {{
            reference: () => <ElButton type="danger" link>删除</ElButton>,
          }}
        </ElPopconfirm>
      </ElSpace>
    ),
  },
]
```

### Step 3 — use\<Menu\>.ts（一个菜单一个主 composable）

业务逻辑全部在 composable，view 仅做装配。

**命名**：文件名 = 菜单 / 业务名，**不带组件形态后缀**：

- ✅ `useEnergyValue.ts` / `useRoleManagement.ts` / `useNoticeManagement.ts`
- ❌ `useEnergyRechargeDialog.ts` / `useRoleEditDrawer.ts` —— 名字一带 `Dialog` / `Drawer` 就错了

**职责**：

- 持有列表所有顶层状态：tableRef、分页参数、查询条件
- 持有所有弹层的 visibility 和当前操作行 id（如 `editDialogVisible`、`editingRow`）
- 持有所有 submit handler（`handleEditSubmit` 等）—— 在这里决定调 `createItem` 还是 `updateItem`、成功后是否 `refresh()`
- **不持有**：表单 formModel、submitting、rules、validators —— 这些是 Dialog 自己的事

```ts
import { ElMessage } from 'element-plus'

import * as api from './api'
import type { <EntityName>Payload } from './api'
import { create<EntityName>Columns, create<EntityName>SearchForm } from './constants'

export const use<Menu> = () => {
  const tableRef = useTemplateRef<any>('tableRef')
  const editDialogVisible = ref(false)
  const editingRow = ref<Record<string, any> | null>(null)

  const searchFormList = computed(() => create<EntityName>SearchForm())

  const refresh = () => tableRef.value?.updateTableData()
  const requestTableData = (params: Record<string, any>) => api.getList(params)

  const handleCreate = () => {
    editingRow.value = null
    editDialogVisible.value = true
  }

  const handleEdit = (row: Record<string, any>) => {
    editingRow.value = row
    editDialogVisible.value = true
  }

  const handleDelete = async (row: { id?: string | number }) => {
    if (!row.id) return
    await api.deleteItem(row.id)
    ElMessage.success('删除成功')
    refresh()
  }

  const handleEditSubmit = async (payload: <EntityName>Payload) => {
    if (editingRow.value) {
      await api.updateItem({ ...editingRow.value, ...payload })
      ElMessage.success('保存成功')
    } else {
      await api.createItem(payload)
      ElMessage.success('创建成功')
    }
    refresh()
  }

  const columns = computed(() => create<EntityName>Columns({
    onEdit: handleEdit,
    onDelete: row => void handleDelete(row),
  }))

  return {
    columns,
    searchFormList,
    requestTableData,
    editDialogVisible,
    editingRow,
    handleCreate,
    handleEditSubmit,
    refresh,
  }
}
```

### Step 4 — \<EntityName\>List.vue

template 部分用 `<hd-pro-table>`（内集成查询区）；script setup 仅做装配，不超过 50 行（见强制规则 5）。

**模板根节点规范（强制）**：

1. **根 `<div>` 必须挂 `view-w`** —— 这是 view 页面的统一标识类，layout 通过它识别"这是一个走 Layout 容器的业务页"。其他原子类（`h-full` / `w-full` / `flex` 等）按需追加。
2. **Dialog / Drawer 等弹层组件必须跟根 `<div>` 同级**，**不要嵌进 `view-w` 内部**。Vue 3 模板允许多根节点，弹层一律放在 view-w 同级 —— 这样：
   - Dialog 不参与 Layout 内边距 / 滚动 / flex 布局，避免被父级样式干扰
   - 视觉上的"页面主体"和"覆盖层"分得很干净，读模板一眼看清
   - element-plus Dialog/Drawer 自带 `append-to-body` 时行为更一致
3. **禁止写自定义 `<style scoped>` class**：项目已集成 UnoCSS，所有页面级样式用原子类（`h-full` / `flex` / `gap-3` / `rounded-2` 等）。`<style scoped>` 只允许出现在**必须**用到的 element-plus 深度覆盖（`:deep(.el-input__wrapper)` 等），且应**极少**。任何形如 `.system-manage-page { min-height: 0 }` 的自定义 class 都是反模式 —— 直接 `min-h-0` 原子类替代。
4. **Dialog / Drawer 弹层组件必须用 `defineAsyncComponent` 动态引入**：`import XxxEdit from './XxxEdit.vue'` 是**反模式** —— 这些弹窗只在用户打开时才渲染，静态 import 会导致首屏打包时把弹窗代码（含 el-dialog / el-form / el-input 及其子依赖）全部打进主 chunk。**必须**用 `const XxxEdit = defineAsyncComponent(() => import('./XxxEdit.vue'))`，让 Vite 将其拆分为独立 chunk、按需加载。（注意：弹框 / 抽屉 `.vue` 文件名不带 `Dialog` / `Drawer` 形态后缀，用 业务 + 动作 命名。）（`defineAsyncComponent` 已通过 `unplugin-auto-import` 全局导入，无需手动 import。）

```vue
<template>
  <div class="view-w h-full w-full">
    <hd-pro-table
      ref="tableRef"
      :columns="columns"
      :form-controls="searchFormList"
      :request-api="requestTableData"
      current-page-key="pageNum"
      page-size-key="pageSize"
    >
      <template #tableHeader>
        <el-button type="primary" @click="handleCreate">新建</el-button>
      </template>
    </hd-pro-table>
  </div>

  <!-- ⬇️ 弹层组件挂在 view-w 同级，不要嵌进上面的 div -->
  <<EntityName>Edit
    v-model="editDialogVisible"
    :row="editingRow"
    :on-submit="handleEditSubmit"
  />
</template>

<script setup lang="ts">
import { use<EntityName> } from './use<EntityName>'

const <EntityName>Edit = defineAsyncComponent(() => import('./<EntityName>Edit.vue'))

const {
  columns,
  searchFormList,
  requestTableData,
  editDialogVisible,
  editingRow,
  handleCreate,
  handleEditSubmit,
} = use<EntityName>()
</script>
```

### Step 5 — \<EntityName\>Edit.vue（如有 create / edit）

**严格遵守"主业务 / 子业务分层"约定**（见顶部设计哲学）：

- Dialog **完全自包含**：自己的 formModel / submitting / rules / formRef / 自定义 validators（如 `integerValidator`）/ `resetForm` 全部写在 `.vue` 的 `<script setup>` 里
- Dialog 通过 `props.onSubmit` 接收提交逻辑，`await` 调用，`try/finally` 保证 submitting 一定重置
- Dialog **不知道**调哪个 API、不知道是 create 还是 update
- 成功路径：`await props.onSubmit()` 正常结束 → `visible.value = false`
- 失败路径：`await props.onSubmit()` 抛出（axios 已 toast）→ catch 捕获，Dialog 保持打开，用户改字段重试

#### 🚫 严禁：把 Dialog 状态抽到 `useXxxDialog.ts`

这是最容易犯的错误，单独点名：

❌ **错误结构**：

```
src/views/energy-value/
├── useEnergyValue.ts
├── useEnergyRechargeDialog.ts    ← 错。"Dialog" 后缀是反模式信号
│   └── 里面装着 formModel / submitting / resetForm / submitRecharge
└── EnergyRecharge.vue             ← 变成空壳，rules / validators 还得回写在这里
```

```ts
// ❌ useEnergyRechargeDialog.ts —— 整个文件都不该存在
export const useEnergyRechargeDialog = (options: { afterSuccess?: () => Promise<void> } = {}) => {
  const formRef = useTemplateRef<any>('formRef')   // ❌ template ref 跨文件，类型 / 生命周期都奇怪
  const submitting = ref(false)
  const formModel = ref<EnergyRechargeFormModel>(createInitialModel())
  const resetForm = () => { ... }
  const submitRecharge = async () => {
    await api.createItem(...)                       // ❌ Dialog 居然在调具体 API
    await options.afterSuccess?.()                  // ❌ 用 callback 通知父端，submitting 容易卡
  }
  return { formModel, submitting, resetForm, submitRecharge }
}
```

✅ **正确结构**：composable 文件不存在，Dialog 自己持有全部状态，父端通过 `props.onSubmit` 注入业务编排。

```vue
<!-- ✅ EnergyRecharge.vue —— 所有状态在这里（文件名不带 Dialog 后缀） -->
<script setup lang="ts">
import type { FormInstance, FormRules } from "element-plus";

interface EnergyRechargeFormModel {
  chainAccountAddress: string;
  gas: number;
  remarks: string;
}

const createInitialModel = (): EnergyRechargeFormModel => ({
  chainAccountAddress: "",
  gas: 1,
  remarks: "",
});

const visible = defineModel<boolean>({ default: false });
const props = defineProps<{
  onSubmit: (payload: EnergyRechargeFormModel) => Promise<void>;
}>();

const formRef = useTemplateRef<FormInstance>("formRef");
const submitting = ref(false);
const formModel = ref<EnergyRechargeFormModel>(createInitialModel());

const integerValidator = (
  _rule: unknown,
  value: number,
  callback: (e?: Error) => void,
) => {
  if (!Number.isInteger(Number(value)) || Number(value) < 1) {
    callback(new Error("充值能量值必须为正整数"));
    return;
  }
  callback();
};

const rules: FormRules = {
  chainAccountAddress: [
    { required: true, message: "请输入链账户地址", trigger: "blur" },
  ],
  gas: [
    {
      required: true,
      type: "number",
      message: "请输入充值能量值",
      trigger: "change",
    },
    { validator: integerValidator, trigger: "change" },
  ],
  remarks: [
    {
      required: true,
      whitespace: true,
      message: "请输入备注",
      trigger: "blur",
    },
  ],
};

const resetForm = () => {
  formModel.value = createInitialModel();
  nextTick(() => formRef.value?.clearValidate());
};

const handleSubmit = async () => {
  if (submitting.value) return;
  await formRef.value?.validate();
  submitting.value = true;
  try {
    await props.onSubmit({ ...formModel.value });
    visible.value = false;
  } catch {
    // 保持打开，axios 已 toast
  } finally {
    submitting.value = false;
  }
};
</script>
```

```ts
// ✅ useEnergyValue.ts —— 主 composable 仅持有"决定调哪个 API + 刷列表"的编排
export const useEnergyValue = () => {
  const tableRef = useTemplateRef<any>("tableRef");
  const rechargeVisible = ref(false);

  const refresh = () => tableRef.value?.updateTableData?.();
  const openRecharge = () => {
    rechargeVisible.value = true;
  };

  const handleRechargeSubmit = async (payload: {
    chainAccountAddress: string;
    gas: number;
    remarks: string;
  }) => {
    await api.createItem({
      chainAccountAddress: payload.chainAccountAddress,
      gas: Math.trunc(Number(payload.gas)),
      remarks: payload.remarks.trim(),
    });
    ElMessage.success("充值操作已提交");
    refresh();
  };

  return { rechargeVisible, openRecharge, handleRechargeSubmit /* ... */ };
};
```

```vue
<!-- ✅ 列表页装配：rechargeVisible + handleRechargeSubmit 注入 Dialog -->
<EnergyRecharge
  v-model="rechargeVisible"
  :on-submit="handleRechargeSubmit"
/>
```

**自检清单**（生成前对照）：

- [ ] 模块目录里**没有**任何 `use*Dialog.ts` / `use*Drawer.ts` / `use*Modal.ts` 文件
- [ ] Dialog `.vue` 的 `<script setup>` 里能看到 `formModel` / `submitting` / `rules` / 自定义 validators
- [ ] 主 composable 里**只有** `xxxVisible` 和 `handleXxxSubmit`，没有 `formModel` / `formRef`
- [ ] Dialog 不出现 `api.createItem(...)`、`api.updateItem(...)` —— 这些只在主 composable 的 handler 里出现

```vue
<template>
  <el-dialog
    v-model="visible"
    :title="row ? '编辑' : '新建'"
    width="560px"
    append-to-body
    destroy-on-close
    @open="resetForm"
  >
    <el-form
      ref="formRef"
      :model="formModel"
      :rules="rules"
      label-width="120px"
    >
      <el-form-item label="名称" prop="name">
        <el-input
          v-model="formModel.name"
          maxlength="32"
          show-word-limit
          placeholder="请输入名称"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        {{ row ? "保存" : "创建" }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'

import type { <EntityName>Payload } from './api'

interface <EntityName>FormModel {
  name: string
  // ... 其他字段
}

const createInitialModel = (): <EntityName>FormModel => ({
  name: '',
})

const visible = defineModel<boolean>({ default: false })
const props = defineProps<{
  row: Record<string, any> | null
  onSubmit: (payload: <EntityName>FormModel) => Promise<void>
}>()

const formRef = useTemplateRef<FormInstance>('formRef')
const submitting = ref(false)
const formModel = ref<<EntityName>FormModel>(createInitialModel())

const rules: FormRules = {
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
}

const resetForm = () => {
  formModel.value = createInitialModel()
  if (props.row) {
    Object.assign(formModel.value, props.row)
  }
  nextTick(() => formRef.value?.clearValidate())
}

const handleSubmit = async () => {
  if (submitting.value) return
  await formRef.value?.validate()
  submitting.value = true
  try {
    await props.onSubmit({ ...formModel.value })
    visible.value = false
  } catch {
    // 失败时保持打开，错误已由 axios 拦截器 toast，用户改字段后可重试
  } finally {
    submitting.value = false
  }
}
</script>
```

### Step 6 — 注册路由

在 `src/router/index.ts` 中添加。**菜单图标用 element-plus icon 名**（如 `User` / `Connection` / `FolderOpened` / `Setting`）：

```ts
{
  path: '/<module-name>',
  component: Layout,
  name: '<EntityName>Root',
  redirect: '/<module-name>/list',
  meta: {
    title: '<displayName>',
    icon: '<element-plus-icon-name>',
    alwaysShow: true,
    breadcrumbClickable: false,
  } satisfies AppRouteMeta,
  children: [
    {
      path: 'list',
      name: '<EntityName>List',
      component: () => import('@/views/<module-name>/<EntityName>List.vue'),
      meta: {
        title: '<displayName>列表',
        keepAlive: true,
      } satisfies AppRouteMeta,
    },
    // 详情路由（如有）：
    // {
    //   path: 'detail',
    //   name: '<EntityName>Detail',
    //   component: () => import('@/views/<module-name>/<EntityName>Detail.vue'),
    //   meta: {
    //     title: '<displayName>详情',
    //     hideMenu: true,
    //     breadcrumbTrail: [
    //       { title: '<displayName>列表', path: '/<module-name>/list', name: '<EntityName>List' },
    //     ],
    //   } satisfies AppRouteMeta,
    // },
  ],
},
```

并按需更新 `DEFAULT_ROUTE_PATH`（如果这是用户登录后的首屏模块）。

## 强制规则（M1–M16）

> 这些编号是稳定 ID，被 `vue-scaffold-review` 报告引用。修改本节请保持编号不变。

1. **[M1] 业务下拉一律用组件，不在 constants 里硬塞 options**：需要远程下拉时调 `vue-scaffold-component` 子 skill 先封装一个，再在 constants `render` 里用
2. **[M2] api 文件函数名统一标准化**：`getList` / `getDetail` / `createItem` / `updateItem` / `deleteItem`，**不加实体名前缀**。引入风格上 **推荐** `import * as api from './api'` + `api.getList(...)`（更清楚、不用频繁改 import），但**不强制** —— 命名导入 `import { getList } from './api'` 同样可接受
3. **[M3] api 文件返回 Promise<T>**，不包 ApiResponse
4. **[M4] composable 名字必须以 `use` 开头**
5. **[M5] view 的 `<script setup>` 不超过 50 行**，超过就该拆 composable
6. **[M6] 错误 catch 块默认空**（错误信息已由 axios 拦截器统一 toast）
7. **[M7] reactive → ref**：所有状态用 `ref()`
8. **[M8] 路由 meta.title 直接中文**
9. **[M9] Dialog 不直接调业务接口**：通过 `props.onSubmit: (payload) => Promise<void>` 把提交逻辑注入 Dialog；Dialog `await props.onSubmit()`，`try/finally` 保证 submitting 一定重置，成功后 `visible.value = false`
10. **[M10] 主 composable handler 是纯 async 函数**：无 callback 参数，失败让 axios 自然 throw 使 Dialog 保持打开，成功时 `refresh()`
11. **[M11] view 模板根 `<div>` 必须挂 `view-w`**：这是 view 页面的统一标识类，缺了就不算合规 view
12. **[M12] Dialog / Drawer 等弹层组件挂在 view-w 同级，不嵌进根 `<div>` 里**：Vue 3 多根节点写法 —— view-w 装"页面主体"，弹层装"覆盖层"，结构分明
13. **[M13] 禁止自定义 `<style scoped>` class**：UnoCSS 原子类已经够用，`<style scoped>` 只能放 element-plus 深度覆盖（`:deep(...)`）。任何 `.system-xxx-page { min-height: 0 }` 这种自定义 class 都是反模式
14. **[M14] composable 命名禁区**：composable 文件名禁带组件形态后缀（`use*Dialog.ts` / `use*Drawer.ts` / `use*Modal.ts` / `use*Popover.ts`），且一个菜单目录默认只有一个主 composable —— 详见下方"🛑 composable 命名禁区"
15. **[M15] 弹层 `.vue` 文件名禁带形态后缀**：`<Entity>EditDialog.vue` / `<Entity>DetailDrawer.vue` 是反模式，用 业务 + 动作 命名（`<Entity>Edit.vue` / `<Entity>Detail.vue`），组件形态由内部的 `el-dialog` / `el-drawer` 体现
16. **[M16] 弹层组件必须 `defineAsyncComponent` 动态引入**：列表页静态 `import XxxEdit from './XxxEdit.vue'` 是反模式（详见 Step 4 模板根节点规范第 4 条）

> **🛑 composable 命名禁区（最强规则）**：
>
> - composable 文件名 **按业务 / 菜单 / 视图** 命名：`useEnergyValue.ts` / `useRoleManagement.ts`
> - composable 文件名 **绝不带组件形态后缀**：`useXxxDialog.ts` / `useXxxDrawer.ts` / `useXxxModal.ts` / `useXxxPopover.ts` —— **看到这种命名就回退，把状态搬回组件内部**
> - 一个菜单目录 **默认只有一个** 主 composable 文件（`use<Menu>.ts`）；独立路由的详情页（复杂操作流）/ 表单页可分别追加 `use<Menu>Detail.ts` / `use<Menu>Form.ts`，**仅路由页例外**
> - Dialog / Drawer / Form（非独立路由）/ Modal —— **没有伴生 composable**。它们的状态（formModel / submitting / rules / validators）100% 自包含在 `.vue` 文件里
>
> **模块目录内文件命名约定**：
>
> - **`use<Menu>.ts`** / **`use<Menu>Detail.ts`** —— composable，**驼峰** + `use` 前缀，**按业务命名**
> - **`<EntityName>List.vue`** / **`<EntityName>Edit.vue`** —— Vue 组件，**PascalCase**
> - **弹框 / 抽屉等覆盖层组件 `.vue` 文件名不带 `Dialog` / `Drawer` 形态后缀**：用 业务 + 动作 命名 —— ✅ `<EntityName>Edit.vue` / `<EntityName>Detail.vue`，❌ `<EntityName>EditDialog.vue` / `<EntityName>DetailDrawer.vue`。组件形态由 `.vue` 内部的 `el-dialog` / `el-drawer` 体现，不进文件名（与 composable 不带形态后缀同理）
> - **`api.ts`** / **`constants.tsx`** —— 模块固定四件套，**全小写**
> - **其它工具 / 共享辅助 `.ts`**（如 `role-resource.ts` / `notice-format.ts`）—— 既不是 composable，也不是组件，**用 kebab-case** 跟前两类区别开。看到 kebab 命名一眼知道"这是个纯函数集 / 数据辅助"，不是带响应式状态的 hook。

## 反模式

- ❌ 在 `<Module>List.vue` 里写业务逻辑（拆 composable）
- ❌ `getXxxList().then(res => res.data?.data)` 这种链式（用 `await + 拦截器`）
- ❌ **API 函数名带实体前缀**：`getRoleList` / `createRole` / `deleteContractWhitelist`（模块目录已经是命名空间，应统一为 `getList` / `createItem`）
- ❌ **模块文件名带实体前缀**：`<entity>-api.ts` / `<entity>-constants.tsx`（前缀＝目录里塞了多个菜单的信号，应拆成各自的 `views/<父>-<子>/`，文件名回归裸 `api.ts`）
- ❌ **多个二级菜单挤进一个目录**：一个目录里并排 `<二级A>List.vue` + `<二级B>List.vue` + `<entity>-*`（每个菜单应各自建 `views/<父>-<子>/`，不建只分组的父目录）
- ❌ 字典 select 用 `el: 'select', options: xxxOptions`（用组件 + render）
- ❌ 弹窗模板塞进列表页 vue 文件（独立 vue 文件 + props/emit）
- ❌ **弹框 / 抽屉 `.vue` 文件名带 `Dialog` / `Drawer` 形态后缀**：`RoleEditDialog.vue` / `RoleDetailDrawer.vue` 是反模式 —— 用 业务 + 动作 命名 `RoleEdit.vue` / `RoleDetail.vue`
- ❌ **把 Dialog 的 formModel / submitting / rules 抽到 `useXxxDialog()` / `useXxxCreate()` 这种独立 hook**（状态散落，应该自包含在 Dialog 内部）
- ❌ **存在任何 `use*Dialog.ts` / `use*Drawer.ts` / `use*Modal.ts` / `use*Popover.ts` 文件**（这种命名本身就是反模式信号 —— composable 不按组件形态命名，按业务命名）
- ❌ **一个 `.vue` 配一个 composable**（默认一个菜单一个主 composable；详情页有复杂操作流时才追加 `use<Menu>Detail.ts`）
- ❌ **`emit('submit', payload, callback)` 模式**——callback 不被调时 submitting 卡死，改用 `props.onSubmit` async 函数
- ❌ **Dialog 里 `watch formModel` 重置 submitting**——这是 emit+callback 的补丁，`props.onSubmit` + `try/finally` 不需要此兜底
- ❌ **为了"形式"把简单 confirm 弹窗拆成独立组件**（小于 20 行 / 不复用 / 没有自己的 form state 的就不要拆）
- ❌ `meta.title: 'MENU_ROLE'` i18n key（直接中文）
- ❌ **view 根节点用自定义 class 替代 `view-w`**：`<div class="system-manage-page h-full w-full">` 这种是反模式 —— 根节点必须挂 `view-w`，自定义 class 不允许
- ❌ **Dialog / Drawer 嵌在 view-w 根 `<div>` 内部**：弹层属于"覆盖层"维度，跟"页面主体"是平级关系，应作为 view-w 的兄弟节点，不是子节点
- ❌ **`<style scoped>` 写自定义 class** 来设 `min-height: 0` 这种小调整：用 UnoCSS 原子类 `min-h-0` 替代，scoped 样式仅留给 element-plus 深度覆盖

## 完成后验证

1. `pnpm dev` 启动
2. 访问 `/<module-name>/list` 应能看到表格
3. 查询区字段渲染正确，点击查询能调接口
4. 操作列按钮可点（即便接口未联调也能弹 toast）
5. 路由切换浏览器 tab 标题应该是 `<列表标题> - <VITE_APP_TITLE>`

## 引用

详细模板在主 skill `vue-scaffold-app/references/` 下；本子 skill 内嵌的代码片段已是最小可运行版本。
