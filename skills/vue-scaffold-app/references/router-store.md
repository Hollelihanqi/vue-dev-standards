# router-store —— 路由、状态、跨模块 API 模板

router 负责权限守卫、面包屑生成、tab 标题同步；store 负责应用级 UI 状态与登录态持久化；`src/api/` 放跨模块的通用接口（如 logout、字典查询）。

---

## src/store/index.ts

```ts
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

export default pinia
```

---

## src/store/app.ts

```ts
import { defineStore } from 'pinia'

export interface AppBreadcrumbItem {
  title: string
  path?: string
  name?: string
  clickable?: boolean
}

const APP_LANGUAGE_KEY = 'app-language'
const APP_SIDEBAR_KEY = 'app-sidebar-collapsed'

const getInitialLanguage = (): 'zh-CN' | 'en-US' => {
  return localStorage.getItem(APP_LANGUAGE_KEY) === 'en-US' ? 'en-US' : 'zh-CN'
}

const getInitialSidebarCollapsed = () => {
  return localStorage.getItem(APP_SIDEBAR_KEY) === 'true'
}

export const useAppStore = defineStore('app', () => {
  const language = ref<'zh-CN' | 'en-US'>(getInitialLanguage())
  const sidebarCollapsed = ref(getInitialSidebarCollapsed())
  const pageTitle = ref('')
  const breadcrumbs = ref<AppBreadcrumbItem[]>([])
  const routeReloadTokens = ref<Record<string, number>>({})

  const setLanguage = (value: 'zh-CN' | 'en-US') => {
    language.value = value
    localStorage.setItem(APP_LANGUAGE_KEY, value)
  }

  const setSidebarCollapsed = (value: boolean) => {
    sidebarCollapsed.value = value
    localStorage.setItem(APP_SIDEBAR_KEY, String(value))
  }

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed.value)
  }

  const setPageTitle = (value: string) => {
    pageTitle.value = value
  }

  const setBreadcrumbs = (value: AppBreadcrumbItem[]) => {
    breadcrumbs.value = value
  }

  const bumpRouteReloadToken = (path: string) => {
    routeReloadTokens.value = {
      ...routeReloadTokens.value,
      [path]: (routeReloadTokens.value[path] || 0) + 1,
    }
  }

  const resetAppState = () => {
    pageTitle.value = ''
    breadcrumbs.value = []
    routeReloadTokens.value = {}
  }

  return {
    language,
    sidebarCollapsed,
    pageTitle,
    breadcrumbs,
    routeReloadTokens,
    setLanguage,
    setSidebarCollapsed,
    toggleSidebar,
    setPageTitle,
    setBreadcrumbs,
    bumpRouteReloadToken,
    resetAppState,
  }
})
```

---

## src/store/auth.ts

```ts
import { defineStore } from 'pinia'

export interface AuthUserInfo {
  userId?: number | string
  userName?: string
  loginName?: string
  phone?: string
  [key: string]: unknown
}

const AUTH_TOKEN_KEY = 'auth-token'
const AUTH_USER_KEY = 'auth-user'
const AUTH_PERMISSION_KEY = 'auth-permissions'

const getInitialToken = () => {
  return localStorage.getItem(AUTH_TOKEN_KEY) ?? ''
}

const getInitialUserInfo = (): AuthUserInfo | null => {
  const raw = localStorage.getItem(AUTH_USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUserInfo
  } catch {
    return null
  }
}

const getInitialPermissions = () => {
  const raw = localStorage.getItem(AUTH_PERMISSION_KEY)
  if (!raw) return [] as string[]
  try {
    const permissions = JSON.parse(raw) as string[]
    return Array.isArray(permissions) ? permissions : []
  } catch {
    return []
  }
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref(getInitialToken())
  const userInfo = ref<AuthUserInfo | null>(getInitialUserInfo())
  const permissions = ref<string[]>(getInitialPermissions())

  // 兼容只有用户信息（后端用 cookie 维持会话）的场景：拿到 userInfo 也视为已登录。
  const isLogin = computed(() => {
    return Boolean(token.value || userInfo.value?.userId || userInfo.value?.loginName)
  })

  const setToken = (value: string) => {
    token.value = value
    localStorage.setItem(AUTH_TOKEN_KEY, value)
  }

  const clearToken = () => {
    token.value = ''
    localStorage.removeItem(AUTH_TOKEN_KEY)
  }

  const setUserInfo = (value: AuthUserInfo | null) => {
    userInfo.value = value
    if (value) {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(value))
    } else {
      localStorage.removeItem(AUTH_USER_KEY)
    }
  }

  const setPermissions = (value: string[]) => {
    permissions.value = value
    localStorage.setItem(AUTH_PERMISSION_KEY, JSON.stringify(value))
  }

  const setAuthData = (payload: {
    token?: string
    userInfo?: AuthUserInfo | null
    permissions?: string[]
  }) => {
    if (payload.token !== undefined) setToken(payload.token)
    if (payload.userInfo !== undefined) setUserInfo(payload.userInfo)
    if (payload.permissions !== undefined) setPermissions(payload.permissions)
  }

  const clearAuth = () => {
    clearToken()
    setUserInfo(null)
    permissions.value = []
    localStorage.removeItem(AUTH_PERMISSION_KEY)
  }

  return {
    token,
    userInfo,
    permissions,
    isLogin,
    setToken,
    clearToken,
    setUserInfo,
    setPermissions,
    setAuthData,
    clearAuth,
  }
})
```

---

## src/api/index.ts

```ts
import { request } from '@/utils/axios'

// 退出登录接口（路径按后端约定调整）。
export const logoutApi = () => {
  return request.post('/xxx/logout/user')
}
```

仅放与具体业务模块**无关**的跨页面通用接口。绝大多数业务接口应该按模块放到 `src/views/<module>/api.ts`。

---

## src/api/portal.ts

```ts
import { request, requestWithLoading } from '@/utils/axios'
import type { StatusOption } from '@/utils/portal'

// 查询通用状态字典，用于列表筛选、状态展示等轻量配置项。
export const getStatusOptions = (csePCode: string) => {
  return request.post<StatusOption[]>('/xxx/anon/v1/status/data/searches', { csePCode })
}

export { request, requestWithLoading }
```

`request` / `requestWithLoading` 从这里 re-export，业务模块 `import from '@/api/portal'` 就能拿到（避免直接依赖 `@/utils/axios`）。

---

## src/router/index.ts

```ts
import { createRouter, createWebHistory, type RouteLocationNormalizedLoaded, type RouteRecordRaw } from 'vue-router'

import Layout from '@/layout/Layout.vue'
import { useAppStore, type AppBreadcrumbItem } from '@/store/app'
import { useAuthStore } from '@/store/auth'

const Login = () => import('@/system-views/login/Login.vue')
const Register = () => import('@/system-views/register/Register.vue')
const ResetPassword = () => import('@/system-views/reset-password/ResetPassword.vue')

// 业务模块路由组件按需添加（懒加载）：
// const ExampleList = () => import('@/views/example/ExampleList.vue')

export interface AppRouteMeta {
  title: string
  icon?: string
  hideMenu?: boolean
  alwaysShow?: boolean
  keepAlive?: boolean
  breadcrumbTrail?: Array<{
    title: string
    path?: string
    name?: string
    clickable?: boolean
  }>
  breadcrumbClickable?: boolean
}

// 应用默认入口（登录后首屏）：按主业务模块路径配置。
export const DEFAULT_ROUTE_PATH = '/example/list'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: DEFAULT_ROUTE_PATH,
    meta: { hideMenu: true },
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { title: '登录', hideMenu: true } satisfies AppRouteMeta,
  },
  {
    path: '/register',
    name: 'Register',
    component: Register,
    meta: { title: '注册', hideMenu: true } satisfies AppRouteMeta,
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: ResetPassword,
    meta: { title: '重置密码', hideMenu: true } satisfies AppRouteMeta,
  },

  // ---------- 业务模块路由示例 ----------
  // {
  //   path: '/example',
  //   component: Layout,
  //   name: 'ExampleRoot',
  //   redirect: '/example/list',
  //   meta: { title: '示例模块', icon: 'List', alwaysShow: true, breadcrumbClickable: false },
  //   children: [
  //     {
  //       path: 'list',
  //       name: 'ExampleList',
  //       component: ExampleList,
  //       meta: { title: '示例列表', keepAlive: true } satisfies AppRouteMeta,
  //     },
  //   ],
  // },

  {
    path: '/:pathMatch(.*)*',
    redirect: DEFAULT_ROUTE_PATH,
    meta: { hideMenu: true },
  },
]

// 不需要登录的页面。
const whiteList = ['/login', '/register', '/reset-password']

// 联调期允许未登录访问的业务页。联调完成后清空该数组。
const temporaryViewsWhiteList: string[] = []

export const isTemporaryViewsWhiteRoute = (path: string) => temporaryViewsWhiteList.includes(path)

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 根据当前匹配路由和显式 breadcrumbTrail 生成面包屑。
// 隐藏菜单的详情页通过 breadcrumbTrail 指回对应列表页，避免面包屑断层。
const createBreadcrumbs = (route: RouteLocationNormalizedLoaded) => {
  const matchedItems = route.matched
    .filter(item => item.meta.title)
    .map(item => ({
      title: item.meta.title as string,
      path: item.path,
      name: item.name?.toString(),
      clickable: item.meta.breadcrumbClickable !== false,
    }))

  const trail = (route.meta.breadcrumbTrail as AppRouteMeta['breadcrumbTrail']) || []
  const markCurrentUnclickable = (items: AppBreadcrumbItem[]) => {
    return items.map((item, index, list) => ({
      ...item,
      clickable: index === list.length - 1 ? false : item.clickable !== false,
    }))
  }

  if (!trail.length) {
    return markCurrentUnclickable(matchedItems)
  }

  const rootItems = matchedItems.slice(0, -1)
  const currentItem = matchedItems.at(-1)

  return markCurrentUnclickable([
    ...rootItems,
    ...trail,
    ...(currentItem ? [currentItem] : []),
  ])
}

router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  if (!authStore.isLogin && !whiteList.includes(to.path) && !isTemporaryViewsWhiteRoute(to.path)) {
    return '/login'
  }

  if (authStore.isLogin && to.path === '/login') {
    return DEFAULT_ROUTE_PATH
  }

  return true
})

const APP_TITLE = import.meta.env.VITE_APP_TITLE || ''

router.afterEach((to) => {
  const appStore = useAppStore()
  appStore.setBreadcrumbs(createBreadcrumbs(to))
  const pageTitle = (to.meta.title as string) || ''
  appStore.setPageTitle(pageTitle)
  document.title = pageTitle ? `${pageTitle} - ${APP_TITLE}` : APP_TITLE
})

export const menuRoutes = routes
export default router
```

### 路由约定要点

| 项 | 约定 |
|---|---|
| `meta.title` | **直接中文**，不要 i18n key |
| `meta.icon` | element-plus icon 名（如 `User` / `Connection`），由 `TheMenuItem` 渲染 |
| `meta.hideMenu` | 不在侧边菜单展示（登录页 / 详情页都加） |
| `meta.alwaysShow` | 即使只有一个子路由也显示父级菜单 |
| `meta.keepAlive` | 列表页保活，详情返回时滚动位置 / 表单状态保留 |
| `meta.breadcrumbTrail` | 详情页指回列表页，避免面包屑断层 |
| `meta.breadcrumbClickable` | 父级路由是否可点（一般父级不可点） |

详情页路由 meta 示例：

```ts
{
  path: 'detail',
  name: 'ExampleDetail',
  component: () => import('@/views/example/ExampleDetail.vue'),
  meta: {
    title: '示例详情',
    hideMenu: true,
    breadcrumbTrail: [
      { title: '示例列表', path: '/example/list', name: 'ExampleList' },
    ],
  } satisfies AppRouteMeta,
}
```
