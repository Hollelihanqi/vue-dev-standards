# layout-and-system-views —— 主框架与系统页模板

主框架（带菜单 / 顶栏 / 面包屑的工作台）和系统页（登录 / 注册 / 重置密码）是两套独立壳：
- **Layout**：业务页面共用，进入需登录
- **system-views/\<page\>**：登录类页面独立全屏，不走 Layout，自带背景

---

## src/layout/Layout.vue

```vue
<template>
  <div class="layout-root flex h-screen w-screen overflow-hidden">
    <aside class="layout-sider flex-shrink-0 h-full overflow-hidden bg-[#001f35] transition-all" :class="sidebarCollapsed ? 'w-16' : 'w-60'">
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
      <TheBreadcrumb :items="breadcrumbs" @breadcrumb-click="handleBreadcrumbClick" />
      <Main />
    </section>
  </div>
</template>

<script setup lang="ts">
import Main from './Main.vue'
import TheBreadcrumb from './TheBreadcrumb.vue'
import TheHeader from './TheHeader.vue'
import TheMenu from './TheMenu.vue'
import { useLayout } from './useLayout'

const {
  menuRoutes,
  sidebarCollapsed,
  breadcrumbs,
  userName,
  toggleSidebar,
  openMobileMenu,
  handleUserCommand,
  handleBreadcrumbClick,
} = useLayout()
</script>
```

## src/layout/Main.vue

```vue
<template>
  <main class="layout-main flex-1 min-h-0 overflow-auto bg-[#f3f6fa] p-4">
    <router-view v-slot="{ Component, route }">
      <keep-alive :include="keepAliveNames">
        <component :is="Component" :key="String(routeReloadTokens[route.path] || 0)" />
      </keep-alive>
    </router-view>
  </main>
</template>

<script setup lang="ts">
import { useAppStore } from '@/store/app'

const appStore = useAppStore()
const routeReloadTokens = computed(() => appStore.routeReloadTokens)

// 列表页通过 meta.keepAlive 启用缓存；详情页不缓存。
const router = useRouter()
const keepAliveNames = computed(() => {
  return router.getRoutes()
    .filter(item => item.meta?.keepAlive && typeof item.name === 'string')
    .map(item => item.name as string)
})
</script>
```

## src/layout/TheHeader.vue

```vue
<template>
  <div class="layout-header flex h-16 items-center justify-between border-b border-[#d8e2ef] bg-white pl-2 pr-4 md:pr-5">
    <div class="flex items-center gap-3">
      <el-button class="layout-header__mobile-trigger" text @click="emit('open-mobile-menu')">
        <el-icon><Fold /></el-icon>
      </el-button>

      <el-button class="layout-header__desktop-trigger" text @click="emit('toggle-sidebar')">
        <el-icon>
          <component :is="collapsed ? Expand : Fold" />
        </el-icon>
      </el-button>
    </div>

    <div class="flex items-center gap-3 text-[#1f2937]">
      <span class="text-16">{{ userName || 'admin' }}</span>
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
import { Avatar, Expand, Fold } from '@element-plus/icons-vue'

defineProps<{
  userName?: string
  collapsed: boolean
}>()

const emit = defineEmits<{
  'open-mobile-menu': []
  'toggle-sidebar': []
  command: [command: 'changePass' | 'logout']
}>()

const handleCommand = (command: 'changePass' | 'logout') => {
  emit('command', command)
}
</script>
```

## src/layout/TheMenu.vue / TheMenuItem.vue

`TheMenu` 接收路由数组，过滤掉 `meta.hideMenu`，递归渲染 `TheMenuItem`。`TheMenuItem` 单层菜单直接展示，多层用 `el-sub-menu` 嵌套。两者都用 element-plus 的 `<el-menu>` 系列组件。模板里直接用 `{{ menu.title }}`，**不调用 t()**。

> 完整实现可参考已存在项目的 `src/layout/TheMenu.vue` 与 `TheMenuItem.vue`，与本项目结构高度一致，直接复制即可。

## src/layout/TheBreadcrumb.vue

```vue
<template>
  <nav class="layout-breadcrumb flex h-10 items-center gap-1 bg-white px-4 text-13">
    <template v-for="(item, index) in items" :key="`${item.path}-${index}`">
      <span
        class="layout-breadcrumb__item"
        :class="{ 'cursor-pointer text-[#0054a7] hover:underline': item.clickable, 'text-[#9ca3af]': !item.clickable }"
        @click="handleClick(item)"
      >
        {{ item.title }}
      </span>
      <span v-if="index < items.length - 1" class="text-[#cbd5e1]">/</span>
    </template>
  </nav>
</template>

<script setup lang="ts">
import type { AppBreadcrumbItem } from '@/store/app'

defineProps<{
  items: AppBreadcrumbItem[]
}>()

const emit = defineEmits<{
  'breadcrumb-click': [item: AppBreadcrumbItem]
}>()

const handleClick = (item: AppBreadcrumbItem) => {
  if (!item.clickable || !item.path) return
  emit('breadcrumb-click', item)
}
</script>
```

## src/layout/useLayout.ts

```ts
import { ElMessageBox } from 'element-plus'

import { logoutApi } from '@/api'
import { menuRoutes } from '@/router'
import { useAppStore, type AppBreadcrumbItem } from '@/store/app'
import { useAuthStore } from '@/store/auth'

export interface LayoutMenuRoute {
  path: string
  title: string
  icon?: string
  children?: LayoutMenuRoute[]
}

export const useLayout = () => {
  const router = useRouter()
  const route = useRoute()
  const appStore = useAppStore()
  const authStore = useAuthStore()

  const sidebarCollapsed = computed(() => appStore.sidebarCollapsed)
  const breadcrumbs = computed(() => appStore.breadcrumbs)
  const userName = computed(() => authStore.userInfo?.userName || authStore.userInfo?.loginName || '')

  const mobileMenuVisible = ref(false)

  // 将路由配置整理成菜单需要的层级结构（剔除 hideMenu）。
  const buildMenuTree = (routes: typeof menuRoutes): LayoutMenuRoute[] => {
    return routes
      .filter(item => item.meta?.title && !item.meta.hideMenu)
      .map((route) => {
        const children = (route.children || [])
          .filter(child => child.meta?.title && !child.meta.hideMenu)

        if (children.length === 1 && !route.meta?.alwaysShow) {
          // 单子节点提升为顶层
          return {
            path: `${route.path}/${children[0].path}`.replace(/\/+/g, '/'),
            title: String(children[0].meta?.title || route.meta?.title || ''),
            icon: String(route.meta?.icon || ''),
          }
        }

        if (children.length > 0) {
          return {
            path: route.path,
            title: String(route.meta?.title || children[0].meta?.title),
            icon: String(route.meta?.icon || ''),
            children: children.map(child => ({
              path: `${route.path}/${child.path}`.replace(/\/+/g, '/'),
              title: String(child.meta?.title || ''),
              icon: String(child.meta?.icon || ''),
            })),
          }
        }

        return {
          path: route.path,
          title: String(route.meta?.title || ''),
          icon: String(route.meta?.icon || ''),
        }
      })
  }

  const layoutMenuRoutes = computed(() => buildMenuTree(menuRoutes))

  const toggleSidebar = () => appStore.toggleSidebar()
  const openMobileMenu = () => { mobileMenuVisible.value = true }
  const closeMobileMenu = () => { mobileMenuVisible.value = false }

  const handleUserCommand = async (command: 'changePass' | 'logout') => {
    if (command === 'changePass') {
      await router.push('/user-center/change-password')
      return
    }

    await ElMessageBox.confirm('确认退出登录吗？', '提示', { type: 'warning' })

    await logoutApi().catch(() => undefined)
    authStore.clearAuth()
    appStore.resetAppState()
    await router.push('/login')
  }

  const handleBreadcrumbClick = async (item: AppBreadcrumbItem) => {
    if (item.clickable && item.path && item.path !== route.path) {
      await router.push(item.path)
    }
  }

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
  }
}
```

---

# system-views（登录 / 注册 / 重置密码）

三个系统页**共享一套视觉语言**：
- 背景图 `/assets/login_bj.png` + 深色叠加层
- 玻璃卡片：`linear-gradient(180deg, rgba(8,46,76,0.72), rgba(4,31,53,0.58))` + `backdrop-filter: blur(18px)`
- 输入框深色玻璃风：`bg-[rgba(3,26,44,0.5)] border-[rgba(174,220,255,0.32)]`
- 主按钮：`linear-gradient(135deg, #2f6fae, #0f5d9a)` + 阴影
- 文字：白色 / 浅蓝 `#cfe9ff` / 弱色 `rgba(224,240,255,0.7)`

每个系统页统一目录结构：

```
src/system-views/<page>/
├── <Page>.vue        # template + 极简 script setup
├── api.ts            # 该页面专属接口（验证码 / 注册 / 登录等）
└── use<Page>.ts      # 业务逻辑（如有）
```

---

## src/system-views/login/

### api.ts

```ts
import { request } from '@/utils/axios'
import { encryptPayload } from '@/utils/crypto'

interface LoginParams {
  loginName: string
  password: string
  captchaCode?: string
}

export interface LoginUserInfo {
  userId?: number | string
  userName?: string
  loginName?: string
  [key: string]: unknown
}

export interface LoginResult {
  token?: string
  [key: string]: unknown
}

export const getCaptchaUrl = () => {
  return `/api/<xxx>/anon/captcha/render?${Math.floor(Math.random() * 100000000)}`
}

export const loginApi = (params: LoginParams) => {
  const body = new URLSearchParams()
  body.set('code', JSON.stringify(encryptPayload(params).code))

  return request.post<LoginResult>('/<xxx>/login/user', body.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
}

export const getLoginUserInfoApi = () => {
  return request.post<LoginUserInfo>('/<xxx>/sys/v1/user/logininfo')
}
```

> **登录是 form-urlencoded**（`code` 字段 `JSON.stringify(encryptPayload(params).code)`），其它加密接口是 JSON。这是后端约定，按所对接的后端来。

### useLogin.ts

```ts
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'

import { useAuthStore } from '@/store/auth'

import { getCaptchaUrl, getLoginUserInfoApi, loginApi } from './api'

interface LoginFormModel {
  account: string
  password: string
  code: string
}

export const useLogin = () => {
  const router = useRouter()
  const authStore = useAuthStore()

  const formRef = useTemplateRef<FormInstance>('formRef')
  const submitting = ref(false)
  const agreed = ref(false)
  const captchaUrl = ref(getCaptchaUrl())
  const formModel = ref<LoginFormModel>({
    account: '',
    password: '',
    code: '',
  })

  const formRules: FormRules<LoginFormModel> = {
    account: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
    password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
    code: [{ required: true, message: '请输入验证码', trigger: 'blur' }],
  }

  const refreshCaptcha = () => {
    captchaUrl.value = getCaptchaUrl()
  }

  const getLoginTarget = () => {
    // 改成项目实际默认首屏。
    return '/'
  }

  const submitLogin = async () => {
    if (!formRef.value || submitting.value) return

    try {
      await formRef.value.validate()
    } catch {
      return
    }

    if (!agreed.value) {
      ElMessage.warning('请先阅读并同意相关协议')
      return
    }

    submitting.value = true

    try {
      const loginResult = await loginApi({
        loginName: formModel.value.account,
        password: formModel.value.password,
        captchaCode: formModel.value.code,
      })

      const userInfo = await getLoginUserInfoApi()

      authStore.setAuthData({
        token: loginResult?.token ?? '',
        userInfo,
      })

      ElMessage.success('登录成功')
      await router.replace(getLoginTarget())
    } catch {
      refreshCaptcha()
    } finally {
      submitting.value = false
    }
  }

  return {
    formRef,
    formModel,
    formRules,
    captchaUrl,
    submitting,
    agreed,
    refreshCaptcha,
    submitLogin,
  }
}
```

### Login.vue

```vue
<template>
  <div class="auth-page">
    <main class="auth-shell">
      <section class="auth-card">
        <div class="auth-card__header">
          <h2>登录</h2>
        </div>

        <el-form ref="formRef" class="auth-form" :model="formModel" :rules="formRules">
          <el-form-item prop="account">
            <el-input v-model="formModel.account" autofocus placeholder="请输入用户名" @keyup.enter="submitLogin">
              <template #prefix><el-icon class="input-icon"><User /></el-icon></template>
            </el-input>
          </el-form-item>

          <el-form-item prop="password">
            <el-input v-model="formModel.password" type="password" show-password placeholder="请输入密码" @keyup.enter="submitLogin">
              <template #prefix><el-icon class="input-icon"><Lock /></el-icon></template>
            </el-input>
          </el-form-item>

          <el-form-item prop="code">
            <el-input v-model="formModel.code" placeholder="请输入验证码" maxlength="6" @keyup.enter="submitLogin">
              <template #suffix>
                <button class="captcha-button" type="button" @click="refreshCaptcha">
                  <img class="captcha-image" :src="captchaUrl" alt="验证码">
                </button>
              </template>
            </el-input>
          </el-form-item>

          <div class="helper-row">
            <button type="button" @click="$router.push({ name: 'ResetPassword' })">忘记密码？</button>
          </div>

          <div class="agreement-row">
            <el-checkbox v-model="agreed" size="small">
              <span>我已阅读并同意</span>
              <a href="/agreement/user.html" target="_blank">《用户协议》</a>
              <a href="/agreement/privacy.html" target="_blank">《隐私声明》</a>
            </el-checkbox>
          </div>

          <el-button class="primary-action" :loading="submitting" @click="submitLogin">登录</el-button>
          <el-button class="secondary-action" @click="$router.push({ name: 'Register' })">注册账号</el-button>
        </el-form>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { Lock, User } from '@element-plus/icons-vue'

import { useLogin } from './useLogin'

const {
  formModel,
  formRules,
  captchaUrl,
  submitting,
  agreed,
  refreshCaptcha,
  submitLogin,
} = useLogin()
</script>

<style lang="scss" scoped>
.auth-page {
  min-height: 100vh;
  background:
    linear-gradient(90deg, rgba(2, 22, 36, 0.44), rgba(2, 22, 36, 0.08) 48%, rgba(2, 22, 36, 0.55)),
    url('/assets/login_bj.png') center center / cover no-repeat;
  color: #fff;
  overflow: auto;
}

.auth-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(0, 520px);
  justify-content: center;
  align-items: center;
  width: min(1180px, calc(100vw - 48px));
  margin: 0 auto;
  padding: 48px 0;
  box-sizing: border-box;
}

.auth-card {
  position: relative;
  padding: 40px 42px 38px;
  border: 1px solid rgba(180, 220, 255, 0.34);
  border-radius: 8px;
  background: linear-gradient(180deg, rgba(8, 46, 76, 0.72), rgba(4, 31, 53, 0.58));
  box-shadow: 0 24px 70px rgba(0, 10, 24, 0.42);
  backdrop-filter: blur(18px);
}

.auth-card__header {
  position: relative;
  margin-bottom: 30px;
  text-align: center;
}

.auth-card__header h2 {
  margin: 0;
  font-size: 38px;
  line-height: 1.1;
  font-weight: 800;
}

.auth-form :deep(.el-form-item) {
  margin-bottom: 20px;
}

.auth-form :deep(.el-input__wrapper) {
  min-height: 48px;
  padding: 0 12px;
  border: 1px solid rgba(174, 220, 255, 0.34);
  border-radius: 8px;
  background: rgba(3, 26, 44, 0.48);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
  transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
}

.auth-form :deep(.el-input__wrapper:hover),
.auth-form :deep(.el-input__wrapper.is-focus) {
  border-color: rgba(129, 202, 255, 0.9);
  background: rgba(4, 34, 58, 0.7);
  box-shadow: 0 0 0 3px rgba(65, 155, 224, 0.18);
}

.auth-form :deep(.el-input__inner) {
  color: #fff;
  font-size: 15px;
}

.auth-form :deep(.el-input__inner::placeholder) {
  color: rgba(224, 240, 255, 0.62);
}

.input-icon { color: #9fd5ff; font-size: 18px; }

.captcha-button {
  width: 118px; height: 36px;
  padding: 0; border: 0; border-radius: 6px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.9);
  cursor: pointer;
}

.captcha-image { display: block; width: 100%; height: 100%; object-fit: cover; }

.helper-row { margin: -4px 0 18px; text-align: right; }
.helper-row button {
  padding: 0; border: 0; background: transparent;
  color: #bfe5ff; font-size: 13px; cursor: pointer;
}

.agreement-row { margin-bottom: 24px; font-size: 13px; line-height: 22px; }
.agreement-row :deep(.el-checkbox__label) { color: rgba(239, 248, 255, 0.86); }
.agreement-row a { color: #c8eaff; text-decoration: none; }

.primary-action, .secondary-action {
  width: 100%; height: 48px;
  margin: 0 !important;
  border-radius: 8px;
  font-size: 15px;
}

.primary-action {
  border: 0;
  background: linear-gradient(135deg, #2f6fae, #0f5d9a);
  color: #fff;
  font-weight: 700;
  box-shadow: 0 10px 22px rgba(5, 47, 82, 0.32);
}

.primary-action:hover, .primary-action:focus { color: #fff; filter: brightness(1.03); }

.secondary-action {
  margin-top: 14px !important;
  border: 1px solid rgba(183, 225, 255, 0.38);
  background: rgba(255, 255, 255, 0.08);
  color: #e7f6ff;
}

.secondary-action:hover, .secondary-action:focus {
  border-color: rgba(183, 225, 255, 0.74);
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
}
</style>
```

---

## src/system-views/register/

注册页是**多字段表单 + 玻璃卡片 + StickyContainer 吸顶吸底**。**字段集与具体业务强相关**（企业资质 / 行业身份 / 营业执照等都属于业务定制字段），不强制要求所有项目都做。如目标项目不需要注册页，删除路由 + 文件即可。

如果需要：参照下面的结构与关键约定从零写一份，字段按目标项目实际需求定义（一般 Register.vue ≤ 30 行 script setup，useRegister.ts 200~300 行，api.ts 按接口数量定）。

结构：

```
src/system-views/register/
├── Register.vue       # template + 极简 script setup（≤ 30 行）
├── api.ts             # 获取协议、发送短信、上传执照、注册接口
└── useRegister.ts     # 全部业务逻辑（formModel ref / rules / 短信流程 / 上传 / 提交）
```

关键约定：

- **template 用 `StickyContainer`** 包裹整张表单：`#header` 放标题与"返回登录"，`#footer` 放取消 / 提交按钮，中间 `<el-form>` 滚动
- **表单分组**：账号信息 / 企业信息 / 补充信息 三个 `form-section`，每组顶一个 `<h3 class="section-title">` + 蓝色竖条 `dot`
- **字段两栏栅格**：`.form-grid` 用 `display: grid; grid-template-columns: repeat(2, minmax(0, 1fr))`，特殊字段加 `class="full-row"` 跨两列
- **label 在输入框上方**：`label-position="top" require-asterisk-position="left"`，必填红星在 label 左侧
- **字段提示放下方**：`<div class="field-hint">用户名由 6-25 个字母和数字组成</div>`，浅蓝小字
- **业务下拉 / 验证码按钮等用 UnoCSS 原子类 + element-plus 属性**，不再写自定义 SCSS
- **业务码 + 错误处理**：注册成功 `ElMessage.success + router.replace({ name: 'Login' })`；失败由拦截器 toast，业务层 catch 仅清状态

注册接口必须用 `encryptPayload(payload)` 加密（参考 `core-utils.md`）。

---

## src/system-views/reset-password/

简单版重置密码：账号 + 手机号 + 图形验证码 → 发送短信 → 短信验证码 + 新密码 → 提交。结构与登录页相似，单卡片，无分组；样式套用登录页的 SCSS 模板即可。

按项目实际接口约定写 `api.ts`；`ResetPassword.vue` 复用登录页的玻璃卡片骨架，把 `useLogin` 换成 `useResetPassword`。

```
src/system-views/reset-password/
├── ResetPassword.vue
└── api.ts
```

接口约定（按对接后端调整 URL）：
- `getResetCaptchaUrl()` —— 图形验证码图片 URL
- `checkResetCaptcha(params)` —— 校验图形验证码
- `sendResetSms(params)` —— 发送短信
- `resetPassword(params)` —— 重设密码（敏感字段需用 `encryptPayload` 加密）

---

## 提交后端验证清单（每个 system-view 都要确认）

| 项 | 要求 |
|---|---|
| 路由 meta.title | 直接中文（`'登录'` / `'注册'` / `'重置密码'`），不用 i18n key |
| meta.hideMenu | `true`（不进侧边菜单） |
| 加密 | 涉及敏感字段（密码、手机、邮箱）必须 `encryptPayload` |
| 错误 | 拦截器已 toast，业务层 catch 仅清状态 |
| 成功后 | `ElMessage.success` + `router.replace`（不 push，避免后退回到注册页） |
| 视觉 | 与登录页同一套深色玻璃风格变量 |
