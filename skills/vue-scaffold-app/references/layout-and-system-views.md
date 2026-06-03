# layout-and-system-views —— 主框架与系统页模板

主框架（带菜单 / 顶栏 / 面包屑的工作台）和系统页（登录 / 注册 / 重置密码）是两套独立壳：

- **Layout**：业务页面共用，进入需登录
- **system-views/\<page\>**：登录类页面独立全屏，不走 Layout，自带背景

---

## src/layout/Layout.vue

```vue
<template>
  <div class="layout-root flex h-screen w-screen overflow-hidden">
    <aside
      class="layout-sider flex-shrink-0 h-full overflow-hidden bg-[#001f35] transition-all"
      :class="sidebarCollapsed ? 'w-16' : 'w-[220px]'"
    >
      <TheMenu :routes="menuRoutes" :collapsed="sidebarCollapsed" />
    </aside>

    <section class="layout-body flex-1 flex flex-col min-w-0">
      <TheHeader
        :user-name="userName"
        :collapsed="sidebarCollapsed"
        @open-mobile-menu="openMobileMenu"
        @toggle-sidebar="toggleSidebar"
        @command="handleUserCommand"
      />
      <TheBreadcrumb
        :items="breadcrumbs"
        @breadcrumb-click="handleBreadcrumbClick"
      />
      <Main />
    </section>
  </div>
</template>

<script setup lang="ts">
import Main from "./Main.vue";
import TheBreadcrumb from "./TheBreadcrumb.vue";
import TheHeader from "./TheHeader.vue";
import TheMenu from "./TheMenu.vue";
import { useLayout } from "./useLayout";

const {
  menuRoutes,
  sidebarCollapsed,
  breadcrumbs,
  userName,
  toggleSidebar,
  openMobileMenu,
  handleUserCommand,
  handleBreadcrumbClick,
} = useLayout();
</script>
```

## src/layout/Main.vue

> **KeepAlive 策略由项目自己决定，规范不作硬性要求**。两种写法都可接受：
>
> 1. **`v-if` 条件分支**（下面 A 方案）—— `<keep-alive v-if="route.meta.keepAlive">` + `<router-view v-else>`，显式分流
> 2. **`:include` 白名单**（下面 B 方案）—— 遍历 `router.getRoutes()` 把 `meta.keepAlive` 为 true 的 `name` 收成数组，喂给 `<keep-alive :include>`；集中控制

### A 方案：`v-if` 条件分支

```vue
<template>
  <main class="layout-main flex-1 overflow-hidden p-4 md:px-5">
    <div
      class="h-full w-full max-md:rounded-[0.875rem] max-md:p-3.5 md:rounded-[1rem]"
    >
      <router-view v-slot="{ Component, route }">
        <keep-alive v-if="route.meta?.keepAlive">
          <component
            :is="Component"
            :key="String(routeReloadTokens[route.path] || 0)"
          />
        </keep-alive>
        <component
          v-else
          :is="Component"
          :key="String(routeReloadTokens[route.path] || 0)"
        />
      </router-view>
    </div>
  </main>
</template>

<script setup lang="ts">
import { useAppStore } from "@/store/app";

const appStore = useAppStore();
const routeReloadTokens = computed(() => appStore.routeReloadTokens);
</script>
```

### B 方案：`:include` 白名单

```vue
<template>
  <main class="layout-main flex-1 overflow-hidden p-4 md:px-5">
    <div
      class="h-full w-full max-md:rounded-[0.875rem] max-md:p-3.5 md:rounded-[1rem]"
    >
      <router-view v-slot="{ Component, route }">
        <keep-alive :include="keepAliveNames">
          <component
            :is="Component"
            :key="String(routeReloadTokens[route.path] || 0)"
          />
        </keep-alive>
      </router-view>
    </div>
  </main>
</template>

<script setup lang="ts">
import { useAppStore } from "@/store/app";

const appStore = useAppStore();
const routeReloadTokens = computed(() => appStore.routeReloadTokens);

// 列表页通过 meta.keepAlive 启用缓存；详情页不缓存。
const router = useRouter();
const keepAliveNames = computed(() => {
  return router
    .getRoutes()
    .filter((item) => item.meta?.keepAlive && typeof item.name === "string")
    .map((item) => item.name as string);
});
</script>
```

## src/layout/TheHeader.vue

```vue
<template>
  <div
    class="layout-header flex h-16 items-center justify-between border-b border-[#d8e2ef] bg-white pl-2 pr-4 md:pr-5"
  >
    <div class="flex items-center gap-3">
      <el-button
        class="layout-header__mobile-trigger"
        text
        @click="emit('open-mobile-menu')"
      >
        <el-icon><Fold /></el-icon>
      </el-button>

      <el-button
        class="layout-header__desktop-trigger"
        text
        @click="emit('toggle-sidebar')"
      >
        <el-icon>
          <component :is="collapsed ? Expand : Fold" />
        </el-icon>
      </el-button>
    </div>

    <div class="flex items-center gap-3 text-[#1f2937]">
      <span class="text-16">{{ userName || "admin" }}</span>
      <el-dropdown @command="handleCommand">
        <el-avatar :size="36" :icon="Avatar" class="layout-header__avatar" />
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="changePass">修改密码</el-dropdown-item>
            <el-dropdown-item command="logout">退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Avatar, Expand, Fold } from "@element-plus/icons-vue";

defineProps<{
  userName?: string;
  collapsed: boolean;
}>();

const emit = defineEmits<{
  "open-mobile-menu": [];
  "toggle-sidebar": [];
  command: [command: "changePass" | "logout"];
}>();

const handleCommand = (command: "changePass" | "logout") => {
  emit("command", command);
};
</script>
```

## src/layout/TheMenu.vue / TheMenuItem.vue

`TheMenu` 接收路由数组，过滤掉 `meta.hideMenu`，递归渲染 `TheMenuItem`。`TheMenuItem` 单层菜单直接展示，多层用 `el-sub-menu` 嵌套。两者都用 element-plus 的 `<el-menu>` 系列组件。模板里直接用 `{{ menu.title }}`，**不调用 t()**。

> 完整实现可参考已存在项目的 `src/layout/TheMenu.vue` 与 `TheMenuItem.vue`，与本项目结构高度一致，直接复制即可。

## src/layout/TheBreadcrumb.vue

```vue
<template>
  <nav
    class="layout-breadcrumb flex h-10 items-center gap-1 bg-white px-4 text-13"
  >
    <template v-for="(item, index) in items" :key="`${item.path}-${index}`">
      <span
        class="layout-breadcrumb__item"
        :class="{
          'cursor-pointer text-[#0054a7] hover:underline': item.clickable,
          'text-[#9ca3af]': !item.clickable,
        }"
        @click="handleClick(item)"
      >
        {{ item.title }}
      </span>
      <span v-if="index < items.length - 1" class="text-[#cbd5e1]">/</span>
    </template>
  </nav>
</template>

<script setup lang="ts">
import type { AppBreadcrumbItem } from "@/store/app";

defineProps<{
  items: AppBreadcrumbItem[];
}>();

const emit = defineEmits<{
  "breadcrumb-click": [item: AppBreadcrumbItem];
}>();

const handleClick = (item: AppBreadcrumbItem) => {
  if (!item.clickable || !item.path) return;
  emit("breadcrumb-click", item);
};
</script>
```

## src/layout/useLayout.ts

```ts
import { ElMessageBox } from "element-plus";

import { logoutApi } from "@/api";
import { menuRoutes } from "@/router";
import { useAppStore, type AppBreadcrumbItem } from "@/store/app";
import { useAuthStore } from "@/store/auth";

export interface LayoutMenuRoute {
  path: string;
  title: string;
  icon?: string;
  children?: LayoutMenuRoute[];
}

export const useLayout = () => {
  const router = useRouter();
  const route = useRoute();
  const appStore = useAppStore();
  const authStore = useAuthStore();

  const sidebarCollapsed = computed(() => appStore.sidebarCollapsed);
  const breadcrumbs = computed(() => appStore.breadcrumbs);
  const userName = computed(
    () => authStore.userInfo?.userName || authStore.userInfo?.loginName || "",
  );

  const mobileMenuVisible = ref(false);

  // 将路由配置整理成菜单需要的层级结构（剔除 hideMenu）。
  const buildMenuTree = (routes: typeof menuRoutes): LayoutMenuRoute[] => {
    return routes
      .filter((item) => item.meta?.title && !item.meta.hideMenu)
      .map((route) => {
        const children = (route.children || []).filter(
          (child) => child.meta?.title && !child.meta.hideMenu,
        );

        if (children.length === 1 && !route.meta?.alwaysShow) {
          // 单子节点提升为顶层
          return {
            path: `${route.path}/${children[0].path}`.replace(/\/+/g, "/"),
            title: String(children[0].meta?.title || route.meta?.title || ""),
            icon: String(route.meta?.icon || ""),
          };
        }

        if (children.length > 0) {
          return {
            path: route.path,
            title: String(route.meta?.title || children[0].meta?.title),
            icon: String(route.meta?.icon || ""),
            children: children.map((child) => ({
              path: `${route.path}/${child.path}`.replace(/\/+/g, "/"),
              title: String(child.meta?.title || ""),
              icon: String(child.meta?.icon || ""),
            })),
          };
        }

        return {
          path: route.path,
          title: String(route.meta?.title || ""),
          icon: String(route.meta?.icon || ""),
        };
      });
  };

  const layoutMenuRoutes = computed(() => buildMenuTree(menuRoutes));

  const toggleSidebar = () => appStore.toggleSidebar();
  const openMobileMenu = () => {
    mobileMenuVisible.value = true;
  };
  const closeMobileMenu = () => {
    mobileMenuVisible.value = false;
  };

  const handleUserCommand = async (command: "changePass" | "logout") => {
    if (command === "changePass") {
      await router.push("/user-center/change-password");
      return;
    }

    await ElMessageBox.confirm("确认退出登录吗？", "提示", { type: "warning" });

    await logoutApi().catch(() => undefined);
    authStore.clearAuth();
    appStore.resetAppState();
    await router.push("/login");
  };

  const handleBreadcrumbClick = async (item: AppBreadcrumbItem) => {
    if (item.clickable && item.path && item.path !== route.path) {
      await router.push(item.path);
    }
  };

  return {
    menuRoutes: layoutMenuRoutes,
    sidebarCollapsed,
    breadcrumbs,
    userName,
    mobileMenuVisible,
    toggleSidebar,
    openMobileMenu,
    closeMobileMenu,
    handleUserCommand,
    handleBreadcrumbClick,
  };
};
```

---

# system-views（登录 / 注册 / 重置密码）

系统页各自独立，按需组织文件。以下是每个页面的**最低约束**——模板只管"必须做什么"，不管 CSS / 布局 / 具体字段。

## 登录页

**必须遵守**：

- 路由 `meta.title` 直接中文（`'登录'`），`meta.hideMenu: true`
- 密码等敏感字段用 `encryptPayload` 加密后提交
- 登录成功后 `authStore.setAuthData({ token, userInfo })` + `ElMessage.success` + `router.replace`（不用 push）
- 错误由拦截器 toast，`catch` 仅清验证码等状态，**不额外弹错误**

## 注册页

按项目需要决定是否做。如果需要：

- 路由 `meta.title` 直接中文（`'注册'`），`meta.hideMenu: true`
- 敏感字段用 `encryptPayload` 加密
- 注册成功 `ElMessage.success` + `router.replace({ name: 'Login' })`

## 重置密码页

按项目需要决定是否做。如果需要：

- 路由 `meta.title` 直接中文（`'重置密码'`），`meta.hideMenu: true`
- 密码字段用 `encryptPayload` 加密
- 成功后跳回登录页
