# Martin Luk 风险与仓位终端

`public/index.html` 来自提供的 `martin_luk.html`。Yahoo 行情优先请求同源 `/api/quote`，失败时沿用页面原有的公共代理回退。`functions/api/quote.js` 是 Cloudflare Pages Function。行情由 Yahoo Finance 提供，可能延迟、限流或不可用。

## 本地预览

安装 Node.js 后运行 `npm install` 和 `npm run dev`，打开 Wrangler 显示的本地地址。直接双击 HTML 文件时没有同源 Function，页面仍会尝试原有代理。

## 发布

先运行 `gh auth login` 和 `npx wrangler login`。Windows PowerShell 运行 `./deploy.ps1`；macOS/Linux 运行 `bash deploy.sh`。脚本会创建公开 GitHub 仓库、推送当前文件，并创建与部署 Cloudflare Pages 项目。首次创建项目时运行即可；已有 Pages 项目可直接运行 `npm run deploy`。

若希望以后每次推送自动部署，请在 Cloudflare Dashboard 的 Workers & Pages 中创建**新的 Git 集成 Pages 项目**并连接 GitHub 仓库，输出目录设为 `public`，构建命令留空。Cloudflare 对已有项目的部署模式有转换限制，因此不要把脚本创建的 Direct Upload 项目当成可直接切换为 Git 集成的项目。
