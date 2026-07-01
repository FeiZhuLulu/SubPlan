# SubPlan

线上官网地址：[https://subplan.vercel.app](https://subplan.vercel.app)

[English Version Below](#english-version)

SubPlan 是一个轻量网页版 AI 订阅推荐工具。根据预算、月度 MTokens 用量、主要用途、地区、已有订阅和支付/API 偏好，推荐 AI 订阅组合。

仓库地址：[FeiZhuLulu/SubPlan](https://github.com/FeiZhuLulu/SubPlan)

当前版本：v0.2 预览版。推荐结果适合做决策参考，不代表官方额度承诺。

## 功能

- 按总预算推荐订阅组合，默认允许 15% 略超预算。
- 支持已有订阅，已有套餐会参与能力和额度分配。
- 支持同品牌升级，例如 Kimi 99 可升级为 Kimi 199，而不是重复叠加。
- 支持高智能模型需求比例，用于区分复杂 Agent/后端/Debug 任务和普通任务。
- 支持 API 作为预算内少量补位，不把 API 计费作为默认主方案。
- 结果页展示最推荐、量大管饱、中文友好等不同取舍并优化卡片视觉层级。
- 网页原生支持中英文（ZH/EN）双语一键切换，并不丢失当前所填参数与结果。
- 本地数据管理后台可编辑 JSON 数据。

## 技术栈

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- 静态 JSON 数据源

## 本地运行

```bash
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

常用检查：

```bash
npm run lint
npm run build
```

## 数据文件

- `data/plans.json`：订阅套餐、价格、地区和支付方式。
- `data/api-options.json`：API 补位选项和单价。
- `data/quotas.json`：MTokens 等效额度估算。
- `data/scores.json`：不同能力维度评分。
- `data/model-tiers.json`：高智能模型分档。
- `data/model-access-profiles.json`：模型画像额度拆分细则。
- `data/relations.json`：套餐之间的互补和重叠关系。
- `data/presets.json`：用途模板和需求权重。
- `data/fx-rates.json`：汇率换算。

## 算法说明

推荐引擎主要包含以下步骤：

1. 根据用途模板生成能力权重。
2. 生成候选订阅组合。
3. 按总预算和用量覆盖率过滤组合。
4. 用高智能模型分档和画像计算复杂任务覆盖率。
5. 将 MTokens 需求分配给组合中最适合的套餐。
6. 根据能力分、额度覆盖、互补关系和冗余规则排序。

重要规则：

- 预算是组合总月成本，不是新增支出。
- 已有订阅计入组合总成本，但新增支出会单独展示。
- 免费版可以作为已有订阅参与计算，但不会主动作为新增推荐。
- 低于 20% 且非用户显式选择的附带能力，不会单独驱动新增固定订阅。
- 额度来自社区统计、官方信息和 AI 估算，不承诺 100% 准确。

## 部署

SubPlan 是标准 Next.js 应用，可部署到 Vercel、Cloudflare Pages 等支持 Next.js 的平台。正常推荐功能不需要环境变量。

## 开源贡献

欢迎提交数据修正、能力评分建议和推荐结果反馈。请参考 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 安全

正常使用不需要账号、密钥或支付信息。更多说明见 [SECURITY.md](SECURITY.md)。

## License

MIT

---

<a name="english-version"></a>

# SubPlan (English)

Website URL: [https://subplan.vercel.app](https://subplan.vercel.app)

SubPlan is a lightweight web-based AI subscription recommendation tool. It recommends optimized combinations of AI subscriptions based on your monthly budget, estimated monthly usage (in MTokens equivalent), primary tasks, regions, existing subscriptions, and API/payment preferences.

Repository: [FeiZhuLulu/SubPlan](https://github.com/FeiZhuLulu/SubPlan)

Current Version: v0.2 Preview. The recommendation results are for decision-making references and do not represent official quota commitments.

## Features

- Suggests subscription mixes based on total budget, allowing a default 15% overrun.
- Integrates existing subscriptions, allocating their capabilities and quotas to your demand.
- Supports same-brand upgrades (e.g., upgrading Kimi 99 to Kimi 199 instead of buying both).
- Supports high-intelligence model demand ratio, separating complex Agent/Backend/Debugging tasks from general tasks.
- Supports APIs as minor, budget-friendly fillers rather than the default main recommendation.
- Displays recommendations categorized by trade-offs (e.g., Best Pick, High Quota, High Performance, Chinese Friendly) with optimized visual hierarchies.
- Natively supports one-click language toggle (ZH/EN) without losing your form inputs or computed recommendation parameters.
- Private admin dashboard for local JSON data editing.

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Static JSON data sources

## Running Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Common checks:

```bash
npm run lint
npm run build
```

## Data Files

- `data/plans.json`: Subscription plans, pricing, region, and payment methods.
- `data/api-options.json`: API filler options and unit prices.
- `data/quotas.json`: Estimated monthly MTokens equivalent workloads.
- `data/scores.json`: Capability dimension score matrices.
- `data/model-tiers.json`: Model intelligence tier rankings.
- `data/model-access-profiles.json`: Fine-grained model access profiles and quota share details.
- `data/relations.json`: Complementary and overlap scores between different plans.
- `data/presets.json`: Use-case templates and default capability weights.
- `data/fx-rates.json`: Exchange rate conversions.

## Algorithm Description

The recommendation engine performs the following steps:

1. Generates capability weights according to the selected use-case template.
2. Generates candidate subscription combinations.
3. Filters mixes based on total budget limits and quota coverages.
4. Calculates complex task coverage using model tiers and access profiles.
5. Allocates MTokens demand to the most qualified plans in each candidate combination.
6. Ranks combinations based on capability scores, coverages, relations, and redundancy rules.

Important Rules:

- The budget represents the total monthly cost of the combination, not just the incremental cost.
- Existing subscriptions count towards the total cost of the mix, but the new incremental cost is shown separately.
- Free tiers can count as existing subscriptions but will not be recommended as new subscriptions.
- Side capabilities that account for less than 20% weight and are not explicitly selected by the user will not trigger a new standalone subscription recommendation.
- Quotas are compiled from community observations, official resources, and AI evaluations, and are not guaranteed to be 100% accurate.

## Deployment

SubPlan is a standard Next.js application that can be deployed to Vercel, Cloudflare Pages, or other Next.js-compatible hosting platforms. No environment variables are required for basic operations.

## Contributing

Contributions regarding data corrections, score adjustments, and general feedback are welcome. Please refer to [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

Using SubPlan does not require accounts, API keys, or payment details. For details, see [SECURITY.md](SECURITY.md).

## License

MIT
