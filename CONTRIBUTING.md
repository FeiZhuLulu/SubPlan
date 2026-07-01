# Contributing

感谢你帮助改进 SubPlan。当前最需要的贡献是数据校准和算法反馈。

## 数据贡献

请尽量在 issue 或 PR 中说明：

- 套餐名称、地区、价格和计费周期。
- 额度来源：官方页面、官方截图、社区统计或个人实测。
- 额度口径：月度 MTokens、窗口额度、积分额度或 API 单价。
- 适用模型：例如 Kimi 2.7 Code、Composer 2.5、DeepSeek v4 Pro。
- 你建议修改的能力维度：如 Agent 编程、中文写作、Debug 排错。

相关文件：

- `data/plans.json`：订阅套餐和价格。
- `data/api-options.json`：API 补位选项和单价。
- `data/quotas.json`：MTokens 等效额度估算。
- `data/scores.json`：能力维度评分。
- `data/model-tiers.json`：高智能模型分档。
- `data/relations.json`：套餐互补和重叠关系。

## 算法反馈

推荐算法目前仍是 v0.2 预览口径。提交反馈时，请附上：

- 输入参数：预算、用量、用途、地区、是否接受 API、已有订阅。
- 你看到的推荐组合。
- 你认为更合理的组合。
- 原因：能力、额度、价格、中文、国内可用性或支付限制。

## 本地验证

```bash
npm install
npm run lint
npm run build
npm run dev
```

提交 PR 前请至少确保 `npm run lint` 和 `npm run build` 通过。
