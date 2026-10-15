# Martin Luk 风险计算器

仓库包含两个独立的静态网页版本：

- `dist/index.html`：当前 Sites 风险计算器，根据入场价、图表结构止损价和每笔账户风险计算仓位、潜在亏损与 R 倍数。Cloudflare Pages 项目 `martin-luk-risk-calculator` 发布此目录。
- `public/index.html`：另一版风险与仓位终端，使用 `functions/api/quote.js` 代理 Yahoo 行情。`deploy.ps1`、`deploy.sh` 与 `npm run deploy` 发布这一版到 `martin-luk-calculator` 项目。

发布当前 Sites 版本：`npx wrangler pages deploy dist --project-name=martin-luk-risk-calculator`。

此工具仅用于交易计划与风险测算。行情数据可能延迟、限流或不可用。
