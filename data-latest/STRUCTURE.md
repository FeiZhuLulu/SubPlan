# data-latest 数据结构说明

与 `lib/types.ts` 对齐，最终输出文件必须满足以下类型。

## 能力维度（CapabilityKey）

```
frontend, backend, agentCoding, debugging, codeReview,
chineseWriting, englishWriting, research, chat, imageGeneration, multimodal, ecosystem
```

## Plan 类型关键字段

```ts
{
  id: string;                         // 小写 snake_case，全局唯一
  provider: string;                   // 品牌名，如 OpenAI、DeepSeek、Kimi
  name: string;                       // 人类可读名称
  region: "CN" | "GLOBAL" | "US" | "JP";
  recommendationRole: "primary_subscription" | "supplementary_api" | "local_option" | "team_plan" | "bundle";
  category: "chat_subscription" | "coding_subscription" | "agent_subscription" | "api_router" | "local_model" | "cloud_model" | "bundle";
  accessModes: AccessMode[];          // web_app / mobile_app / cli / api / ide / ide_plugin / desktop_app / office_suite / local_runtime / local
  originalPrice: number | null;
  originalCurrency: "CNY" | "USD" | "EUR" | "JPY";
  billingCycle: "monthly" | "monthly_per_user" | "annual" | "free" | "first_month" | "pay_as_you_go" | "unknown";
  priceStatus: string;                // verified_official / verified_by_manual_official_screenshot / estimated / pending
  sourceStatus: string;               // official_url_verified / official_page_manual_screenshot / community_dataset / pending_manual_url
  sourceUrl: string | null;
  lastCheckedAt: string;              // ISO 日期，如 2026-07-12
  enabledForRecommendation: boolean;
  notes?: string;
  // API 专用
  pricingModel?: "metered" | "fixed";
  fixedMonthlyPrice?: number;
  requiresUserAcceptsApiBilling?: boolean;
  pricesPerMToken?: {
    inputCacheHit?: number;
    inputCacheMiss?: number;
    output?: number;
    input?: number;
    cacheHit?: number;
  };
  creditPurchaseFee?: { type, percentage, minimum, currency };
}
```

## 各文件顶层结构

- `plans.json`: `{ schemaVersion, lastUpdatedAt, notes, defaults, plans: Plan[] }`
- `api-options.json`: `{ schemaVersion, lastUpdatedAt, notes, defaults, apiOptions: Plan[] }`
- `scores.json`: `{ schemaVersion, lastUpdatedAt, notes, capabilityKeys, planCapabilityScores: CapabilityScoreRecord[] }`
- `quotas.json`: `{ schemaVersion, lastUpdatedAt, notes, defaults, quotas: Quota[] }`
- `model-tiers.json`: `{ schemaVersion, lastUpdatedAt, notes, tiers: ModelTierRecord[] }`
- `model-access-profiles.json`: `{ schemaVersion, lastUpdatedAt, notes, profiles: ModelAccessProfile[] }`
- `relations.json`: `{ schemaVersion, lastUpdatedAt, planRelations: PlanRelation[] }`
- `presets.json`: `{ schemaVersion, lastUpdatedAt, capabilityKeys, capabilityLabels, primaryUseCases, secondaryUseCases, addOnWeights }`
- `fx-rates.json`: `{ schemaVersion, lastUpdatedAt, baseCurrency, status, rates: FxRate[], notes }`

## 子代理输出约定

子代理在 `raw/*.json` 中输出收集结果时，尽量贴近 Plan 类型，但可额外携带以下字段以方便合并：

```ts
{
  _collectionSource: string;   // 如 "openai_official", "community_dataset"
  _confidence: "high" | "medium" | "low";
  _notes?: string;
}
```

合并阶段会删除下划线字段或移入 `notes`。
