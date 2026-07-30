# data-latest — 最新 AI 订阅数据库（隔离目录）

本目录用于存放从官方/社区来源拉取的最新 AI 订阅、定价、额度与模型基准数据，**不覆盖项目原有的 `data/` 目录**。

## 目录结构

```
data-latest/
├── README.md                 # 本文件
├── STRUCTURE.md              # 类型与字段说明
├── raw/                      # 子代理收集的原始/半结构化数据
│   ├── local-dataset-map.json
│   ├── international-plans.json
│   ├── china-plans.json
│   ├── thirdparty-local-plans.json
│   └── benchmarks.json
├── scripts/                  # 校验与合并脚本
│   └── validate.ts
├── validation/               # 校验运行产物
│   └── summary.json
├── plans.json                # 最终 schema 合规的订阅计划
├── api-options.json          # API / 按量计费选项
├── scores.json               # 计划级能力评分
├── quotas.json               # 额度估算
├── model-tiers.json          # 模型智能分级
├── model-access-profiles.json# 计划内模型访问明细
├── relations.json            # 计划间重叠/互补关系
├── presets.json              # 用例预设权重
└── fx-rates.json             # 汇率
```

## 与运行时 data/ 的关系

- `data/` 为项目当前运行数据（2026-07-30 起已直接更新到 v0.3.0）。
- `data-latest/scripts/` 存放抓取与合并脚本；抓取产物会写回 `data/`。

## 脚本

```bash
# 从 appstoreprice.org 抓取 App Store 地区价 → data/regional-prices.json
node data-latest/scripts/scrape-appstore-prices.mjs

# 应用模型/订阅/评分等批量刷新（可按需再改后重跑）
node data-latest/scripts/apply-data-update-2026-07.mjs
```

## 数据来源原则

1. 优先官方定价页（官网、help center、API docs）作为推荐基线价。
2. 全球 App Store 地区价统一来自 [appstoreprice.org](https://appstoreprice.org/zh/apps)，写入 `data/regional-prices.json`（IAP 价常高于官网直购）。
3. 模型基准优先采用官方发布页与公开评测；智能分级写入 `model-tiers.json` / `model-access-profiles.json`。
4. 每条记录必须标注 `sourceUrl`、`sourceStatus`、`priceStatus`、`lastCheckedAt`。
