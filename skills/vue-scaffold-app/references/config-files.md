# config-files —— 工程配置层完整模板

替换占位符：

- `<project-name>` → 实际包名（kebab-case，如 `my-admin`）
- `<api-target>` → 后端基址（例如 `http://<backend-host>:<port>/`），**直接写在 `vite.config.ts` 的 proxy.target 字面量里，不放 `.env`**（dev 代理是构建期配置，不是运行时变量）；多环境按 `mode` 在 `vite.config.ts` 内分支切换
- `<primary-color>` → 主色（默认 `#0054a7`）
- `<service-a>` / `<service-b>` → 实际后端服务路径前缀（按对接的 API gateway 路径来）

---

## package.json

```json
{
  "name": "<project-name>",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@element-plus/icons-vue": "^2.3.2",
    "@vueuse/core": "^14.2.1",
    "axios": "^1.15.0",
    "element-plus": "^2.13.7",
    "jsencrypt": "^3.5.4",
    "pinia": "^3.0.4",
    "pinia-plugin-persistedstate": "^4.7.1",
    "vue": "^3.5.32",
    "vue-router": "^5.0.4"
  },
  "devDependencies": {
    "@rdeam/vite-plugin-element-plus-theme-builder": "^0.1.5",
    "@rdeam/vue-components-resolver": "^0.1.2",
    "@types/node": "^24.12.2",
    "@unocss/preset-attributify": "^66.6.8",
    "@unocss/preset-icons": "^66.6.8",
    "@unocss/preset-uno": "^66.6.8",
    "@vitejs/plugin-vue": "^6.0.5",
    "@vitejs/plugin-vue-jsx": "^5.1.5",
    "@vue/tsconfig": "^0.9.1",
    "sass": "^1.99.0",
    "typescript": "~6.0.2",
    "unocss": "^66.6.8",
    "unplugin-auto-import": "^21.0.0",
    "unplugin-vue-components": "^32.0.0",
    "vite": "^8.0.4",
    "vue-tsc": "^3.2.6"
  }
}
```

> 推荐使用 pnpm。如果用 npm 也行，删除 `pnpm-lock.yaml` 即可。

---

## vite.config.ts

```ts
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import AutoImport from "unplugin-auto-import/vite";
import vueJsx from "@vitejs/plugin-vue-jsx";
import UnoCSS from "unocss/vite";
import Components from "unplugin-vue-components/vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";
import { AppComponentsResolver } from "@rdeam/vue-components-resolver";
import { elementPlusThemeBuilder } from "@rdeam/vite-plugin-element-plus-theme-builder";

export default defineConfig({
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  plugins: [
    elementPlusThemeBuilder({
      colors: {
        primary: "<primary-color>",
        success: "<success-color>",
        warning: "<warning-color>",
        danger: "<danger-color>",
        error: "<error-color>",
        info: "<info-color>",
      },
    }),
    vue(),
    vueJsx(),
    UnoCSS(),
    AutoImport({
      imports: ["vue", "vue-router", "pinia"],
      resolvers: [ElementPlusResolver()],
      dts: "src/types/auto-imports.d.ts",
    }),
    Components({
      dirs: [],
      resolvers: [
        ElementPlusResolver({ importStyle: false }),
        AppComponentsResolver(),
      ],
      dts: "src/types/components.d.ts",
    }),
  ],
  build: {
    chunkSizeWarningLimit: 1000,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "vue-vendor",
              test: /[\\/]node_modules[\\/](vue|vue-router|pinia)[\\/]/,
            },
            {
              name: "element-plus",
              test: /[\\/]node_modules[\\/](element-plus|@element-plus)[\\/]/,
            },
            {
              name: "vendor",
              test: /[\\/]node_modules[\\/]/,
            },
            // 有 echarts / chart.js 时取消注释；放在 vendor 之前才会命中
            // {
            //   name: 'charts',
            //   test: /[\\/]node_modules[\\/](echarts|chart\.js)[\\/]/,
            // },
          ],
        },
      },
    },
  },
  server: {
    proxy: {
      // 按业务后端服务前缀，多套就加多个。target 直接写后端地址字面量，不读 .env。下面两条仅是示例：
      "/api/<service-a>": {
        target: "<api-target>",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
      "/api/<service-b>": {
        target: "<api-target>",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
```

**注意**：

- `dirs: []` 关闭默认目录扫描，由 `AppComponentsResolver` 接管
- 代理路径前缀必须以 `/api/<service>` 开头（与 `.env.VITE_API_BASE_URL=/api` 对齐）
- **代理 target 直接写在本文件里，禁止用 `VITE_PROXY_TARGET` 之类的 `.env` 变量 + `loadEnv` 注入**：dev 代理只在本地开发服务器生效、运行时读不到，放 `.env` 既无意义又会把内网后端地址打进前端产物
- 多环境后端在 `vite.config.ts` 内按 `mode` 分支切换 target，不依赖 `.env.development` / `.env.production`

---

## uno.config.ts

```ts
import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetWind3,
} from "unocss";

// UnoCSS 基础配置。
// 兼容当前项目已经使用的原子类写法，并对旧的数字字号类做像素映射。
export default defineConfig({
  presets: [presetWind3(), presetAttributify(), presetIcons()],
  shortcuts: {
    "flex-center": "flex items-center justify-center",
    "flex-between": "flex items-center justify-between",
  },
  rules: [
    // 兼容项目中的 `text-14`、`text-16` 这类字号写法，统一按像素处理。
    [/^text-(\d+)$/, ([, size]) => ({ "font-size": `${size}px` })],
  ],
  theme: {
    colors: {
      primary: "var(--el-color-primary)",
      success: "var(--el-color-success)",
      warning: "var(--el-color-warning)",
      danger: "var(--el-color-danger)",
      info: "var(--el-color-info)",
    },
  },
});
```

需要项目级语义色时按需扩展 `theme.colors`（如 `glass-50 / glass-line / ink-1 / ink-2`），shortcuts 收口"玻璃风边框"、"玻璃风按钮"等常用组合。

---

## tsconfig.json

Vite 脚手架已生成，无需改动。

---

## tsconfig.app.json

Vite 脚手架已生成基础配置，在 `compilerOptions` 里**补上**以下项：

```json
{
  "compilerOptions": {
    "noEmit": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*.d.ts", "src/**/*.ts", "src/**/*.tsx", "src/**/*.vue"]
}
```

> `noUnusedLocals` 是底线——逼着开发者随手清理无用变量。下划线前缀（`_var`）依然报错时用 `void _var` 显式标记 intentionally unused。

---

## tsconfig.node.json

Vite 脚手架已生成基础配置，在 `compilerOptions` 里**补上**以下项：

```json
{
  "compilerOptions": {
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

---

## .env

```env
VITE_APP_TITLE=<应用标题>
VITE_API_BASE_URL=/api
VITE_API_TIMEOUT=60000
# 业务成功码：后端接口 data.code === 0 视为成功，不同后端可覆盖为其他值（如 200、1000）
VITE_API_SUCCESS_CODE=0

# RSA 公钥：所有需要前端加密的接口（登录 / 注册 / 改密码 / 修改资料等）共用
VITE_RSA_PUBLIC_KEY=<base64 公钥串>
```

多环境时再创建 `.env.development` / `.env.production` 覆盖差异项（例如不同环境的后端公钥）。

---

## .gitattributes

跨平台协作（Windows / macOS / Linux 混合团队）的换行符规范由 `.gitattributes` 强制统一。**写进仓库后 git pull 自动生效，比每人本地配 `core.autocrlf` 可靠**。

```gitattributes
# 默认让 Git 自动识别文本/二进制
* text=auto

# 源代码统一使用 LF，提交时由 Git 强制规范
*.ts    text eol=lf
*.tsx   text eol=lf
*.js    text eol=lf
*.jsx   text eol=lf
*.vue   text eol=lf
*.json  text eol=lf
*.css   text eol=lf
*.scss  text eol=lf
*.html  text eol=lf
*.md    text eol=lf
*.yaml  text eol=lf
*.yml   text eol=lf

# Windows 专用脚本保持 CRLF（不要被改成 LF 否则跑不了）
*.bat   text eol=crlf
*.cmd   text eol=crlf
*.ps1   text eol=crlf

# 二进制资源不要做换行符转换
*.png   binary
*.jpg   binary
*.jpeg  binary
*.gif   binary
*.ico   binary
*.svg   binary
*.woff  binary
*.woff2 binary
*.ttf   binary
*.eot   binary
*.otf   binary
*.pdf   binary
*.zip   binary
*.gz    binary

# 项目特定的第三方资源若内部有 LF 文件、且不希望 Git 转换换行符，
# 在此追加 `-text`，例如：
# public/tinymce/** -text
```

写到项目根 `.gitattributes`。克隆 / pull 的同事自动按规则处理，**不需要任何本地 Git 配置**。

---

## index.html

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>%VITE_APP_TITLE%</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`%VITE_APP_TITLE%` 是 Vite 的 HTML 占位符语法，构建时自动替换为对应 env 值。

---

## src/main.ts

```ts
import { createApp } from "vue";

import App from "./App.vue";
import "./assets/styles/ress.min.css"; // 全局 reset（从 references/assets-styles/ress.min.css 复制过去）
import "virtual:uno.css";
import "./assets/generated/element-plus-theme.css"; // 由 ep theme builder 自动生成

import router from "./router";
import pinia from "./store";

const app = createApp(App);

app.use(router);
app.use(pinia);
app.mount("#app");
```

注意：

- **不再** `app.use(i18n)`，本项目默认不启用 i18n
- 主题 css 是构建产物，不要手改，**列入 .gitignore**：
  ```
  src/assets/generated/
  ```

---

## src/App.vue

```vue
<template>
  <el-config-provider :locale="zhCn">
    <router-view />
  </el-config-provider>
</template>

<script setup lang="ts">
import zhCn from 'element-plus/es/locale/lang/zh-cn'
</script>
```

保持最简，布局由路由决定。`el-config-provider` 是 App.vue 唯一允许的额外职责：本规范按需自动引入 element-plus（无 `app.use(ElementPlus, { locale })`），漏了这层中文 locale，内置组件文案（分页 / `el-date-picker` / 空数据等）全是英文。中文工程必须带。

---

## src/vite-env.d.ts

```ts
/// <reference types="vite/client" />
```

如需对 `import.meta.env` 字段做强类型，新增 `src/types/env.d.ts`：

```ts
interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
  readonly VITE_API_BASE_URL: string;
  readonly VITE_API_TIMEOUT: string;
  readonly VITE_API_SUCCESS_CODE: string;
  readonly VITE_RSA_PUBLIC_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```
