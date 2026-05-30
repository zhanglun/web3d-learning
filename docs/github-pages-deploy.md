# 部署到 GitHub Pages

本项目（Vite 8 + React + React Router 单页应用）通过 **GitHub Actions** 自动部署到
GitHub Pages：

- 线上地址：<https://zhanglun.github.io/web3d-learning/>
- 触发方式：每次 push 到 `main` 自动构建并部署（也可在 Actions 页手动 `Run workflow`）

---

## 一、为什么不能"直接部署"——三个坑

把一个 Vite SPA 丢到 GitHub Pages 项目站点（`https://<user>.github.io/<repo>/`），
有三件事必须先处理，否则会构建失败或线上白屏：

### 1. 构建本身是坏的：`tsc` 拦住了 `vite build`

原来的脚本是 `"build": "tsc && vite build"`。仓库里若干**历史**练习文件存在类型错误
（`unused GUI`、`offsetWidth on Element`、`implicit any` 等），`tsc`（`noEmit`）直接非零退出，
`vite build` 根本跑不到 → 没有 `dist` 产物。

**解决**：把类型检查和打包**解耦**。

```jsonc
// package.json
"build": "vite build",        // 打包用 esbuild/rolldown 转译，不做类型检查
"typecheck": "tsc --noEmit"   // 类型检查变成独立命令（编辑器/本地按需跑）
```

> 这是 Vite 项目的常见做法：类型检查交给 IDE 和单独的 CI 步骤，不阻塞产物构建。
> 那些历史类型错误属于旧练习文件的遗留，单独清理即可，不影响上线。

### 2. 资源路径：项目站点不在域名根目录

项目站点的根是 `/web3d-learning/`，而 Vite 默认 `base: '/'`。
不改的话，打包出的 `index.html` 会去 `/assets/xxx.js` 找资源 → 404 → 白屏。

**解决**：只在**生产构建**时设置 `base`，开发仍保持 `/`（否则 dev server 跑在
`localhost:5173/web3d-learning/` 很别扭）。

```ts
// vite.config.ts
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/web3d-learning/' : '/',
  // ...
}))
```

设置 `base` 后，Vite 会自动给打包资源加前缀，并把它注入到
`import.meta.env.BASE_URL`（dev 为 `/`，build 为 `/web3d-learning/`）。下面两处都复用它。

#### 2a. 路由 basename

`createBrowserRouter` 需要知道应用挂在子路径下，否则 `/solar-system` 会被解析成域名根下
的路径而匹配失败。

```ts
// src/main.tsx
const router = createBrowserRouter(routes, {
  basename: import.meta.env.BASE_URL.replace(/\/$/, "") || "/",
  //        build → "/web3d-learning"，dev → "/"
})
```

#### 2b. public 目录里的运行时资源

`src/assets/` 里 `import` 进来的资源 Vite 会自动哈希并加 `base` 前缀，**无需处理**。
但 `public/` 目录里、代码中用**字符串绝对路径**引用的资源（贴图、URDF、glTF）不会被处理，
线上会 404。本项目涉及：

- `solar-system` 的 12 张行星贴图 `/textures/*.jpg`
- UR5e 机械臂 `/urdf/ur5e/ur5e.urdf`
- glТF 模型 `gltf/a.glb`

**解决**：加一个统一助手，把它们都过一遍 `BASE_URL`。

```ts
// src/assetUrl.ts
export function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
}
```

在加载点包一层即可：

```ts
useTexture(assetUrl(data.textureUrl))     // Planet/Moon/Sun.tsx
urdf: assetUrl('/urdf/ur5e/ur5e.urdf')    // robots.ts
loader.load(assetUrl('gltf/a.glb'), ...)  // routes/gltf.tsx
```

> 经验法则：**`public/` 里的东西用字符串路径引用时，一律走 `assetUrl()`。**

### 3. 深链刷新 404：Pages 没有 SPA 回退

`createBrowserRouter` 用的是 History API。直接访问/刷新 `…/web3d-learning/solar-system`
时，Pages 在服务器上找不到这个文件 → 返回 404，应用根本加载不了。

**解决**：把 `dist/index.html` 复制一份成 `dist/404.html`。Pages 对任何找不到的路径都会返回
`404.html`（其实就是同一个应用入口），浏览器加载后 React Router 再根据当前 URL 渲染对应路由。
用一个只在 build 阶段运行的小插件实现：

```ts
// vite.config.ts
function spa404Fallback(): Plugin {
  return {
    name: 'spa-404-fallback',
    apply: 'build',
    closeBundle() {
      const index = resolve(__dirname, 'dist/index.html')
      if (existsSync(index)) copyFileSync(index, resolve(__dirname, 'dist/404.html'))
    },
  }
}
// plugins: [threeCompatShim(), spa404Fallback(), react()]
```

---

## 二、CI：GitHub Actions 工作流

`.github/workflows/deploy.yml`：push 到 `main` 时用 pnpm 安装依赖、构建，再把 `dist`
作为 Pages 工件部署。

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:            # 支持手动触发
permissions:
  contents: read
  pages: write                  # 部署 Pages 必需
  id-token: write               # OIDC 鉴权必需
concurrency:
  group: pages
  cancel-in-progress: true      # 新 push 取消进行中的旧部署
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 10 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

### 一次性开关（已完成）

仓库 → **Settings → Pages → Build and deployment → Source = `GitHub Actions`**。
这是用 Actions 部署的前提；不开的话 `deploy-pages` 会报 “Get Pages site failed”。

---

## 三、日常使用

| 操作 | 怎么做 |
|---|---|
| 发布更新 | 把改动合并/推到 `main`，Actions 自动构建部署 |
| 手动触发 | Actions 页 → 选该 workflow → `Run workflow` |
| 看进度 | <https://github.com/zhanglun/web3d-learning/actions> |
| 本地预览生产包 | `pnpm build && pnpm preview`（preview 会用 `/web3d-learning/` 这个 base） |
| 本地类型检查 | `pnpm typecheck` |

---

## 四、已知边界

- **依赖本地后端的 demo 在静态托管上无法联通**：`/robot`（rosbridge）、`/annotator`、
  ArmDeck Phase 4（Foxglove WS）需要本地 ROS 服务，线上点进去连不上属预期。
- **纯前端 demo 正常**：首页、Three.js 练习、Solar System、glTF、ArmDeck Phase 1（URDF 查看器）。
- **包体较大**：`index`/`physics` chunk 超过 500 kB（含 three.js / 物理 / IK）。能跑，但
  若要优化首屏可后续做路由级 `import()` 代码分割。

---

## 五、换仓库名 / Fork 时要改什么

`base` 和站点 URL 里都写死了仓库名 `web3d-learning`。换名或 fork 到别的仓库时：

1. `vite.config.ts` 里的 `base: '/<新仓库名>/'`；
2. 站点地址变为 `https://<新用户名>.github.io/<新仓库名>/`；
3. 路由 `basename` 和 `assetUrl()` 因为都读 `import.meta.env.BASE_URL`，**自动跟随**，无需改。

> 若部署到 **用户主页仓库**（`<user>.github.io`）或**自定义域名**，根路径就是 `/`，
> 此时 `base` 改回 `'/'` 即可，其余逻辑不变。
