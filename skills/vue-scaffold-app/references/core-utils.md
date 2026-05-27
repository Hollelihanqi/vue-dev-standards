# core-utils —— 工具层完整模板

工具层是整个工程的"中枢"，三个文件决定了所有业务方的写法：
- `axios.ts` —— 统一拦截、错误 toast、`Request` 类型，业务层不再判 code
- `crypto.ts` —— RSA 分段加密，所有需要加密的接口共用
- `portal.ts` —— 分页 / 字典 / 空值 / 下载等通用辅助

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
export const getRoleList = (params: PageParams) =>
  request.post<PageResult<Role>>('/xxx/role/list', params)

// 业务层（不关心错误，靠拦截器 toast）：
const data = await getRoleList(params)

// 业务层（需要特殊分支）：
try {
  const data = await getRoleList(params)
} catch (e) {
  if (e instanceof ApiError && e.code === 1001) { /* 自定义处理 */ }
}
```

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

## src/utils/portal.ts

```ts
export interface PageParams {
  pageNum?: number
  pageSize?: number
  [key: string]: unknown
}

export interface PageResult<T> {
  items: T[]
  total: number
}

export interface StatusOption {
  cseDesc: string
  cseValue: string | number
  csePCode?: string
}

// 将表格组件的扁平分页参数转换为后端统一的 page + data 结构。
export const createPagePayload = (params: PageParams) => {
  const { pageNum = 1, pageSize = 10, ...data } = params

  return {
    page: {
      pageNum,
      pageSize,
    },
    data,
  }
}

// 兼容不同接口返回的分页字段，把后端 body 整理成表格可直接消费的数据结构。
// 入参 body 是 axios 封装层已 unwrap 后的业务数据（即 ApiResponse.data）。
export const pickPageResult = <T>(body: any): PageResult<T> => {
  return {
    items: Array.isArray(body?.data) ? body.data : Array.isArray(body?.items) ? body.items : [],
    total: Number(body?.resultPageInfo?.total ?? body?.total ?? 0),
  }
}

// 将后端字典数组转成 Map，便于列表渲染时快速把状态值翻译成文案。
export const createOptionMap = (list: StatusOption[]) => {
  return new Map(list.map(item => [String(item.cseValue), item.cseDesc]))
}

// 详情页空值统一显示占位符，避免页面出现 null、undefined 或空字符串。
export const formatEmpty = (value: unknown) => {
  if (value === null || value === undefined || value === '') {
    return '--'
  }

  return String(value)
}

// 通过隐藏 a 标签触发文件下载；相对接口地址会自动补上 /api 代理前缀。
export const downloadByUrl = (url: string) => {
  const link = document.createElement('a')
  link.href = url.startsWith('/api') ? url : `/api${url}`
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
```

### 使用约定

```ts
// 业务 api 标准分页写法
export const getRoleList = async (params: PageParams) => {
  const body = await request.post('/xxx/role/list', createPagePayload(params))
  return pickPageResult<Role>(body)
}

// 字典处理
const statusList = await getStatusOptions('PORTAL_XXX_STATUS')
const statusMap = createOptionMap(statusList)
// 然后在表格列里：formatText: row => statusMap.get(String(row.status)) || formatEmpty(row.status)
```

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

## src/utils/file.ts

```ts
// 项目内常见的文件相关辅助函数；按需扩展。
export const readImageAsDataURL = (file: File) => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export const formatFileSize = (size: number) => {
  if (!Number.isFinite(size) || size <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const idx = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1)
  return `${(size / Math.pow(1024, idx)).toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`
}
```

---

## src/utils/index.ts

```ts
// 工具统一出口。
// 不同模块的工具放到不同文件，这里只做 re-export，避免业务文件深度 import 路径。
export * from './portal'
export * from './crypto'
export * from './file'
```
