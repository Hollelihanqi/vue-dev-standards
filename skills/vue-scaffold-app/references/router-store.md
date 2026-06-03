# router-store —— 路由、状态、跨模块 API 模板

router 负责权限守卫、面包屑生成、tab 标题同步；store 负责应用级 UI 状态与登录态持久化；`src/api/` 放跨模块的通用接口（如 logout、字典查询）。

---

## src/store/index.ts

```ts
import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

export default pinia;
```

---

## src/store/app.ts

> **强制规范**：store 内**禁止**直接调用 `localStorage.setItem` / `localStorage.getItem` / `localStorage.removeItem` / `localStorage.clear()` / `sessionStorage.setItem` / `sessionStorage.getItem` / `sessionStorage.removeItem` / `sessionStorage.clear()`。所有跨会话持久化一律通过 `defineStore` 的第三参数 `persist` 选项配置（`pinia-plugin-persistedstate`），**手动 localStorage / sessionStorage 调用一律视为反模式**。瞬态状态（pageTitle / breadcrumbs / dialog visible 等）通过不在 `persist.pick` 里出现的方式自然排除。

```ts
import { defineStore } from "pinia";

export interface AppBreadcrumbItem {
  title: string;
  path?: string;
  name?: string;
  clickable?: boolean;
}

export const useAppStore = defineStore(
  "app",
  () => {
    // 持久化字段：language / sidebarCollapsed / systemConf 走 persistedstate；
    // pageTitle / breadcrumbs / passwordExpiryDialogVisible / routeReloadTokens 是
    // 路由切换 / 弹窗状态等瞬态数据，不进 persist.pick。
    const language = ref<"zh-CN" | "en-US">("zh-CN");
    const sidebarCollapsed = ref(false);
    const pageTitle = ref("");
    const breadcrumbs = ref<AppBreadcrumbItem[]>([]);
    const routeReloadTokens = ref<Record<string, number>>({});
    // 系统配置（如 getSysConf 返回的全局配置）也走持久化，跟登录态解耦。
    const systemConf = ref<Record<string, any> | null>(null);

    const setLanguage = (value: "zh-CN" | "en-US") => {
      language.value = value;
    };

    const setSidebarCollapsed = (value: boolean) => {
      sidebarCollapsed.value = value;
    };

    const toggleSidebar = () => {
      setSidebarCollapsed(!sidebarCollapsed.value);
    };

    const setPageTitle = (value: string) => {
      pageTitle.value = value;
    };

    const setBreadcrumbs = (value: AppBreadcrumbItem[]) => {
      breadcrumbs.value = value;
    };

    const setSystemConf = (value: Record<string, any>) => {
      systemConf.value = value;
    };

    const bumpRouteReloadToken = (path: string) => {
      routeReloadTokens.value = {
        ...routeReloadTokens.value,
        [path]: (routeReloadTokens.value[path] || 0) + 1,
      };
    };

    const resetAppState = () => {
      pageTitle.value = "";
      breadcrumbs.value = [];
    };

    return {
      language,
      sidebarCollapsed,
      pageTitle,
      breadcrumbs,
      routeReloadTokens,
      systemConf,
      setLanguage,
      setSidebarCollapsed,
      toggleSidebar,
      setPageTitle,
      setBreadcrumbs,
      setSystemConf,
      bumpRouteReloadToken,
      resetAppState,
    };
  },
  {
    // 只持久化跨会话有意义的字段，瞬态状态故意不进 pick。
    persist: {
      pick: ["language", "sidebarCollapsed", "systemConf"],
    },
  },
);
```

> **`routeReloadTokens` / `bumpRouteReloadToken` 是 keep-alive 的强制重载开关，不是面包屑逻辑。**
> `Main.vue` 把 token 拼进 keep-alive 的 key（`name:token`）；token 不变时页面走缓存、保留状态，token +1 则 key 变化、缓存失效、页面重新挂载并拉数据。
> 典型用法：详情页改完数据返回列表前调 `bumpRouteReloadToken('/xxx/list')`，让被缓存的列表页自动刷新最新数据。没有这类需求时它就是预留能力，留着无副作用。

---

## src/store/auth.ts

```ts
import { defineStore } from "pinia";

export interface AuthUserInfo {
  userId?: number | string;
  userName?: string;
  loginName?: string;
  phone?: string;
  [key: string]: unknown;
}

export const useAuthStore = defineStore(
  "auth",
  () => {
    // 登录态全部走 persistedstate 持久化（见 store 末尾的 persist 配置）；
    // 不写任何 localStorage.setItem / getItem / sessionStorage.setItem / getItem。
    const token = ref("");
    const userInfo = ref<AuthUserInfo | null>(null);
    const permissions = ref<string[]>([]);

    // 兼容只有用户信息（后端用 cookie 维持会话）的场景：拿到 userInfo 也视为已登录。
    const isLogin = computed(() => {
      return Boolean(
        token.value || userInfo.value?.userId || userInfo.value?.loginName,
      );
    });

    const setToken = (value: string) => {
      token.value = value;
    };

    const clearToken = () => {
      token.value = "";
    };

    const setUserInfo = (value: AuthUserInfo | null) => {
      userInfo.value = value;
    };

    const setPermissions = (value: string[]) => {
      permissions.value = value;
    };

    const setAuthData = (payload: {
      token?: string;
      userInfo?: AuthUserInfo | null;
      permissions?: string[];
    }) => {
      if (payload.token !== undefined) setToken(payload.token);
      if (payload.userInfo !== undefined) setUserInfo(payload.userInfo);
      if (payload.permissions !== undefined)
        setPermissions(payload.permissions);
    };

    // 退出 / 会话过期：只重置认证字段的 in-memory state，persistedstate 自动同步
    // 空值回 localStorage。其他 store（appStore.systemConf / 语言 / 侧边栏偏好等）保持不变。
    // 注意：禁止在这里调 localStorage.clear() / sessionStorage.clear()——会把跟登录态无关的偏好也误伤。
    const clearAuth = () => {
      token.value = "";
      userInfo.value = null;
      permissions.value = [];
    };

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
    };
  },
  {
    persist: {
      pick: ["token", "userInfo", "permissions"],
    },
  },
);
```

---

## src/api/index.ts

```ts
import { request } from "@/utils/request";

// 退出登录接口（路径按后端约定调整）。
export const logoutApi = () => {
  return request.post("/xxx/logout/user");
};
```

仅放与具体业务模块**无关**的跨页面通用接口。绝大多数业务接口应该按模块放到 `src/views/<module>/api.ts`。

---

## src/router/index.ts

```ts
import {
  createRouter,
  createWebHistory,
  type RouteLocationNormalizedLoaded,
  type RouteRecordRaw,
} from "vue-router";

import Layout from "@/layout/Layout.vue";
import { useAppStore, type AppBreadcrumbItem } from "@/store/app";
import { useAuthStore } from "@/store/auth";

const Login = () => import("@/system-views/login/Login.vue");
const Register = () => import("@/system-views/register/Register.vue");
const ResetPassword = () =>
  import("@/system-views/reset-password/ResetPassword.vue");

// 业务模块路由组件按需添加（懒加载）：
// const ExampleList = () => import('@/views/example/ExampleList.vue')

export interface AppRouteMeta {
  title: string;
  icon?: string;
  hideMenu?: boolean;
  alwaysShow?: boolean;
  keepAlive?: boolean;
  breadcrumbTrail?: Array<{
    title: string;
    path?: string;
    name?: string;
    clickable?: boolean;
  }>;
  breadcrumbClickable?: boolean;
}

// 应用默认入口（登录后首屏）：按主业务模块路径配置。
export const DEFAULT_ROUTE_PATH = "/example/list";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    redirect: DEFAULT_ROUTE_PATH,
    meta: { hideMenu: true },
  },
  {
    path: "/login",
    name: "Login",
    component: Login,
    meta: { title: "登录", hideMenu: true } satisfies AppRouteMeta,
  },
  {
    path: "/register",
    name: "Register",
    component: Register,
    meta: { title: "注册", hideMenu: true } satisfies AppRouteMeta,
  },
  {
    path: "/reset-password",
    name: "ResetPassword",
    component: ResetPassword,
    meta: { title: "重置密码", hideMenu: true } satisfies AppRouteMeta,
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
    path: "/:pathMatch(.*)*",
    redirect: DEFAULT_ROUTE_PATH,
    meta: { hideMenu: true },
  },
];

// 不需要登录的页面。
const whiteList = ["/login", "/register", "/reset-password"];

// 联调期允许未登录访问的业务页。联调完成后清空该数组。
const temporaryViewsWhiteList: string[] = [];

export const isTemporaryViewsWhiteRoute = (path: string) =>
  temporaryViewsWhiteList.includes(path);

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 根据当前匹配路由和显式 breadcrumbTrail 生成面包屑。
// 隐藏菜单的详情页通过 breadcrumbTrail 指回对应列表页，避免面包屑断层。
const createBreadcrumbs = (route: RouteLocationNormalizedLoaded) => {
  // 与 buildMenuTree 同步：单可见子路由（无 alwaysShow）的父模块在菜单里被提升为一级，
  // 面包屑同样丢掉该父模块层，保证菜单层级 == 面包屑层级。
  const isPromotedParent = (record: (typeof route.matched)[number]) => {
    const visibleChildren = (record.children || []).filter(
      (child) => child.meta?.title && !child.meta.hideMenu,
    );
    return visibleChildren.length === 1 && !record.meta?.alwaysShow;
  };

  const matched = route.matched.filter((item) => item.meta.title);
  const matchedItems = matched
    .filter(
      (item, index) => !(index < matched.length - 1 && isPromotedParent(item)),
    )
    .map((item) => ({
      title: item.meta.title as string,
      path: item.path,
      name: item.name?.toString(),
      clickable: item.meta.breadcrumbClickable !== false,
    }));

  const trail =
    (route.meta.breadcrumbTrail as AppRouteMeta["breadcrumbTrail"]) || [];
  const markCurrentUnclickable = (items: AppBreadcrumbItem[]) => {
    return items.map((item, index, list) => ({
      ...item,
      clickable: index === list.length - 1 ? false : item.clickable !== false,
    }));
  };

  if (!trail.length) {
    return markCurrentUnclickable(matchedItems);
  }

  const rootItems = matchedItems.slice(0, -1);
  const currentItem = matchedItems.at(-1);

  return markCurrentUnclickable([
    ...rootItems,
    ...trail,
    ...(currentItem ? [currentItem] : []),
  ]);
};

router.beforeEach(async (to) => {
  const authStore = useAuthStore();

  if (
    !authStore.isLogin &&
    !whiteList.includes(to.path) &&
    !isTemporaryViewsWhiteRoute(to.path)
  ) {
    return "/login";
  }

  if (authStore.isLogin && to.path === "/login") {
    return DEFAULT_ROUTE_PATH;
  }

  return true;
});

const APP_TITLE = import.meta.env.VITE_APP_TITLE || "";

router.afterEach((to) => {
  const appStore = useAppStore();
  appStore.setBreadcrumbs(createBreadcrumbs(to));
  const pageTitle = (to.meta.title as string) || "";
  appStore.setPageTitle(pageTitle);
  document.title = pageTitle ? `${pageTitle} - ${APP_TITLE}` : APP_TITLE;
});

export const menuRoutes = routes;
export default router;
```

### 路由约定要点

| 项                         | 约定                                                                    |
| -------------------------- | ----------------------------------------------------------------------- |
| `meta.title`               | **直接中文**，不要 i18n key                                             |
| `meta.icon`                | element-plus icon 名（如 `User` / `Connection`），由 `TheMenuItem` 渲染 |
| `meta.hideMenu`            | 不在侧边菜单展示（登录页 / 详情页都加）                                 |
| `meta.alwaysShow`          | 即使只有一个子路由也显示父级菜单                                        |
| `meta.keepAlive`           | 列表页保活，详情返回时滚动位置 / 表单状态保留                           |
| `meta.breadcrumbTrail`     | 详情页指回列表页，避免面包屑断层                                        |
| `meta.breadcrumbClickable` | 父级路由是否可点（一般父级不可点）                                      |

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
