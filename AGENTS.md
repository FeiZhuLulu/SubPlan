# SubPlan - Agent 指南

## 项目结构

- `app/page.tsx`：首页输入表单
- `app/result/page.tsx`：推荐结果页（服务端渲染，读取 query string）
- `components/RecommendForm.tsx`：表单客户端组件
- `lib/recommend.ts`：推荐引擎入口
- `lib/scoring.ts`：核心评分、组合生成、额度分配
- `data/*.json`：运行时数据

## 核心逻辑

- 先按预算和用量筛选组合。
- 能力评分采用「额度约束下的贪心分配」：按需求权重拆分各能力维度，优先使用该维度评分最高的订阅额度。
- 组合修正只在小范围（±5）内调整，不盖过能力分。
- 默认缓存命中率 95%。

## 修改建议

- 数据更新优先改 `data/` 中的 JSON。
- 不要修改前端表单的字段语义，除非同步更新 `lib/normalize.ts` 的权重生成逻辑。
- 新增能力维度需要同步更新 `data/presets.json`、`data/scores.json` 和 `lib/types.ts`。
