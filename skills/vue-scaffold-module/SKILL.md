---
name: vue-scaffold-module
description: 在已有 Vue 3 + TS 中后台门户工程内，按 vue-scaffold-app 规范添加一个新的业务模块（列表 + 详情 + 弹窗）。当用户说"加一个 xx 列表页"、"在项目里新增 xx 模块"、"按模板加 xx 业务页"、"按 portal 规范加 xx 管理页"、"新增一个 crud 页面"等时使用。生成模块四件套（api.ts / constants.tsx / use<Module>.ts / <Module>List.vue），自动接入 router、复用 pro-table / search-form，业务码统一走 axios 拦截器。
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

### 分层契约

| 层 | 持有的状态 | 持有的逻辑 |
|---|---|---|
| **主业务 composable**<br>`use<EntityName>` | 列表数据 / 分页 / 查询 / 子操作的 visibility | 调 API + 刷列表 + 业务编排 |
| **子业务组件**<br>`<EntityName>EditDialog.vue` 等 | 表单 formModel / submitting / formRef / rules | 表单校验 / UI 状态自管 |

**主业务 composable 不知道**：
- 表单字段长什么样、有什么校验规则
- 弹窗的尺寸 / 标题 / 按钮文案

**子业务组件不知道**：
- 提交后调的是哪个接口（create 还是 update）
- 提交后是否需要刷新列表
- 当前登录用户是谁、要不要带 operator 字段

### 子业务组件的标准协作：props 传 async 函数

Dialog 通过 `onSubmit` 函数 prop 接收父端提交逻辑，自己 `await` 调用并用 `try/finally` 管理 submitting 状态：

```ts
// Dialog
const visible = defineModel<boolean>({ default: false })
const props = defineProps<{
  // ...其它 props，如 userId / roleId
  onSubmit: (payload: PayloadType) => Promise<void>
}>()

const submitting = ref(false)

const handleSubmit = async () => {
  if (submitting.value) return
  await formRef.value?.validate()
  submitting.value = true
  try {
    await props.onSubmit(buildPayload())
    visible.value = false
  } catch {
    // 失败时保持打开，错误已由 axios 拦截器 toast，用户改字段后可重试
  } finally {
    submitting.value = false  // ✅ 一定执行，永远不会卡 loading
  }
}
```

```ts
// 父端列表 composable
const handleEditSubmit = async (payload: PayloadType) => {
  if (currentId.value) {
    await api.updateItem({ ...payload, id: currentId.value })
  } else {
    await api.createItem(payload)
  }
  ElMessage.success('保存成功')
  refresh()
}
```

```vue
<!-- 父端模板 -->
<XxxDialog v-model="editVisible" :id="currentId" :on-submit="handleEditSubmit" />
```

### 什么时候 NOT 应用这个模式（同样重要）

- **简单确认框**（`ElMessageBox.confirm` 删除提示）：直接在 composable 里调，不拆
- **整页表单**（非弹窗）：直接在 view 里写或抽 composable，没有 Dialog 边界
- **不复用、不到 20 行的内嵌弹窗**：保持内嵌

**判断标准**：当一个 Dialog 同时承担"UI 自己的状态"**和**"业务调用 / 列表协同"两类不同关注点时，就该拆；否则保持简单。

## 何时使用

- 用户说 "在 xx 项目里加一个角色管理模块"
- 用户说 "新增一个 xx 列表页 / xx 管理页 / xx CRUD 页"
- 主 skill `vue-scaffold-app` Step 7（添加第一个业务模块）调用本 skill

## 前置假设（不满足时报错）

调用本 skill 前，目标项目应当已经具备：
1. `src/components/pro-table` 通用增强表格（含 search-form 集成、分页、刷新）
2. `src/utils/axios.ts` 拦截器收口（业务层 await 直接拿数据）
3. `src/utils/portal.ts`（`PageParams` / `createPagePayload` / `pickPageResult`）
4. `src/router/index.ts` 用 Layout 包业务页
5. 至少一个已存在的业务模块（如 `src/views/example/`）作为风格参照 —— **如果项目里一个 module 都没有，先按主 skill 的 module-template 标准生成第一个，不要凭空创造风格**

如果上述任一不满足，提示用户先按 `vue-scaffold-app` 主 skill 完成基础设施搭建。

## 输入参数

调用时尽量从用户描述里抽取以下信息；缺失则向用户提问（AskUserQuestion）：

| 参数 | 含义 | 示例 |
|---|---|---|
| `moduleName` | 模块名（kebab-case） | `role-management` |
| `entityName` | 业务实体名（PascalCase） | `Role` |
| `displayName` | 中文菜单名 | "角色管理" |
| `listFields` | 列表展示的字段（中英对照） | `roleName=角色名`, `description=描述` |
| `searchFields` | 查询条件字段 | `roleName / status` |
| `actions` | 行操作（create/edit/delete/view 等） | `create + edit + delete` |
| `apiPrefix` | 接口 URL 前缀 | `/xxx/sys/v1/role` |

## 标准产物

```
src/views/<module-name>/
├── api.ts                            # 模块级 API 调用
├── constants.tsx                     # search-form + columns 配置
├── use<EntityName>List.ts            # 列表视图的 composable（必有）
├── use<EntityName>Form.ts            # 表单视图的 composable（仅当有独立路由表单页时）
├── use<EntityName>Detail.ts          # 详情视图的 composable（仅当有独立路由详情页时）
├── <EntityName>List.vue              # 列表页（≤ 50 行 script setup）
├── <EntityName>EditDialog.vue        # 创建 / 编辑弹窗（如有 create / edit 动作）
├── <EntityName>Form.vue              # 创建 / 编辑表单路由页（如富文本编辑这种不适合 Dialog 的场景）
└── <EntityName>Detail.vue            # 详情页（如有 view 动作 / 详情需要独立路由）
```

> 按需生成，没有该动作的就别建空文件。

### Composable 文件拆分原则

**一个 view 一个 composable 文件**，不要把所有 composable 都塞到 `use<EntityName>.ts` 里。

❌ 反例：
```
useNoticeManagement.ts
  └── export useNoticeManagement   // 列表
  └── export useNoticeForm          // 表单（不同 view）
  └── export useNoticeDetail        // 详情（不同 view）
```

✅ 正例：
```
useNoticeManagement.ts → 只导出 useNoticeManagement（列表）
useNoticeForm.ts       → 只导出 useNoticeForm（表单）
useNoticeDetail.ts     → 只导出 useNoticeDetail（详情）
```

**理由**：列表、表单、详情是**完全不同的视图，关注点完全不同**：
- 列表关心搜索、分页、行操作的编排
- 表单关心 formModel、校验、提交流程
- 详情关心数据加载、字段展示

塞一个文件里 → 阅读时要在几百行里跳，IDE 重命名时 conflict 概率高，git diff 也乱。

### Dialog 模式 vs 路由表单模式

| 场景 | 推荐 | 文件 |
|---|---|---|
| 字段少、操作快、不离开列表上下文 | **Dialog 弹窗** | `<EntityName>EditDialog.vue` + 主 composable 里加 `handleEditSubmit` handler |
| 富文本编辑 / 字段超多 / 需要专注的输入流程 | **独立路由页** | `<EntityName>Form.vue` + `use<EntityName>Form.ts` |

## 生成步骤

### Step 0 — 读现有惯例（必做）

在生成之前，**至少读一个项目内已有的业务模块** 作为本次生成的风格基准。优先顺序：
1. 用户在 prompt 中指定的"参考模块"
2. 项目里命名最相似的模块
3. 项目里最新创建的模块（按 git log）

读取以下文件并对齐其风格：
- 该模块的 `api.ts` —— 看 request 用法、类型签名、`createPagePayload` 用法
- 该模块的 `constants.tsx` —— 看 search-form 控件类型、columns formatText / render 模式
- 该模块的 `use<Module>.ts` —— 看 composable 返回结构、字典加载模式、handlexxx 方法命名
- 该模块的 `<Module>List.vue` —— 看 template 中 pro-table 用法、dialog 挂载位置

**不要凭主 skill 的模板生成**，要以**项目内现存惯例**为准。主 skill 的 references 是兜底，项目里有更新的写法时跟项目走。

### Step 1 — api.ts

**严格遵守**：
- **函数名统一标准化**：`getList` / `getDetail` / `createItem` / `updateItem` / `deleteItem`，**不要加实体名前缀**（模块目录已经是命名空间了）
- **不在 api.ts 里定义响应 Item 接口**：只定义"前端控制"的类型（payload / query）；响应行 / 详情的类型在使用处声明（见 Step 3）
- 分页接口用 `createPagePayload` + `pickPageResult`
- 写接口（create / update / delete / 重置等）用 `requestWithLoading`，读接口用 `request`
- 加密接口（涉及密码 / 敏感字段）用 `encryptPayload(params)`
- 调用方一律 `import * as api from './api'`，使用时 `api.getList(...)` / `api.createItem(...)`——模块名通过目录路径承载，函数名保持简短统一

```ts
import { request, requestWithLoading } from '@/utils/axios'
import { createPagePayload, pickPageResult, type PageParams } from '@/utils/portal'

// 只定义"前端控制"的类型：query、payload
export interface <EntityName>Query {
  // 查询条件字段
}

export interface <EntityName>Payload {
  // 创建 / 更新时传给后端的字段
}

// 列表查询：响应类型不写
export const getList = async (params: <EntityName>Query & PageParams) => {
  const body = await request.post('<api-prefix>/searches', createPagePayload(params))
  return pickPageResult(body)
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

| 类型 | 在哪声明 | 写多严格 |
|---|---|---|
| **请求 payload**（创建 / 更新发送给后端的对象） | `api.ts` 里 `interface XxxPayload` | **严格**，前端控制 |
| **请求 query**（列表查询条件、详情参数等） | `api.ts` 里 `interface XxxQuery` | **严格**，前端控制 |
| **响应 Item**（后端列表行 / 详情对象） | **不在 api.ts 里定义** | 在使用处按需声明（见下） |

#### 在使用处怎么标注 row 类型（**不要默认用裸 `any`**）

`any` 是放弃所有类型信息的特殊场景退路，不是默认值。按下面表选合适的标注：

| 场景 | 怎么写 | 例子 |
|---|---|---|
| **业务 handler，依赖具体字段** | **inline 类型，只列依赖的字段** | `(row: { roleId?: string \| number; id?: string \| number }) => { ... }` |
| **column callback / formatText，纯透传给显示** | `Record<string, any>` | `(row: Record<string, any>) => emptyText(row.someField)` |
| **持有响应数据的 ref / state** | `Record<string, any>` 或 `Record<string, any>[]` | `const detail = ref<Record<string, any>>({})` |
| **normalize / parse 工具函数的入口参数** | `any`（这是 `any` 合理的少数场景） | `const normalizeList = (payload: any) => { ... }` |

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
- 操作列 `label: '操作'` + `fixed: 'right'`，用 `ElPopconfirm` 包裹危险操作

```tsx
import { ElButton, ElPopconfirm, ElSpace, ElTag } from 'element-plus'

import type { <EntityName>Payload } from './api'
// 业务下拉示例（按需引入）：
// import PortalChainFrameworkSelect from '@/custom-components/PortalChainFrameworkSelect'

export const create<EntityName>SearchForm = () => [
  {
    field: 'name',
    label: '名称',
    el: 'input',
    props: { placeholder: '请输入名称', clearable: true, maxlength: 32 },
  },
  // 业务下拉用 render + 封装组件
  // {
  //   field: 'opbChainId',
  //   label: '开放联盟链框架',
  //   render: (model: any) => <PortalChainFrameworkSelect v-model={model.value} />,
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

### Step 3 — use\<EntityName\>.ts

业务逻辑全部在 composable，view 仅做装配。

```ts
import { ElMessage } from 'element-plus'

import * as api from './api'
import type { <EntityName>Payload } from './api'
import { create<EntityName>Columns, create<EntityName>SearchForm } from './constants'

export const use<EntityName> = () => {
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

template 部分用 `pro-table` + `search-form` 复合；script setup 控制在 30 行内。

```vue
<template>
  <div class="view-w h-full w-full">
    <pro-table
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
    </pro-table>

    <<EntityName>EditDialog
      v-model="editDialogVisible"
      :row="editingRow"
      :on-submit="handleEditSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import <EntityName>EditDialog from './<EntityName>EditDialog.vue'
import { use<EntityName> } from './use<EntityName>'

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

### Step 5 — \<EntityName\>EditDialog.vue（如有 create / edit）

**严格遵守"主业务 / 子业务分层"约定**（见顶部设计哲学）：

- Dialog 自包含：自己的 formModel / submitting / rules / reset
- Dialog 通过 `props.onSubmit` 接收提交逻辑，`await` 调用，`try/finally` 保证 submitting 一定重置
- Dialog **不知道**调哪个 API、不知道是 create 还是 update
- 成功路径：`await props.onSubmit()` 正常结束 → `visible.value = false`
- 失败路径：`await props.onSubmit()` 抛出（axios 已 toast）→ catch 捕获，Dialog 保持打开，用户改字段重试

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
    <el-form ref="formRef" :model="formModel" :rules="rules" label-width="120px">
      <el-form-item label="名称" prop="name">
        <el-input v-model="formModel.name" maxlength="32" show-word-limit placeholder="请输入名称" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        {{ row ? '保存' : '创建' }}
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

## 强制规则

1. **业务下拉一律用组件，不在 constants 里硬塞 options**：需要远程下拉时调 `vue-scaffold-component` 子 skill 先封装一个，再在 constants `render` 里用
2. **api 文件函数名统一标准化**：`getList` / `getDetail` / `createItem` / `updateItem` / `deleteItem`，**不加实体名前缀**。调用方用 `import * as api from './api'` + `api.getList(...)` 形式
3. **api 文件返回 Promise<T>**，不包 ApiResponse
4. **composable 名字必须以 `use` 开头**
5. **view 的 `<script setup>` 不超过 50 行**，超过就该拆 composable
6. **错误 catch 块默认空**（错误信息已由 axios 拦截器统一 toast）
7. **reactive → ref**：所有状态用 `ref()`
8. **路由 meta.title 直接中文**
9. **Dialog 不直接调业务接口**：通过 `props.onSubmit: (payload) => Promise<void>` 把提交逻辑注入 Dialog；Dialog `await props.onSubmit()`，`try/finally` 保证 submitting 一定重置，成功后 `visible.value = false`
10. **主 composable handler 是纯 async 函数**：无 callback 参数，失败让 axios 自然 throw 使 Dialog 保持打开，成功时 `refresh()`

## 反模式

- ❌ 在 `<Module>List.vue` 里写业务逻辑（拆 composable）
- ❌ `getXxxList().then(res => res.data?.data)` 这种链式（用 `await + 拦截器`）
- ❌ **API 函数名带实体前缀**：`getRoleList` / `createRole` / `deleteContractWhitelist`（模块目录已经是命名空间，应统一为 `getList` / `createItem`）
- ❌ **API 用命名导入挑挑拣拣**：`import { getList, createItem, deleteItem } from './api'`（用 `import * as api from './api'` 一次性引入，更清楚也少改 import 行）
- ❌ 字典 select 用 `el: 'select', options: xxxOptions`（用组件 + render）
- ❌ 弹窗模板塞进列表页 vue 文件（独立 vue 文件 + props/emit）
- ❌ **把 Dialog 的 formModel / submitting / rules 抽到 `useXxxCreate()` 这种独立 hook**（状态散落，应该自包含在 Dialog 内部）
- ❌ **`emit('submit', payload, callback)` 模式**——callback 不被调时 submitting 卡死，改用 `props.onSubmit` async 函数
- ❌ **Dialog 里 `watch formModel` 重置 submitting**——这是 emit+callback 的补丁，`props.onSubmit` + `try/finally` 不需要此兜底
- ❌ **为了"形式"把简单 confirm 弹窗拆成独立组件**（小于 20 行 / 不复用 / 没有自己的 form state 的就不要拆）
- ❌ `meta.title: 'MENU_ROLE'` i18n key（直接中文）

## 完成后验证

1. `pnpm dev` 启动
2. 访问 `/<module-name>/list` 应能看到表格
3. 查询区字段渲染正确，点击查询能调接口
4. 操作列按钮可点（即便接口未联调也能弹 toast）
5. 路由切换浏览器 tab 标题应该是 `<列表标题> - <VITE_APP_TITLE>`

## 引用

详细模板在主 skill `vue-scaffold-app/references/` 下；本子 skill 内嵌的代码片段已是最小可运行版本。
