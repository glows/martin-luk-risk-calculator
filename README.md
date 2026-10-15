# Martin Luk 风险与仓位终端

`public/index.html` 来自提供的 `martin_luk.html`。股票行情优先请求同源 `/api/quote`，由 Cloudflare Pages Function 依次尝试 Yahoo query2、腾讯财经、Nasdaq 和 Stooq，并转换为页面所需的 Yahoo Chart 结构。日线备用源可能延迟；页面会显示实际来源。所有来源失败时，页面会提示失败，不会填入模拟价格。外部数据源可能限流、改变格式或停止提供服务。

## 本地预览

安装 Node.js 后运行 `npm install` 和 `npm run dev`，打开 Wrangler 显示的本地地址。直接双击 HTML 文件时没有同源 Function，页面仍会尝试原有代理。

## 发布

项目已发布到 [Cloudflare Pages](https://martin-luk-calculator.pages.dev/)，源代码位于 [GitHub](https://github.com/glows/martin-luk-risk-calculator)。后续更新时，Windows PowerShell 运行 `./deploy.ps1`；macOS/Linux 运行 `bash deploy.sh`。脚本会提交并推送更改，再直接部署现有 Cloudflare Pages 项目。运行前确保 GitHub 和 Wrangler 命令行已登录。

若希望以后每次推送自动部署，请在 Cloudflare Dashboard 的 Workers & Pages 中创建**新的 Git 集成 Pages 项目**并连接 GitHub 仓库，输出目录设为 `public`，构建命令留空。Cloudflare 对已有项目的部署模式有转换限制，因此不要把脚本创建的 Direct Upload 项目当成可直接切换为 Git 集成的项目。
