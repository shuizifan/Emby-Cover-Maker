# Emby Cover Maker · 动态封面海报工具

> 为 Emby 等媒体库生成横幅动态封面 GIF 的纯前端工具。上传电影海报 → 调背景 / 文字 / 布局 / 动画 → 实时预览 → 导出 GIF。

**一键部署：**
[![Deploy with Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/new/clone?repository-url=https://github.com/shuizifan/Emby-Cover-Maker)
[![Deploy to Cloudflare](https://img.shields.io/badge/Cloudflare-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://deploy.workers.cloudflare.com/?url=https://github.com/shuizifan/Emby-Cover-Maker)
[![Deploy to Netlify](https://img.shields.io/badge/Netlify-00C7B7?style=for-the-badge&logo=netlify&logoColor=white)](https://app.netlify.com/start/deploy?repository=https://github.com/shuizifan/Emby-Cover-Maker)
[![Deploy to Render](https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://render.com/deploy?repo=https://github.com/shuizifan/Emby-Cover-Maker)
[![Deploy to GitHub Pages](https://img.shields.io/badge/GitHub_Pages-222222?style=for-the-badge&logo=github&logoColor=white)](https://github.com/shuizifan/Emby-Cover-Maker#github-pages)

一个**单人离线**的小工具：没有后端、没有云、没有账号，所有处理都在浏览器本地完成。技术栈为 Vite + React + TypeScript + Canvas 2D，GIF 编码使用 gif.js（运行在 Web Worker，Floyd–Steinberg 抖色）。当前实现「海报斜播」一个视觉主题，架构上为扩展更多主题预留了接口。

## 效果

最终成品是一张横幅 GIF：左侧为固定文字区（中英标题），右侧是若干纵向滚动的海报列，相邻列反向滚动，整个海报区统一倾斜，首尾帧无缝衔接、循环播放无接缝。

> 建议在此处放一张示例 GIF（如 `docs/demo.gif`）以直观展示效果。

## 功能

- **简易 / 专业两档模式**：默认简易，每个面板只露出最核心的控件；专业模式一键展开全部高级参数。功能一个不少，只是简易模式收起低频选项。
- **中英标题各自独立**：独立的字体、字号、字重、字间距、换行与 XY 位移，可在预览里直接拖动调整。
- **内置 10 款海报字体**：方正风雅宋 / 优设标题圆 / 钉钉进步体 / 抖音美好体 / Cormorant Garamond / Melete（五个字重），中英文通用；支持放入自定义字体（见下文）。
- **英文标题装饰**：可选左竖条 + 横线，粗细与颜色可自定义，默认取背景主题同色相。
- **背景四选一**：单色相渐变 / 双色相渐变 / 纯色 / 上传图片，配合统一调色工具。
- **海报投影**（专业模式）：可调不透明度、角度、距离、模糊、扩散。
- **对比度提示**：标题颜色过于贴近背景时给出可读性警告。
- **外观导入 / 导出**：把配色、字体等参数存成文件随身携带。
- **参数本地持久化**：刷新后自动恢复简易/专业、画布、文字、颜色、布局等设置（海报图片需重新上传）。
- **界面明 / 暗 / 跟随系统**三档（仅影响工具界面，不影响导出成品）。

## 快速开始

### Windows 本地运行（推荐）

双击根目录的 **`启动运行.bat`** 即可一键安装依赖并启动。

- 若 PowerShell 提示脚本被禁止，请改用 cmd（右键 → 用命令提示符运行）。
- 首次运行会自动执行 `npm install`，之后直接启动。

### 命令行启动

需要 **Node.js 18+**。

```bash
npm install      # 安装依赖（首次）
npm run dev      # 启动本地开发服务器
```

打开终端提示的本地地址（默认 `http://localhost:5173`）即可使用。

## 构建

```bash
npm run build    # 扫描字体 + 类型检查 + 打包到 dist/
npm run preview  # 本地预览打包结果（需先构建）
```

构建产物在 `dist/`，是纯静态文件，可部署到任意静态托管。

> 注意：必须通过 HTTP(S) 访问；浏览器的本地文件安全策略会导致**直接双击 `dist/index.html` 无法正常使用**。

## 部署

项目是纯静态 SPA，已为以下平台预置好配置，开箱即可一键部署。

### Vercel（推荐）

点击页首的 **Deploy with Vercel** 按钮，把仓库 fork 到你的账号并自动部署。Vercel 会自动识别 Vite 框架，无需额外配置（构建命令 `npm run build`，输出目录 `dist`）。

### Netlify

点击页首的 **Deploy to Netlify** 按钮。根目录的 [`netlify.toml`](netlify.toml) 已配置构建命令和 SPA 重定向规则，一键即用。

### Cloudflare Workers

点击页首的 **Deploy to Cloudflare** 按钮。根目录的 [`wrangler.jsonc`](wrangler.jsonc) 已把 `dist/` 配置为 Workers 静态资源，Cloudflare 会自动构建并以 Workers Static Assets 方式托管。

> Cloudflare 的一键按钮要求仓库为**公开**仓库。

### Render

点击页首的 **Deploy to Render** 按钮。根目录的 [`render.yaml`](render.yaml) 已配置为静态站点服务，自动构建并托管。Render 免费计划足够个人使用。

### GitHub Pages

仓库内置了 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)，推送到 `main` 分支即自动构建并发布。首次启用只需一步：

1. 仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
2. 推送一次到 `main`（或在 Actions 页手动触发工作流），稍等即可在生成的 Pages 地址访问。

`vite.config.ts` 中 `base: './'` 用的是相对路径，因此无论部署在根域名还是 `user.github.io/<repo>/` 子路径下都能正常加载资源。

### 宝塔面板

适合已有 VPS 并安装了宝塔面板的用户，可直接托管构建产物。

**方法一：本地构建后上传（推荐）**

1. 本地执行 `npm run build`，生成 `dist/` 文件夹。
2. 在宝塔面板新建一个静态网站，域名随意（如 `cover.yourdomain.com`）。
3. 把 `dist/` 里的全部文件上传到该网站的根目录（通常是 `/www/wwwroot/你的站点/`）。
4. 在网站设置中开启 **SSL**（Let's Encrypt 免费证书），浏览器访问即可。

**方法二：服务器上直接构建**

1. 在宝塔面板安装 **Node.js 版本管理器**，选择 Node.js 18 或 20。
2. 把本仓库克隆到服务器（或通过宝塔文件管理器上传压缩包解压）。
3. 在终端进入项目目录，执行：
   ```bash
   npm install
   npm run build
   ```
4. 新建一个静态网站，网站根目录指向项目的 `dist/` 文件夹即可。

**Nginx SPA 重定向配置**

宝塔面板默认的 Nginx 配置不支持 SPA 路由。请在网站的 **Nginx 配置** 中，在 `location /` 块内加入以下规则（若文件不存在则回退到 `index.html`）：

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

> 本工具是纯前端 SPA，无需数据库或任何后端环境，宝塔面板只需提供静态文件服务即可。

## 自定义字体

把字体文件（`.woff2` / `.woff` / `.ttf` / `.otf`）放进 `public/fonts/` 下新建的子文件夹（文件夹名即字体显示名），然后重新构建或运行：

```bash
npm run scan-fonts   # 扫描 public/fonts 并刷新字体清单
```

字体下拉里即会出现该字体。文件名含 `700`/`300` 等数字会被识别为字重，含 `italic` 视为斜体；可在子文件夹放 `meta.json`（如 `{"lang":"cn"}`）指定只在中文或英文下拉出现。详见 [`public/fonts/README.md`](public/fonts/README.md)。

## 项目结构

```
.
├── index.html              入口 HTML
├── package.json            依赖与脚本
├── vite.config.ts          Vite 配置（base 相对路径，兼容各平台部署）
├── tsconfig.json           TypeScript 配置
├── wrangler.jsonc          Cloudflare Workers 部署配置
├── netlify.toml            Netlify 部署配置（构建 + SPA 重定向）
├── render.yaml             Render 部署配置（静态站点）
├── 启动运行.bat             Windows 一键启动脚本
├── .github/workflows/      GitHub Pages 自动部署工作流
├── scripts/                scan-fonts（扫描字体）/ verify（算法不变量校验）
├── public/fonts/           用户自定义字体目录 + 自动生成的 manifest.json
├── docs/                   完整核心手册（产品定义与实现规范）
└── src/
    ├── store/useStore.ts   参数状态（cn / en / deco 解耦）
    ├── render/             纯渲染引擎（layout / background / posters / textOverlay / fill / renderFrame / drawUtils）
    ├── export/             帧导出（t = i/n）+ gif.js Worker（Floyd–Steinberg 抖色）
    ├── fonts/              builtin（内置）+ registry（统一注册表）+ userFonts + files（字体文件）
    ├── utils/              color（含同色相推导）/ decoColor / imageLoad
    └── components/         预览、工具栏、调色工具、字体下拉、各 Tab 面板
```

## 可用脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动本地开发服务器（先扫描字体） |
| `npm run build` | 扫描字体 + 类型检查 + 打包到 `dist/` |
| `npm run preview` | 预览打包结果 |
| `npm run typecheck` | 仅运行 TypeScript 类型检查 |
| `npm run scan-fonts` | 扫描 `public/fonts` 重新生成字体清单 |
| `npm run verify` | 算法不变量断言 + 渲染真实帧到 `_verify_out/` |

## 文档

完整的产品定义、核心算法与实现规范见 [`docs/CORE_MANUAL_zh.md`](docs/CORE_MANUAL_zh.md)。

## 使用小贴士

- **每列只露出约 1.7 张大海报**是这个主题的视觉灵魂，海报别调太小。
- 某列「速度倍率」为非整数时会有警告——会导致 GIF 循环点卡顿，建议用整数。
- 导出页会预估 GIF 体积，方便判断是否适合发到群聊或媒体库。
- GIF 只有 256 色，色彩丰富的海报出现轻微色带属正常现象，默认已开启抖色尽量保细节。

## 关于字体版权

`src/fonts/files/` 与 `public/fonts/` 中的字体文件版权归各自权利人所有，仅请在你拥有合法使用权的前提下随项目分发。若计划公开发布，请自行确认所内置字体的授权范围。
