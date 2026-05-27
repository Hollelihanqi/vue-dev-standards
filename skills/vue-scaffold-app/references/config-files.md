# config-files —— 工程配置层完整模板

替换占位符：
- `<project-name>` → 实际包名（kebab-case，如 `my-admin`）
- `<api-target>` → 后端基址（例如 `http://<backend-host>:<port>/`），多套环境用不同 `.env.*` 文件
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
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import vueJsx from '@vitejs/plugin-vue-jsx'
import UnoCSS from 'unocss/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { AppComponentsResolver } from '@rdeam/vue-components-resolver'
import { elementPlusThemeBuilder } from '@rdeam/vite-plugin-element-plus-theme-builder'

export default defineConfig({
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  plugins: [
    elementPlusThemeBuilder({
      colors: {
        primary: '<primary-color>',
        success: '#67c23a',
        warning: '#e6a23c',
        danger: '#f56c6c',
        error: '#f56c6c',
        info: '#909399',
      },
    }),
    vue(),
    vueJsx(),
    UnoCSS(),
    AutoImport({
      imports: ['vue', 'vue-router', 'pinia'],
      resolvers: [ElementPlusResolver()],
      dts: 'src/types/auto-imports.d.ts',
    }),
    Components({
      dirs: [],
      resolvers: [
        ElementPlusResolver({ importStyle: false }),
        AppComponentsResolver(),
      ],
      dts: 'src/types/components.d.ts',
    }),
  ],
  build: {
    chunkSizeWarningLimit: 1000,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'vue-vendor',
              test: /[\\/]node_modules[\\/](vue|vue-router|pinia)[\\/]/,
            },
            {
              name: 'element-plus',
              test: /[\\/]node_modules[\\/](element-plus|@element-plus)[\\/]/,
            },
            {
              name: 'vendor',
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
      // 按业务后端服务前缀，多套就加多个。下面两条仅是示例：
      '/api/<service-a>': {
        target: '<api-target>',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, ''),
      },
      '/api/<service-b>': {
        target: '<api-target>',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, ''),
      },
    },
  },
})
```

**注意**：
- `dirs: []` 关闭默认目录扫描，由 `AppComponentsResolver` 接管
- 代理路径前缀必须以 `/api/<service>` 开头（与 `.env.VITE_API_BASE_URL=/api` 对齐）
- 多环境后端通过 `.env.development` / `.env.production` 切换

---

## uno.config.ts

```ts
import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetWind3,
} from 'unocss'

// UnoCSS 基础配置。
// 兼容当前项目已经使用的原子类写法，并对旧的数字字号类做像素映射。
export default defineConfig({
  presets: [
    presetWind3(),
    presetAttributify(),
    presetIcons(),
  ],
  shortcuts: {
    'flex-center': 'flex items-center justify-center',
    'flex-between': 'flex items-center justify-between',
  },
  rules: [
    // 兼容项目中的 `text-14`、`text-16` 这类字号写法，统一按像素处理。
    [/^text-(\d+)$/, ([, size]) => ({ 'font-size': `${size}px` })],
  ],
  theme: {
    colors: {
      primary: 'var(--el-color-primary)',
      success: 'var(--el-color-success)',
      warning: 'var(--el-color-warning)',
      danger: 'var(--el-color-danger)',
      info: 'var(--el-color-info)',
    },
  },
})
```

需要项目级语义色时按需扩展 `theme.colors`（如 `glass-50 / glass-line / ink-1 / ink-2`），shortcuts 收口"玻璃风边框"、"玻璃风按钮"等常用组合。

---

## tsconfig.json

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

---

## tsconfig.app.json

```json
{
  "extends": "@vue/tsconfig/tsconfig.dom.json",
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "noEmit": true,
    "types": ["vite/client"],

    /* Linting */
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.d.ts", "src/**/*.ts", "src/**/*.tsx", "src/**/*.vue"]
}
```

`noUnusedLocals` 是底线 —— 它会逼着开发者随手清理无用变量。下划线前缀（`_var`）依然报错时用 `void _var` 显式标记 intentionally unused。

---

## tsconfig.node.json

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023"],
    "module": "esnext",
    "types": ["node"],
    "skipLibCheck": true,

    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,

    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["vite.config.ts"]
}
```

---

## .env

```env
VITE_APP_TITLE=<应用标题>
VITE_API_BASE_URL=/api
VITE_API_TIMEOUT=60000

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

**首次添加后必做的一次性规范化**：

```bash
git add .gitattributes
git commit -m "chore: add .gitattributes for line ending consistency"

# 让规则回溯应用到已有文件
git add --renormalize .
git status   # 如有改动
git commit -m "chore: normalize line endings"
```

之后克隆 / pull 的所有同事自动按规则处理，**不需要任何本地 Git 配置**。

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
import { createApp } from 'vue'

import App from './App.vue'
import './assets/styles/ress.min.css'    // 全局 reset（自行下载 ress.min.css 放 src/assets/styles/）
import 'virtual:uno.css'
import './assets/generated/element-plus-theme.css'   // 由 ep theme builder 自动生成

import router from './router'
import pinia from './store'

const app = createApp(App)

app.use(router)
app.use(pinia)
app.mount('#app')
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
  <router-view />
</template>

<script setup lang="ts"></script>
```

保持最简，所有布局由路由决定（`Layout.vue` 或 `system-views/*`）。

---

## src/vite-env.d.ts

```ts
/// <reference types="vite/client" />
```

如需对 `import.meta.env` 字段做强类型，新增 `src/types/env.d.ts`：

```ts
interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_API_TIMEOUT: string
  readonly VITE_RSA_PUBLIC_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```
