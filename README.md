# SubPlan

SubPlan 是一个轻量网页版 AI 订阅推荐工具。根据预算、月度 MTokens 用量、主要用途、地区、已有订阅和支付/API 偏好，推荐 AI 订阅组合。

仓库地址：[FeiZhuLulu/SubPlan](https://github.com/FeiZhuLulu/SubPlan)

当前版本：v0.2 预览版。推荐结果适合做决策参考，不代表官方额度承诺。

## 功能

- 按总预算推荐订阅组合，默认允许 15% 略超预算。
- 支持已有订阅，已有套餐会参与能力和额度分配。
- 支持同品牌升级，例如 Kimi 99 可升级为 Kimi 199，而不是重复叠加。
- 支持高智能模型需求比例，用于区分复杂 Agent/后端/Debug 任务和普通任务。
- 支持 API 作为预算内少量补位，不把 API 计费作为默认主方案。
- 结果页展示最推荐、量大管饱、中文友好等不同取舍。
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
- `data/relations.json`：套餐之间的互补和重叠关系。
- `data/presets.json`：用途模板和需求权重。
- `data/fx-rates.json`：汇率换算。

## 算法说明

推荐引擎主要包含以下步骤：

1. 根据用途模板生成能力权重。
2. 生成候选订阅组合。
3. 按总预算和用量覆盖率过滤组合。
4. 用高智能模型分档计算复杂任务覆盖率。
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
