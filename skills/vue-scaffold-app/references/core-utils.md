# core-utils —— 工具层完整模板

工具层是整个工程的"中枢"，三个文件决定了所有业务方的写法：
- `axios.ts` —— 统一拦截、错误 toast、`Request` 类型，业务层不再判 code
- `crypto.ts` —— RSA 分段加密，所有需要加密的接口共用
- `common.ts` —— 真正与项目无关的通用辅助（空值占位等）
- `rules.ts` —— Element Plus 表单校验规则统一收口

> **不要预置分页 / 字典 / 文件下载工具**。这些与后端接口约定强绑定（`pageNum/pageSize` 还是 `current/size`、字典字段叫 `cseValue` 还是别的、下载是否要 `/api` 前缀等），每个项目情况都不一样，跟着开发过程沉淀，不要在脚手架里固化。

---

## src/utils/axios.ts

```ts
import axios, { AxiosHeaders, type AxiosError, type AxiosInstance, type AxiosRequestConfig, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { ElLoading, ElMessage } from 'element-plus'

import { logoutApi } from '@/api'
import router, { DEFAULT_ROUTE_PATH, isTemporaryViewsWhiteRoute } from '@/router'
import pinia from '@/store'
import { useAuthStore } from '@/store/auth'

export interface ApiResponse<T = unknown> {
  code: number
  data: T
  message: string
  errorLogCode?: string
  total?: number
  items?: T[]
  [key: string]: unknown
}

// 业务异常：拦截器在 code !== 0 / HTTP 错误 / 网络错误时统一抛出。
// 业务层捕获后可读 code 做特殊分支，不读 code 也行（错误已 toast）。
export class ApiError extends Error {
  readonly name = 'ApiError'
  constructor(
    readonly code: number,
    message: string,
    readonly payload?: ApiResponse,
  ) {
    super(message)
  }
}

// 业务层拿到的请求对象：返回 Promise<T>，T 是后端 data.data 的形状。
export interface Request {
  <T = unknown>(config: AxiosRequestConfig): Promise<T>
  get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>
  delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>
  head<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>
  options<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>
  post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
  put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
  patch<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
}

interface InternalRequestConfig<D = unknown> extends InternalAxiosRequestConfig<D> {
  showLoading?: boolean
}

const DEFAULT_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT ?? 60000)
const DEFAULT_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'
const FALLBACK_MESSAGE = '服务内部异常'
const SYSTEM_ERROR_MESSAGE = '系统异常'
const SESSION_EXPIRED_MESSAGE = '您的会话已结束或尚未登录！'

const authStore = useAuthStore(pinia)

let loadingCount = 0
let loadingInstance: ReturnType<typeof ElLoading.service> | null = null
let isHandlingUnauthorized = false

const createAxiosClient = () => axios.create({
  baseURL: DEFAULT_BASE_URL,
  timeout: DEFAULT_TIMEOUT,
  headers: {
    'x-requested-with': 'XMLHttpRequest',
    'x-frame-options': 'SAMEORIGIN',
    'X-Content-Type-Options': 'nosniff',
  },
})

const setHeader = (headers: InternalAxiosRequestConfig['headers'], key: string, value: string) => {
  const nextHeaders = headers instanceof AxiosHeaders ? headers : AxiosHeaders.from(headers)
  nextHeaders.set(key, value)
  return nextHeaders
}

const openLoading = () => {
  loadingCount += 1
  if (loadingCount === 1) {
    loadingInstance = ElLoading.service({
      lock: true,
      text: 'Loading...',
      background: 'rgba(0, 0, 0, 0.35)',
    })
  }
}

const closeLoading = () => {
  if (loadingCount > 0) loadingCount -= 1
  if (loadingCount === 0 && loadingInstance) {
    loadingInstance.close()
    loadingInstance = null
  }
}

const showError = (message: string) => {
  ElMessage({ message, grouping: true, type: 'error' })
}

const handleUnauthorized = async () => {
  if (isTemporaryViewsWhiteRoute(router.currentRoute.value.path)) return
  if (isHandlingUnauthorized) return

  isHandlingUnauthorized = true
  try {
    await logoutApi().catch(() => undefined)
    authStore.clearAuth()
    setTimeout(() => { void router.push({ name: 'Login' }) }, 60)
  } finally {
    isHandlingUnauthorized = false
  }
}

// 业务码统一解码：code === 0 返回 data.data；否则 toast + throw ApiError。
const unwrapBusinessCode = <T>(response: AxiosResponse<ApiResponse<T>>): T => {
  const payload = response.data
  const fallback = payload?.message || FALLBACK_MESSAGE

  if (payload?.code === 0) {
    return payload.data
  }

  switch (payload?.code) {
    case -1:
      showError(`${SYSTEM_ERROR_MESSAGE}: ${payload.errorLogCode ?? ''}`)
      break

    case -2:
      if (payload.message === 'MSG_20010005' || payload.message === 'MSG_10010004') {
        if (!isTemporaryViewsWhiteRoute(router.currentRoute.value.path)) {
          setTimeout(() => { void router.push({ name: 'Login' }) })
          ElMessage({ message: SESSION_EXPIRED_MESSAGE, type: 'warning', duration: 3000 })
        }
      } else {
        showError(fallback)
      }
      break

    case -3:
      if (!isTemporaryViewsWhiteRoute(router.currentRoute.value.path)) {
        void handleUnauthorized()
      }
      break

    default:
      showError(fallback)
  }

  throw new ApiError(payload?.code ?? -1, fallback, payload)
}

// HTTP / 网络错误：toast + throw ApiError。业务层 catch 时拿到的错误形态与业务码失败一致。
const handleHttpError = (error: AxiosError<ApiResponse>): never => {
  const payload = error.response?.data

  if (!payload) {
    showError(FALLBACK_MESSAGE)
    throw new ApiError(-1, FALLBACK_MESSAGE)
  }

  const message = payload.message || FALLBACK_MESSAGE
  const currentPath = router.currentRoute.value.path

  switch (payload.code) {
    case -2:
      if (!isTemporaryViewsWhiteRoute(currentPath)) {
        showError(message)
        void router.push(DEFAULT_ROUTE_PATH)
      }
      break
    case -3:
      if (!isTemporaryViewsWhiteRoute(currentPath)) {
        showError(message)
        void router.push('/')
      }
      break
    default:
      showError(message)
  }

  throw new ApiError(payload.code, message, payload)
}

const setupInterceptors = (instance: AxiosInstance, showLoading: boolean) => {
  instance.interceptors.request.use((config) => {
    const next = config as InternalRequestConfig
    next.showLoading = showLoading
    if (showLoading) openLoading()
    if (authStore.token) {
      next.headers = setHeader(next.headers, 'token', authStore.token)
    }
    return next
  })

  instance.interceptors.response.use(
    (response) => {
      if ((response.config as InternalRequestConfig).showLoading) closeLoading()
      // 拦截器内部直接返回业务数据。axios 类型层仍认为返回 AxiosResponse，
      // 通过 Request 接口断言，业务层拿到的就是 unwrap 后的 T。
      return unwrapBusinessCode(response) as unknown as AxiosResponse
    },
    (error: AxiosError<ApiResponse>) => {
      if ((error.config as InternalRequestConfig | undefined)?.showLoading) closeLoading()
      return handleHttpError(error)
    },
  )
}

const createRequestInstance = (showLoading: boolean): Request => {
  const instance = createAxiosClient()
  setupInterceptors(instance, showLoading)
  return instance as unknown as Request
}

export const request = createRequestInstance(false)
export const requestWithLoading = createRequestInstance(true)
```

### 使用约定

```ts
// api 文件：直接返回 Promise<T>
export const getRoleList = (params: RoleListQuery) =>
  request.post<{ items: Role[]; total: number }>('/xxx/role/list', params)

// 业务层（不关心错误，靠拦截器 toast）：
const data = await getRoleList(params)

// 业务层（需要特殊分支）：
try {
  const data = await getRoleList(params)
} catch (e) {
  if (e instanceof ApiError && e.code === 1001) { /* 自定义处理 */ }
}
```

> 上面 `RoleListQuery` 与返回结构 `{ items, total }` 是示意——分页字段命名按你们后端实际约定来；脚手架不预置 `PageParams` / `PageResult` 类型。

`-1` / `-2` / `-3` 是后端约定的几种特殊业务码：
- `-1` 系统异常（带 errorLogCode）
- `-2` 会话异常（部分子码触发登录页跳转）
- `-3` 未授权（自动登出）

如果你的后端约定不同，**只改 switch 分支**，不动整体结构。

---

## src/utils/crypto.ts

```ts
import JSEncrypt from 'jsencrypt'

// 后端约定：1024-bit RSA + PKCS#1 v1.5 padding。
// 将 payload JSON 序列化后每 30 字符切一段单独加密，结果拼装为 { code: string[] } 提交。
// 30 字符在最坏情况（全 UTF-8 4 字节字符）逼近 117 字节明文上限，实际 JSON payload 远低于此。
const CHUNK_SIZE = 30

export const rsaEncryptChunks = (payload: unknown, publicKey: string): { code: string[] } => {
  if (!publicKey) {
    throw new Error('RSA public key is required')
  }

  const encrypt = new JSEncrypt()
  encrypt.setPublicKey(publicKey)

  const source = JSON.stringify(payload)
  const chunks: string[] = []

  for (let index = 0; index < source.length; index += CHUNK_SIZE) {
    const encrypted = encrypt.encrypt(source.substring(index, index + CHUNK_SIZE))
    if (encrypted) {
      chunks.push(encrypted)
    }
  }

  return { code: chunks }
}

// 项目内所有需要 RSA 加密的接口共用同一把公钥，从环境变量注入。
export const encryptPayload = <T>(payload: T) => {
  return rsaEncryptChunks(payload, import.meta.env.VITE_RSA_PUBLIC_KEY || '')
}
```

### 使用约定

```ts
// 任意 api 文件
import { encryptPayload } from '@/utils/crypto'

export const registerUser = (params: RegisterPayload) =>
  request.post('/xxx/register/save', encryptPayload(params))

// 表单 form-urlencoded 场景（如登录）
const body = new URLSearchParams()
body.set('code', JSON.stringify(encryptPayload(params).code))
return request.post('/xxx/login', body.toString(), {
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
})
```

**绝对不允许**在业务文件里直接 `new JSEncrypt()` 或硬编码公钥。如果新接口需要不同公钥，扩展 `crypto.ts` 添加 `encryptXxxPayload(payload)`，公钥从新的 env 变量读。

---

## src/utils/common.ts

只放真正与具体后端 / 业务无关的工具。**不放分页封装、不放字典封装、不放下载封装**——这些都跟着项目里第一个用到它的模块再开始写，写在模块自己的 `api.ts` 里，等沉淀出稳定形态再考虑抽到 `common.ts` 或单独文件。

```ts
// 详情页 / 表格空值统一显示占位符，避免页面出现 null、undefined 或空字符串。
export const formatEmpty = (value: unknown) => {
  if (value === null || value === undefined || value === '') {
    return '--'
  }

  return String(value)
}
```

### 不要预置的工具（按需在业务模块沉淀）

- **分页参数 / 返回的整理**：后端可能用 `{page: {pageNum, pageSize}, data}`，也可能用 `{current, size, ...params}`；返回的总数可能在 `resultPageInfo.total` 也可能在 `total`。这些约定不固定，**不要在脚手架里假设**。第一次接入分页接口时，在该模块的 `api.ts` 里直接组装 payload、直接 `pick` 出 `{ items, total }`。等项目里出现 2–3 个用法稳定的分页接口，再考虑下沉到 `common.ts`（命名按你们后端术语定）。
- **字典选项 / Map 转换**：字典接口的字段名（`code/name` / `value/label` / 项目自定义命名）每个项目都不一样，等出现第一个字典需求再说；封装时放业务侧 `api.ts`，或抽到 `custom-components/` 下的字典 Select 组件里。
- **文件相关（下载 / 读图为 dataURL / 文件大小格式化等）**：需要时**统一**收口到 `src/utils/file.ts`（一个文件，不要拆），脚手架不预置。下载是否要 `/api` 前缀、是否需要带 token、是否走 blob 流式下载，每个项目不同——等真正用到再写。

---

## src/utils/rules.ts

Element Plus 表单校验规则统一收口。**所有表单字段，不管必填还是非必填，都必须带 pattern/validator 规则，在 blur 时触发，确保输入合法性。**

```ts
import type { FormItemRule } from 'element-plus'

export const required = (message: string): FormItemRule =>
  ({ required: true, message, trigger: 'blur' })

export const phoneRule: FormItemRule = {
  pattern: /^1[3-9]\d{9}$/,
  message: '手机号格式不正确',
  trigger: 'blur',
}

export const emailRule: FormItemRule = {
  pattern: /^[\w.-]+@[\w.-]+\.\w+$/,
  message: '邮箱格式不正确',
  trigger: 'blur',
}

export const idCardRule: FormItemRule = {
  pattern: /^\d{17}[\dXx]$/,
  message: '身份证号格式不正确',
  trigger: 'blur',
}

export const urlRule: FormItemRule = {
  pattern: /^https?:\/\/.+/,
  message: 'URL 格式不正确',
  trigger: 'blur',
}

export const integerRule: FormItemRule = {
  pattern: /^\d+$/,
  message: '请输入正整数',
  trigger: 'blur',
}
```

### 使用约定

```ts
import { required, phoneRule, emailRule } from '@/utils/rules'

// 必填 + 正则：空值报"请输入"，有值报格式错误
const rules = {
  clientPhone: [required('请输入手机号'), phoneRule],
  clientEmail: [required('请输入邮箱'), emailRule],
}

// 非必填：空值跳过不校验；有值时触发 pattern，不合法报错
// Element Plus 的 pattern 规则对空字符串天然跳过，不需要额外处理
const rules = {
  backupEmail: [emailRule],
}
```

提交时调用 `formRef.value?.validate()` 统一触发所有字段校验，不要绕过。

---

## 不要建 `src/utils/index.ts`

业务文件**直接** import 子文件：

```ts
import { request, requestWithLoading } from '@/utils/axios'
import { encryptPayload } from '@/utils/crypto'
import { formatEmpty } from '@/utils/common'
import { required, phoneRule } from '@/utils/rules'
```

不预置 barrel 出口的原因：
- `axios.ts` 里依赖 `@/store` / `@/router`，barrel 桶导出后任何 utils 引用都会顺带把 store / router 拖进来，容易触发循环依赖
- 没 barrel 时 IDE 跳转更直观，bundle tree-shaking 也更准
- 不同子工具（HTTP / 加密 / 通用辅助 / 校验规则）使用场景差异大，没必要凑到一个出口
