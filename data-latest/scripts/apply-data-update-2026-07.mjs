/**
 * Apply July 2026 data refresh:
 * - new models (GPT-5.6, Claude Opus 5 / Sonnet 5 / Opus 4.8, Kimi K3, Gemini 3.x, Grok 4.x)
 * - new plans (Grok SuperGrok*, Perplexity*, Kimi GLOBAL tiers)
 * - Google AI JP prices from App Store
 * - scores / quotas / tiers / access profiles / relations / fx
 * - lastCheckedAt stamps
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.resolve(__dirname, "../../data");
const TODAY = "2026-07-30";

function read(name) {
  return JSON.parse(fs.readFileSync(path.join(DATA, name), "utf8"));
}
function write(name, obj) {
  fs.writeFileSync(path.join(DATA, name), JSON.stringify(obj, null, 2) + "\n", "utf8");
  console.log("updated", name);
}

const plans = read("plans.json");
const api = read("api-options.json");
const scores = read("scores.json");
const quotas = read("quotas.json");
const tiers = read("model-tiers.json");
const access = read("model-access-profiles.json");
const relations = read("relations.json");
const fx = read("fx-rates.json");
const regional = read("regional-prices.json");

// ---------- helpers ----------
function upsertPlan(list, plan) {
  const i = list.findIndex((p) => p.id === plan.id);
  if (i >= 0) list[i] = { ...list[i], ...plan };
  else list.push(plan);
}

function upsertByPlanId(list, key, record) {
  const i = list.findIndex((x) => x[key] === record[key]);
  if (i >= 0) list[i] = { ...list[i], ...record };
  else list.push(record);
}

function stampPlans(list) {
  for (const p of list) {
    if (p.lastCheckedAt) p.lastCheckedAt = TODAY;
  }
}

const frontierCoding = {
  agentCoding: "S",
  backend: "S",
  debugging: "S",
  codeReview: "S",
  research: "S",
};

const nearFrontierCoding = {
  agentCoding: "A",
  backend: "A",
  debugging: "A",
  codeReview: "A",
  research: "A",
};

// ---------- plans.json ----------
plans.schemaVersion = "0.3.0";
plans.lastUpdatedAt = TODAY;
plans.notes = [
  "v0.3.0 price + model dataset for AI subscription recommender (2026-07 refresh).",
  "Includes frontier models: GPT-5.6 Sol/Terra/Luna, Claude Opus 5 / Opus 4.8 / Sonnet 5, Gemini 3.x, Kimi K3, Grok 4.x, DeepSeek V4.",
  "New subscriptions: SuperGrok Lite/Pro/Heavy, Perplexity Pro/Max, Kimi GLOBAL membership tiers.",
  "Regional App Store IAP prices live in regional-prices.json (source: appstoreprice.org). Web/direct prices remain primary recommendation baseline.",
  "Only stable official / high-quality channels are included; shared accounts and temporary reseller prices excluded.",
  "For China-facing recommendation, prefer CN prices where available; otherwise use US/GLOBAL price.",
  "App Store regional list prices are often higher than web billing due to platform fees (e.g. Claude Max IAP).",
];

// stamp existing
stampPlans(plans.plans);

// Fix Google AI Pro JP from App Store (¥2900)
upsertPlan(plans.plans, {
  id: "google_ai_pro_jp",
  provider: "Google",
  name: "Google AI Pro Japan",
  region: "JP",
  recommendationRole: "primary_subscription",
  category: "bundle",
  accessModes: ["web_app", "mobile_app", "office_suite"],
  originalPrice: 2900,
  originalCurrency: "JPY",
  billingCycle: "monthly",
  priceStatus: "verified_app_store",
  sourceStatus: "appstoreprice_org",
  sourceUrl: "https://appstoreprice.org/zh/apps/6477489729",
  lastCheckedAt: TODAY,
  enabledForRecommendation: true,
  notes:
    "App Store JP list price for Google AI Pro (5 TB) monthly: ¥2,900. Cross-checked via appstoreprice.org on 2026-07-30.",
});

// Update Google US notes with Gemini 3.x
for (const id of [
  "google_ai_plus_us",
  "google_ai_pro_us",
  "google_ai_ultra_5x_us",
  "google_ai_ultra_20x_us",
]) {
  const p = plans.plans.find((x) => x.id === id);
  if (p) {
    p.lastCheckedAt = TODAY;
    p.notes = (p.notes || "") + " Gemini app currently advertises Gemini 3 Flash / 3 Pro / Deep Think (Ultra).";
  }
}

// ChatGPT notes for GPT-5.6
for (const id of ["chatgpt_plus", "chatgpt_pro_5x", "chatgpt_pro_20x"]) {
  const p = plans.plans.find((x) => x.id === id);
  if (p) {
    p.notes =
      (p.notes ? p.notes + " " : "") +
      "As of 2026-07, Plus/Pro include GPT-5.6 family access (Sol for Plus+; Sol Pro on Pro tiers).";
  }
}

// Claude notes for Opus 5 / 4.8
for (const id of ["claude_pro", "claude_max_5x", "claude_max_20x"]) {
  const p = plans.plans.find((x) => x.id === id);
  if (p) {
    p.notes =
      (p.notes ? p.notes + " " : "") +
      "As of 2026-07, Pro/Max surface Claude Opus 4.8 / Opus 5 class models (Sonnet 5 also available). App Store IAP may be higher than web.";
  }
}

// Kimi CN notes for K3
for (const id of [
  "kimi_adagio_cn",
  "kimi_andante_cn",
  "kimi_moderato_cn",
  "kimi_allegretto_cn",
  "kimi_allegro_cn",
]) {
  const p = plans.plans.find((x) => x.id === id);
  if (p) {
    p.notes =
      (p.notes ? p.notes + " " : "") +
      "K3 and K3 swarm draw from the shared membership quota pool (official help center 2026-07).";
  }
}

// New: Grok
const grokPlans = [
  {
    id: "grok_free",
    provider: "xAI",
    name: "Grok Free",
    region: "GLOBAL",
    recommendationRole: "primary_subscription",
    category: "chat_subscription",
    accessModes: ["web_app", "mobile_app"],
    originalPrice: 0,
    originalCurrency: "USD",
    billingCycle: "free",
    priceStatus: "verified_official",
    sourceStatus: "official_url_verified",
    sourceUrl: "https://grok.com/",
    lastCheckedAt: TODAY,
    enabledForRecommendation: true,
    notes: "Free Grok on web/apps with rate limits. Also available via X free tier.",
  },
  {
    id: "supergrok_lite",
    provider: "xAI",
    name: "SuperGrok Lite",
    region: "GLOBAL",
    recommendationRole: "primary_subscription",
    category: "chat_subscription",
    accessModes: ["web_app", "mobile_app"],
    originalPrice: 10,
    originalCurrency: "USD",
    billingCycle: "monthly",
    priceStatus: "verified_app_store",
    sourceStatus: "appstoreprice_org",
    sourceUrl: "https://appstoreprice.org/zh/apps/6670324846",
    lastCheckedAt: TODAY,
    enabledForRecommendation: true,
    notes: "US App Store $10/mo. Entry SuperGrok tier with raised limits vs free.",
  },
  {
    id: "supergrok",
    provider: "xAI",
    name: "SuperGrok",
    region: "GLOBAL",
    recommendationRole: "primary_subscription",
    category: "chat_subscription",
    accessModes: ["web_app", "mobile_app"],
    originalPrice: 30,
    originalCurrency: "USD",
    billingCycle: "monthly",
    priceStatus: "verified_official",
    sourceStatus: "official_url_verified",
    sourceUrl: "https://x.ai/grok",
    lastCheckedAt: TODAY,
    enabledForRecommendation: true,
    discountPrices: [
      {
        billingCycle: "annual",
        displayMonthlyPrice: 25,
        totalPrice: 300,
        currency: "USD",
        discountLabel: "$300/year, about $25/month",
      },
    ],
    notes:
      "Standalone SuperGrok $30/mo (App Store US $30). Higher limits, frontier Grok 4.x, Imagine, multi-agent. X Premium+ is a separate bundle path.",
  },
  {
    id: "supergrok_heavy",
    provider: "xAI",
    name: "SuperGrok Heavy",
    region: "GLOBAL",
    recommendationRole: "primary_subscription",
    category: "chat_subscription",
    accessModes: ["web_app", "mobile_app"],
    originalPrice: 300,
    originalCurrency: "USD",
    billingCycle: "monthly",
    priceStatus: "verified_app_store",
    sourceStatus: "appstoreprice_org",
    sourceUrl: "https://appstoreprice.org/zh/apps/6670324846",
    lastCheckedAt: TODAY,
    enabledForRecommendation: true,
    usageMultiplierLabel: "Heavy / multi-agent",
    notes:
      "Top consumer tier (~$300/mo App Store US). Highest Grok 4 Heavy / multi-agent access. Occasional promo first-months reported; use full price for long-term recs.",
  },
];
for (const p of grokPlans) upsertPlan(plans.plans, p);

// New: Perplexity
const pplxPlans = [
  {
    id: "perplexity_free",
    provider: "Perplexity",
    name: "Perplexity Free",
    region: "GLOBAL",
    recommendationRole: "primary_subscription",
    category: "chat_subscription",
    accessModes: ["web_app", "mobile_app"],
    originalPrice: 0,
    originalCurrency: "USD",
    billingCycle: "free",
    priceStatus: "verified_official",
    sourceStatus: "official_url_verified",
    sourceUrl: "https://www.perplexity.ai/hub/pricing",
    lastCheckedAt: TODAY,
    enabledForRecommendation: true,
    notes: "Free search with limited weekly usage.",
  },
  {
    id: "perplexity_pro",
    provider: "Perplexity",
    name: "Perplexity Pro",
    region: "GLOBAL",
    recommendationRole: "primary_subscription",
    category: "chat_subscription",
    accessModes: ["web_app", "mobile_app"],
    originalPrice: 20,
    originalCurrency: "USD",
    billingCycle: "monthly",
    priceStatus: "verified_official",
    sourceStatus: "official_url_verified",
    sourceUrl: "https://www.perplexity.ai/pro",
    lastCheckedAt: TODAY,
    enabledForRecommendation: true,
    discountPrices: [
      {
        billingCycle: "annual",
        displayMonthlyPrice: 16.67,
        totalPrice: 200,
        currency: "USD",
        discountLabel: "$200/year, about $16.67/month",
      },
    ],
    notes:
      "Pro Search / Deep Research / Labs. Strong research subscription. Multi-model access (OpenAI/Anthropic/etc.) inside product limits.",
  },
  {
    id: "perplexity_max",
    provider: "Perplexity",
    name: "Perplexity Max",
    region: "GLOBAL",
    recommendationRole: "primary_subscription",
    category: "chat_subscription",
    accessModes: ["web_app", "mobile_app"],
    originalPrice: 200,
    originalCurrency: "USD",
    billingCycle: "monthly",
    priceStatus: "verified_official",
    sourceStatus: "official_url_verified",
    sourceUrl: "https://www.perplexity.ai/max",
    lastCheckedAt: TODAY,
    enabledForRecommendation: true,
    usageMultiplierLabel: "Max / Computer",
    notes:
      "Power-user tier (~$200/mo; annual ~$167/mo listed on marketing). Unlimited-style usage, Perplexity Computer, priority features.",
  },
];
for (const p of pplxPlans) upsertPlan(plans.plans, p);

// New: Kimi GLOBAL (App Store / international membership)
const kimiGlobal = [
  {
    id: "kimi_moderato_global",
    provider: "Kimi",
    name: "Kimi Moderato",
    region: "GLOBAL",
    recommendationRole: "primary_subscription",
    category: "agent_subscription",
    accessModes: ["web_app", "mobile_app", "cli", "ide_plugin"],
    originalPrice: 19,
    originalCurrency: "USD",
    billingCycle: "monthly",
    priceStatus: "verified_app_store",
    sourceStatus: "appstoreprice_org",
    sourceUrl: "https://appstoreprice.org/zh/apps/6474233312",
    lastCheckedAt: TODAY,
    enabledForRecommendation: true,
    notes:
      "International membership Moderato $19/mo (App Store). Annual ~$15/mo effective on official membership page. Includes K3 shared quota pool.",
  },
  {
    id: "kimi_allegretto_global",
    provider: "Kimi",
    name: "Kimi Allegretto",
    region: "GLOBAL",
    recommendationRole: "primary_subscription",
    category: "agent_subscription",
    accessModes: ["web_app", "mobile_app", "cli", "ide_plugin"],
    originalPrice: 39,
    originalCurrency: "USD",
    billingCycle: "monthly",
    priceStatus: "verified_app_store",
    sourceStatus: "appstoreprice_org",
    sourceUrl: "https://appstoreprice.org/zh/apps/6474233312",
    lastCheckedAt: TODAY,
    enabledForRecommendation: true,
    notes: "International Allegretto $39/mo (App Store). Higher agent concurrency and K3 quota.",
  },
  {
    id: "kimi_allegro_global",
    provider: "Kimi",
    name: "Kimi Allegro",
    region: "GLOBAL",
    recommendationRole: "primary_subscription",
    category: "agent_subscription",
    accessModes: ["web_app", "mobile_app", "cli", "ide_plugin"],
    originalPrice: 99,
    originalCurrency: "USD",
    billingCycle: "monthly",
    priceStatus: "verified_app_store",
    sourceStatus: "appstoreprice_org",
    sourceUrl: "https://appstoreprice.org/zh/apps/6474233312",
    lastCheckedAt: TODAY,
    enabledForRecommendation: true,
    notes: "International Allegro $99/mo. K3 extra-long chat (up to 1M) on higher tiers.",
  },
  {
    id: "kimi_vivace_global",
    provider: "Kimi",
    name: "Kimi Vivace",
    region: "GLOBAL",
    recommendationRole: "primary_subscription",
    category: "agent_subscription",
    accessModes: ["web_app", "mobile_app", "cli", "ide_plugin"],
    originalPrice: 199,
    originalCurrency: "USD",
    billingCycle: "monthly",
    priceStatus: "verified_app_store",
    sourceStatus: "appstoreprice_org",
    sourceUrl: "https://appstoreprice.org/zh/apps/6474233312",
    lastCheckedAt: TODAY,
    enabledForRecommendation: true,
    notes: "International top tier Vivace $199/mo. Max agent + K3 long-context capacity.",
  },
];
for (const p of kimiGlobal) upsertPlan(plans.plans, p);

// ---------- api-options.json ----------
api.schemaVersion = "0.3.0";
api.lastUpdatedAt = TODAY;
stampPlans(api.apiOptions);

const newApis = [
  {
    id: "openai_gpt56_sol_api",
    provider: "OpenAI",
    name: "GPT-5.6 Sol API",
    region: "GLOBAL",
    recommendationRole: "supplementary_api",
    category: "api_router",
    pricingModel: "metered",
    accessModes: ["api"],
    originalCurrency: "USD",
    priceStatus: "verified_official",
    sourceStatus: "official_url_verified",
    sourceUrl: "https://developers.openai.com/api/docs/pricing",
    lastCheckedAt: TODAY,
    enabledForRecommendation: true,
    requiresUserAcceptsApiBilling: true,
    pricesPerMToken: {
      inputCacheHit: 0.5,
      inputCacheMiss: 5,
      output: 30,
    },
    notes: "Flagship GPT-5.6 Sol. Cache hit ~10% of uncached input.",
  },
  {
    id: "openai_gpt56_terra_api",
    provider: "OpenAI",
    name: "GPT-5.6 Terra API",
    region: "GLOBAL",
    recommendationRole: "supplementary_api",
    category: "api_router",
    pricingModel: "metered",
    accessModes: ["api"],
    originalCurrency: "USD",
    priceStatus: "verified_official",
    sourceStatus: "official_url_verified",
    sourceUrl: "https://developers.openai.com/api/docs/pricing",
    lastCheckedAt: TODAY,
    enabledForRecommendation: true,
    requiresUserAcceptsApiBilling: true,
    pricesPerMToken: {
      inputCacheHit: 0.25,
      inputCacheMiss: 2.5,
      output: 15,
    },
    notes: "Mid-tier GPT-5.6 Terra.",
  },
  {
    id: "openai_gpt56_luna_api",
    provider: "OpenAI",
    name: "GPT-5.6 Luna API",
    region: "GLOBAL",
    recommendationRole: "supplementary_api",
    category: "api_router",
    pricingModel: "metered",
    accessModes: ["api"],
    originalCurrency: "USD",
    priceStatus: "verified_official",
    sourceStatus: "official_url_verified",
    sourceUrl: "https://developers.openai.com/api/docs/pricing",
    lastCheckedAt: TODAY,
    enabledForRecommendation: true,
    requiresUserAcceptsApiBilling: true,
    pricesPerMToken: {
      inputCacheHit: 0.1,
      inputCacheMiss: 1,
      output: 6,
    },
    notes: "Lower-cost GPT-5.6 Luna.",
  },
  {
    id: "claude_opus_5_api",
    provider: "Anthropic",
    name: "Claude Opus 5 API",
    region: "GLOBAL",
    recommendationRole: "supplementary_api",
    category: "api_router",
    pricingModel: "metered",
    accessModes: ["api"],
    originalCurrency: "USD",
    priceStatus: "verified_official",
    sourceStatus: "official_url_verified",
    sourceUrl: "https://platform.claude.com/docs/en/about-claude/pricing",
    lastCheckedAt: TODAY,
    enabledForRecommendation: true,
    requiresUserAcceptsApiBilling: true,
    pricesPerMToken: {
      inputCacheHit: 0.5,
      inputCacheMiss: 5,
      output: 25,
    },
    notes: "Claude Opus 5 standard pricing $5/$25 per MTok. Fast mode is $10/$50.",
  },
  {
    id: "claude_opus_48_api",
    provider: "Anthropic",
    name: "Claude Opus 4.8 API",
    region: "GLOBAL",
    recommendationRole: "supplementary_api",
    category: "api_router",
    pricingModel: "metered",
    accessModes: ["api"],
    originalCurrency: "USD",
    priceStatus: "verified_official",
    sourceStatus: "official_url_verified",
    sourceUrl: "https://platform.claude.com/docs/en/about-claude/pricing",
    lastCheckedAt: TODAY,
    enabledForRecommendation: true,
    requiresUserAcceptsApiBilling: true,
    pricesPerMToken: {
      inputCacheHit: 0.5,
      inputCacheMiss: 5,
      output: 25,
    },
    notes: "Claude Opus 4.8 $5/$25 per MTok. Fast mode $10/$50.",
  },
  {
    id: "claude_sonnet_5_api",
    provider: "Anthropic",
    name: "Claude Sonnet 5 API",
    region: "GLOBAL",
    recommendationRole: "supplementary_api",
    category: "api_router",
    pricingModel: "metered",
    accessModes: ["api"],
    originalCurrency: "USD",
    priceStatus: "verified_official",
    sourceStatus: "official_url_verified",
    sourceUrl: "https://platform.claude.com/docs/en/about-claude/pricing",
    lastCheckedAt: TODAY,
    enabledForRecommendation: true,
    requiresUserAcceptsApiBilling: true,
    pricesPerMToken: {
      inputCacheHit: 0.2,
      inputCacheMiss: 2,
      output: 10,
    },
    notes:
      "Introductory Sonnet 5 pricing $2/$10 through 2026-08-31; standard becomes $3/$15 from 2026-09-01.",
  },
  {
    id: "kimi_k3_api_global",
    provider: "Kimi",
    name: "Kimi K3 API",
    region: "GLOBAL",
    recommendationRole: "supplementary_api",
    category: "api_router",
    pricingModel: "metered",
    accessModes: ["api"],
    originalCurrency: "USD",
    priceStatus: "verified_official",
    sourceStatus: "official_url_verified",
    sourceUrl: "https://www.kimi.com/resources/kimi-k3-pricing",
    lastCheckedAt: TODAY,
    enabledForRecommendation: true,
    requiresUserAcceptsApiBilling: true,
    pricesPerMToken: {
      inputCacheHit: 0.3,
      inputCacheMiss: 3,
      output: 15,
    },
    notes: "Kimi K3 first-party API ~$3/$15 per MTok, cache hit $0.30. 1M context. Released 2026-07-16.",
  },
  {
    id: "kimi_k3_api_cn",
    provider: "Kimi",
    name: "Kimi K3 API China",
    region: "CN",
    recommendationRole: "supplementary_api",
    category: "api_router",
    pricingModel: "metered",
    accessModes: ["api"],
    originalCurrency: "CNY",
    priceStatus: "estimated",
    sourceStatus: "community_dataset",
    sourceUrl: "https://platform.kimi.com/docs/pricing",
    lastCheckedAt: TODAY,
    enabledForRecommendation: true,
    requiresUserAcceptsApiBilling: true,
    pricesPerMToken: {
      inputCacheHit: 2.1,
      inputCacheMiss: 21,
      output: 105,
    },
    notes:
      "CNY estimate roughly converting GLOBAL $3/$15 at ~7 CNY/USD. Prefer official CN platform page when refreshed; enable carefully.",
  },
];
for (const a of newApis) upsertPlan(api.apiOptions, a);

// Enable kimi_k27 with known GLOBAL pricing proxy if still disabled - leave disabled for CN pending
// Update kimi_k27 notes
{
  const k = api.apiOptions.find((x) => x.id === "kimi_k27_code_api_cn");
  if (k) {
    k.notes =
      "K2.7 Code GLOBAL reference is about $0.95/$4 per MTok; CN detailed price still pending. Keep disabled until CN verified.";
  }
}

// ---------- scores ----------
scores.schemaVersion = "0.3.0";
scores.lastUpdatedAt = TODAY;
scores.notes = [
  "Final plan-level capability scores for recommender runtime.",
  "Scores are 0-100 and intentionally separate from price, quota, payment friction and region availability.",
  "2026-07 refresh: GPT-5.6, Claude Opus 5/4.8, Kimi K3, Grok 4.x, Gemini 3.x, Perplexity multi-model research.",
];

// Mild score bumps for frontier model refresh
function bumpScore(planId, patch, notes) {
  const rec = scores.planCapabilityScores.find((s) => s.planId === planId);
  if (!rec) return;
  for (const [k, v] of Object.entries(patch)) {
    rec.scores[k] = Math.min(100, Math.max(0, (rec.scores[k] ?? 0) + v));
  }
  if (notes) rec.notes = notes;
}

bumpScore(
  "chatgpt_plus",
  { agentCoding: 3, backend: 2, research: 1, chat: 1 },
  "2026-07: GPT-5.6 Sol access on Plus."
);
bumpScore("chatgpt_pro_5x", { agentCoding: 2, backend: 1, research: 1 }, "2026-07: GPT-5.6 Sol Pro class.");
bumpScore("chatgpt_pro_20x", { agentCoding: 2, backend: 1, research: 1 }, "2026-07: GPT-5.6 Sol Pro class.");
bumpScore(
  "claude_pro",
  { agentCoding: 3, frontend: 2, debugging: 2, codeReview: 2 },
  "2026-07: Opus 4.8 / Opus 5 class on Pro."
);
bumpScore("claude_max_5x", { agentCoding: 2, frontend: 1, debugging: 1 }, "2026-07: Opus 5 class.");
bumpScore("claude_max_20x", { agentCoding: 2, frontend: 1, debugging: 1 }, "2026-07: Opus 5 class.");
bumpScore(
  "kimi_moderato_cn",
  { agentCoding: 4, research: 3, chineseWriting: 2, multimodal: 5 },
  "2026-07: K3 in membership pool."
);
bumpScore(
  "kimi_allegretto_cn",
  { agentCoding: 5, research: 4, chineseWriting: 2, multimodal: 5 },
  "2026-07: K3 + higher Code multiplier."
);
bumpScore(
  "kimi_allegro_cn",
  { agentCoding: 6, research: 5, chineseWriting: 2, multimodal: 5 },
  "2026-07: K3 long-context / swarm capacity."
);
bumpScore(
  "google_ai_pro_us",
  { agentCoding: 3, research: 1, multimodal: 1 },
  "2026-07: Gemini 3 Pro class."
);
bumpScore("google_ai_ultra_5x_us", { agentCoding: 3, research: 1 }, "2026-07: Gemini 3 Deep Think.");
bumpScore("google_ai_ultra_20x_us", { agentCoding: 3, research: 1 }, "2026-07: Gemini 3 Deep Think.");

const newScoreRecords = [
  {
    planId: "grok_free",
    scores: {
      frontend: 58,
      backend: 62,
      agentCoding: 55,
      debugging: 60,
      codeReview: 58,
      chineseWriting: 65,
      englishWriting: 78,
      research: 72,
      chat: 80,
      imageGeneration: 78,
      multimodal: 75,
      ecosystem: 70,
    },
    scoreConfidence: "low",
    scoreBasis: "manual_curated_from_model_evidence_and_product_workflow",
    notes: "Rate-limited free Grok 4.x class.",
  },
  {
    planId: "supergrok_lite",
    scores: {
      frontend: 70,
      backend: 74,
      agentCoding: 72,
      debugging: 74,
      codeReview: 72,
      chineseWriting: 72,
      englishWriting: 84,
      research: 82,
      chat: 88,
      imageGeneration: 88,
      multimodal: 86,
      ecosystem: 78,
    },
    scoreConfidence: "medium",
    scoreBasis: "manual_curated_from_model_evidence_and_product_workflow",
    notes: "Entry SuperGrok; solid generalist with Imagine.",
  },
  {
    planId: "supergrok",
    scores: {
      frontend: 80,
      backend: 84,
      agentCoding: 82,
      debugging: 84,
      codeReview: 82,
      chineseWriting: 76,
      englishWriting: 90,
      research: 90,
      chat: 92,
      imageGeneration: 94,
      multimodal: 92,
      ecosystem: 82,
    },
    scoreConfidence: "medium",
    scoreBasis: "manual_curated_from_model_evidence_and_product_workflow",
    notes: "SuperGrok $30 with Grok 4.x multi-agent + real-time X/web.",
  },
  {
    planId: "supergrok_heavy",
    scores: {
      frontend: 86,
      backend: 90,
      agentCoding: 88,
      debugging: 90,
      codeReview: 88,
      chineseWriting: 78,
      englishWriting: 92,
      research: 94,
      chat: 94,
      imageGeneration: 95,
      multimodal: 94,
      ecosystem: 84,
    },
    scoreConfidence: "medium",
    scoreBasis: "manual_curated_from_model_evidence_and_product_workflow",
    notes: "Heavy multi-agent / Grok 4 Heavy class.",
  },
  {
    planId: "perplexity_free",
    scores: {
      frontend: 40,
      backend: 42,
      agentCoding: 35,
      debugging: 40,
      codeReview: 38,
      chineseWriting: 60,
      englishWriting: 70,
      research: 78,
      chat: 72,
      imageGeneration: 20,
      multimodal: 45,
      ecosystem: 55,
    },
    scoreConfidence: "low",
    scoreBasis: "manual_curated_from_model_evidence_and_product_workflow",
    notes: "Search-first free tier.",
  },
  {
    planId: "perplexity_pro",
    scores: {
      frontend: 55,
      backend: 58,
      agentCoding: 52,
      debugging: 55,
      codeReview: 54,
      chineseWriting: 75,
      englishWriting: 88,
      research: 96,
      chat: 88,
      imageGeneration: 55,
      multimodal: 70,
      ecosystem: 78,
    },
    scoreConfidence: "medium",
    scoreBasis: "manual_curated_from_model_evidence_and_product_workflow",
    notes: "Best-in-class cited research / Deep Research for most users.",
  },
  {
    planId: "perplexity_max",
    scores: {
      frontend: 62,
      backend: 65,
      agentCoding: 60,
      debugging: 62,
      codeReview: 60,
      chineseWriting: 78,
      englishWriting: 90,
      research: 98,
      chat: 90,
      imageGeneration: 60,
      multimodal: 75,
      ecosystem: 82,
    },
    scoreConfidence: "medium",
    scoreBasis: "manual_curated_from_model_evidence_and_product_workflow",
    notes: "Max + Computer for heavy research / agentic workflows.",
  },
  {
    planId: "google_ai_pro_jp",
    scores: {
      frontend: 78,
      backend: 82,
      agentCoding: 78,
      debugging: 80,
      codeReview: 76,
      chineseWriting: 80,
      englishWriting: 86,
      research: 94,
      chat: 90,
      imageGeneration: 90,
      multimodal: 95,
      ecosystem: 95,
    },
    scoreConfidence: "medium",
    scoreBasis: "manual_curated_from_model_evidence_and_product_workflow",
    notes: "Mirrors google_ai_pro_us capability; JP App Store pricing.",
  },
  {
    planId: "kimi_moderato_global",
    scores: {
      frontend: 72,
      backend: 74,
      agentCoding: 76,
      debugging: 74,
      codeReview: 74,
      chineseWriting: 92,
      englishWriting: 80,
      research: 86,
      chat: 88,
      imageGeneration: 55,
      multimodal: 82,
      ecosystem: 72,
    },
    scoreConfidence: "medium",
    scoreBasis: "manual_curated_from_model_evidence_and_product_workflow",
    notes: "GLOBAL Moderato with K3 pool access.",
  },
  {
    planId: "kimi_allegretto_global",
    scores: {
      frontend: 78,
      backend: 80,
      agentCoding: 84,
      debugging: 82,
      codeReview: 82,
      chineseWriting: 94,
      englishWriting: 84,
      research: 90,
      chat: 90,
      imageGeneration: 58,
      multimodal: 86,
      ecosystem: 76,
    },
    scoreConfidence: "medium",
    scoreBasis: "manual_curated_from_model_evidence_and_product_workflow",
    notes: "GLOBAL Allegretto; stronger agent + K3.",
  },
  {
    planId: "kimi_allegro_global",
    scores: {
      frontend: 82,
      backend: 84,
      agentCoding: 88,
      debugging: 86,
      codeReview: 86,
      chineseWriting: 95,
      englishWriting: 86,
      research: 92,
      chat: 92,
      imageGeneration: 60,
      multimodal: 88,
      ecosystem: 80,
    },
    scoreConfidence: "medium",
    scoreBasis: "manual_curated_from_model_evidence_and_product_workflow",
    notes: "GLOBAL Allegro; K3 1M long chat.",
  },
  {
    planId: "kimi_vivace_global",
    scores: {
      frontend: 84,
      backend: 86,
      agentCoding: 90,
      debugging: 88,
      codeReview: 88,
      chineseWriting: 96,
      englishWriting: 88,
      research: 94,
      chat: 93,
      imageGeneration: 62,
      multimodal: 90,
      ecosystem: 82,
    },
    scoreConfidence: "medium",
    scoreBasis: "manual_curated_from_model_evidence_and_product_workflow",
    notes: "GLOBAL Vivace top tier.",
  },
  // API scores
  {
    planId: "openai_gpt56_sol_api",
    scores: {
      frontend: 90,
      backend: 95,
      agentCoding: 94,
      debugging: 94,
      codeReview: 92,
      chineseWriting: 88,
      englishWriting: 95,
      research: 95,
      chat: 94,
      imageGeneration: 70,
      multimodal: 90,
      ecosystem: 92,
    },
    scoreConfidence: "high",
    scoreBasis: "manual_curated_from_model_evidence_and_product_workflow",
    notes: "Metered GPT-5.6 Sol frontier API.",
  },
  {
    planId: "openai_gpt56_terra_api",
    scores: {
      frontend: 84,
      backend: 88,
      agentCoding: 86,
      debugging: 86,
      codeReview: 84,
      chineseWriting: 84,
      englishWriting: 90,
      research: 88,
      chat: 90,
      imageGeneration: 60,
      multimodal: 84,
      ecosystem: 88,
    },
    scoreConfidence: "high",
    scoreBasis: "manual_curated_from_model_evidence_and_product_workflow",
    notes: "GPT-5.6 Terra balanced tier.",
  },
  {
    planId: "openai_gpt56_luna_api",
    scores: {
      frontend: 74,
      backend: 78,
      agentCoding: 74,
      debugging: 76,
      codeReview: 74,
      chineseWriting: 78,
      englishWriting: 84,
      research: 80,
      chat: 84,
      imageGeneration: 45,
      multimodal: 72,
      ecosystem: 82,
    },
    scoreConfidence: "high",
    scoreBasis: "manual_curated_from_model_evidence_and_product_workflow",
    notes: "GPT-5.6 Luna value tier.",
  },
  {
    planId: "claude_opus_5_api",
    scores: {
      frontend: 94,
      backend: 95,
      agentCoding: 96,
      debugging: 95,
      codeReview: 96,
      chineseWriting: 82,
      englishWriting: 95,
      research: 92,
      chat: 92,
      imageGeneration: 0,
      multimodal: 84,
      ecosystem: 90,
    },
    scoreConfidence: "high",
    scoreBasis: "manual_curated_from_model_evidence_and_product_workflow",
    notes: "Claude Opus 5 API frontier coding/agent.",
  },
  {
    planId: "claude_opus_48_api",
    scores: {
      frontend: 92,
      backend: 94,
      agentCoding: 94,
      debugging: 94,
      codeReview: 95,
      chineseWriting: 80,
      englishWriting: 94,
      research: 90,
      chat: 90,
      imageGeneration: 0,
      multimodal: 82,
      ecosystem: 88,
    },
    scoreConfidence: "high",
    scoreBasis: "manual_curated_from_model_evidence_and_product_workflow",
    notes: "Claude Opus 4.8 API.",
  },
  {
    planId: "claude_sonnet_5_api",
    scores: {
      frontend: 88,
      backend: 90,
      agentCoding: 90,
      debugging: 90,
      codeReview: 90,
      chineseWriting: 78,
      englishWriting: 92,
      research: 86,
      chat: 88,
      imageGeneration: 0,
      multimodal: 80,
      ecosystem: 86,
    },
    scoreConfidence: "high",
    scoreBasis: "manual_curated_from_model_evidence_and_product_workflow",
    notes: "Claude Sonnet 5 intro pricing window.",
  },
  {
    planId: "kimi_k3_api_global",
    scores: {
      frontend: 86,
      backend: 88,
      agentCoding: 90,
      debugging: 88,
      codeReview: 88,
      chineseWriting: 95,
      englishWriting: 86,
      research: 92,
      chat: 90,
      imageGeneration: 55,
      multimodal: 90,
      ecosystem: 78,
    },
    scoreConfidence: "high",
    scoreBasis: "manual_curated_from_model_evidence_and_product_workflow",
    notes: "Kimi K3 open-weight frontier multimodal (2.8T MoE class).",
  },
  {
    planId: "kimi_k3_api_cn",
    scores: {
      frontend: 86,
      backend: 88,
      agentCoding: 90,
      debugging: 88,
      codeReview: 88,
      chineseWriting: 95,
      englishWriting: 86,
      research: 92,
      chat: 90,
      imageGeneration: 55,
      multimodal: 90,
      ecosystem: 78,
    },
    scoreConfidence: "medium",
    scoreBasis: "manual_curated_from_model_evidence_and_product_workflow",
    notes: "Same model as GLOBAL; CN pricing estimated.",
  },
];
for (const r of newScoreRecords) upsertByPlanId(scores.planCapabilityScores, "planId", r);

// ---------- quotas ----------
quotas.schemaVersion = "0.3.0";
quotas.lastUpdatedAt = TODAY;

const newQuotas = [
  {
    planId: "grok_free",
    estimatedTextWorkloadCapacityMTokens: 15,
    quotaBasis: "rate_limit_conservative_estimate",
    quotaConfidence: "low",
    capacityMultiplier: null,
    cacheHitRateAssumption: 0.95,
    source: "manual_estimate_v0.3.0",
    notes: "Free Grok is rate-limited; treat as light daily use only.",
  },
  {
    planId: "supergrok_lite",
    estimatedTextWorkloadCapacityMTokens: 80,
    quotaBasis: "tier_relative_to_supergrok",
    quotaConfidence: "low",
    capacityMultiplier: null,
    cacheHitRateAssumption: 0.95,
    source: "manual_estimate_v0.3.0",
    notes: "Roughly between free and SuperGrok.",
  },
  {
    planId: "supergrok",
    estimatedTextWorkloadCapacityMTokens: 220,
    quotaBasis: "observed_usage_window_extrapolation",
    quotaConfidence: "medium",
    capacityMultiplier: null,
    cacheHitRateAssumption: 0.95,
    source: "manual_estimate_v0.3.0",
    notes: "Higher limits / multi-agent; not official token quota.",
  },
  {
    planId: "supergrok_heavy",
    estimatedTextWorkloadCapacityMTokens: 1200,
    quotaBasis: "price_and_tier_relative_estimate",
    quotaConfidence: "low",
    capacityMultiplier: null,
    cacheHitRateAssumption: 0.95,
    source: "manual_estimate_v0.3.0",
    notes: "Heavy tier for multi-agent / long sessions.",
  },
  {
    planId: "perplexity_free",
    estimatedTextWorkloadCapacityMTokens: 20,
    quotaBasis: "weekly_limit_conservative",
    quotaConfidence: "low",
    capacityMultiplier: null,
    cacheHitRateAssumption: 0.95,
    source: "manual_estimate_v0.3.0",
    notes: "Limited weekly free searches.",
  },
  {
    planId: "perplexity_pro",
    estimatedTextWorkloadCapacityMTokens: 180,
    quotaBasis: "research_query_workload_estimate",
    quotaConfidence: "medium",
    capacityMultiplier: null,
    cacheHitRateAssumption: 0.95,
    source: "manual_estimate_v0.3.0",
    notes: "Pro Search + Deep Research monthly practical workload.",
  },
  {
    planId: "perplexity_max",
    estimatedTextWorkloadCapacityMTokens: 900,
    quotaBasis: "unlimited_style_practical_cap",
    quotaConfidence: "low",
    capacityMultiplier: null,
    cacheHitRateAssumption: 0.95,
    source: "manual_estimate_v0.3.0",
    notes: "Max is usage-generous; cap is practical soft estimate.",
  },
  {
    planId: "google_ai_pro_jp",
    estimatedTextWorkloadCapacityMTokens: 250,
    quotaBasis: "mirrors_us_pro",
    quotaConfidence: "medium",
    capacityMultiplier: null,
    cacheHitRateAssumption: 0.95,
    source: "manual_estimate_v0.3.0",
    notes: "Mirror google_ai_pro_us capacity estimate.",
  },
  {
    planId: "kimi_moderato_global",
    estimatedTextWorkloadCapacityMTokens: 400,
    quotaBasis: "tier_relative_to_cn_moderato",
    quotaConfidence: "low",
    capacityMultiplier: null,
    cacheHitRateAssumption: 0.95,
    source: "manual_estimate_v0.3.0",
    notes: "Aligned near CN Moderato practical estimate; K3 shared pool.",
  },
  {
    planId: "kimi_allegretto_global",
    estimatedTextWorkloadCapacityMTokens: 1200,
    quotaBasis: "tier_relative_to_cn_allegretto",
    quotaConfidence: "low",
    capacityMultiplier: null,
    cacheHitRateAssumption: 0.95,
    source: "manual_estimate_v0.3.0",
    notes: "Between Moderato and Allegro.",
  },
  {
    planId: "kimi_allegro_global",
    estimatedTextWorkloadCapacityMTokens: 3000,
    quotaBasis: "tier_relative_to_cn_allegro",
    quotaConfidence: "low",
    capacityMultiplier: null,
    cacheHitRateAssumption: 0.95,
    source: "manual_estimate_v0.3.0",
    notes: "High K3 long-context usage.",
  },
  {
    planId: "kimi_vivace_global",
    estimatedTextWorkloadCapacityMTokens: 6000,
    quotaBasis: "top_tier_relative_estimate",
    quotaConfidence: "low",
    capacityMultiplier: null,
    cacheHitRateAssumption: 0.95,
    source: "manual_estimate_v0.3.0",
    notes: "Top GLOBAL Kimi tier.",
  },
  // metered APIs → null capacity
  ...[
    "openai_gpt56_sol_api",
    "openai_gpt56_terra_api",
    "openai_gpt56_luna_api",
    "claude_opus_5_api",
    "claude_opus_48_api",
    "claude_sonnet_5_api",
    "kimi_k3_api_global",
    "kimi_k3_api_cn",
  ].map((planId) => ({
    planId,
    estimatedTextWorkloadCapacityMTokens: null,
    quotaBasis: "metered_api_dynamic",
    quotaConfidence: "high",
    capacityMultiplier: null,
    cacheHitRateAssumption: 0.95,
    source: "manual_estimate_v0.3.0",
    notes: "Metered API; capacity derived from remaining API budget at runtime.",
  })),
];
for (const q of newQuotas) upsertByPlanId(quotas.quotas, "planId", q);

// ---------- model tiers ----------
tiers.schemaVersion = "0.3.0";
tiers.lastUpdatedAt = TODAY;
tiers.notes = [
  "Capability key model tier assignments for intelligence-aware scoring.",
  "Intelligence tiers: S (premium / 100%), A (high-end / 85%), B (mainstream / 45%), C (entry-level / 15%), D (negligible / 0%).",
  "2026-07: GPT-5.6, Claude Opus 5/4.8/Sonnet 5, Kimi K3, Grok 4.x, Gemini 3.x.",
];

const newTiers = [
  {
    planId: "grok_free",
    tierByCapability: {
      agentCoding: "C",
      backend: "C",
      debugging: "C",
      codeReview: "C",
      research: "B",
    },
    evidenceLevel: "medium",
    notes: "Free rate limits keep effective intelligence coverage low.",
  },
  {
    planId: "supergrok_lite",
    tierByCapability: {
      agentCoding: "B",
      backend: "B",
      debugging: "B",
      codeReview: "B",
      research: "A",
    },
    evidenceLevel: "medium",
  },
  {
    planId: "supergrok",
    tierByCapability: {
      agentCoding: "A",
      backend: "A",
      debugging: "A",
      codeReview: "A",
      research: "S",
    },
    evidenceLevel: "high",
    notes: "Grok 4.x multi-agent + live search.",
  },
  {
    planId: "supergrok_heavy",
    tierByCapability: {
      agentCoding: "S",
      backend: "S",
      debugging: "S",
      codeReview: "S",
      research: "S",
    },
    evidenceLevel: "medium",
  },
  {
    planId: "perplexity_free",
    tierByCapability: {
      agentCoding: "D",
      backend: "D",
      debugging: "D",
      codeReview: "D",
      research: "B",
    },
    evidenceLevel: "high",
  },
  {
    planId: "perplexity_pro",
    tierByCapability: {
      agentCoding: "C",
      backend: "C",
      debugging: "C",
      codeReview: "C",
      research: "S",
    },
    evidenceLevel: "high",
  },
  {
    planId: "perplexity_max",
    tierByCapability: {
      agentCoding: "B",
      backend: "B",
      debugging: "B",
      codeReview: "B",
      research: "S",
    },
    evidenceLevel: "medium",
  },
  {
    planId: "google_ai_pro_jp",
    tierByCapability: {
      agentCoding: "A",
      backend: "A",
      debugging: "A",
      codeReview: "A",
      research: "S",
    },
    evidenceLevel: "high",
  },
  {
    planId: "kimi_moderato_global",
    tierByCapability: {
      agentCoding: "A",
      backend: "A",
      debugging: "A",
      codeReview: "A",
      research: "A",
    },
    evidenceLevel: "medium",
  },
  {
    planId: "kimi_allegretto_global",
    tierByCapability: {
      agentCoding: "S",
      backend: "A",
      debugging: "A",
      codeReview: "A",
      research: "S",
    },
    evidenceLevel: "medium",
  },
  {
    planId: "kimi_allegro_global",
    tierByCapability: {
      agentCoding: "S",
      backend: "S",
      debugging: "S",
      codeReview: "S",
      research: "S",
    },
    evidenceLevel: "medium",
  },
  {
    planId: "kimi_vivace_global",
    tierByCapability: {
      agentCoding: "S",
      backend: "S",
      debugging: "S",
      codeReview: "S",
      research: "S",
    },
    evidenceLevel: "medium",
  },
  {
    planId: "openai_gpt56_sol_api",
    tierByCapability: frontierCoding,
    evidenceLevel: "high",
  },
  {
    planId: "openai_gpt56_terra_api",
    tierByCapability: nearFrontierCoding,
    evidenceLevel: "high",
  },
  {
    planId: "openai_gpt56_luna_api",
    tierByCapability: {
      agentCoding: "B",
      backend: "B",
      debugging: "B",
      codeReview: "B",
      research: "B",
    },
    evidenceLevel: "high",
  },
  {
    planId: "claude_opus_5_api",
    tierByCapability: frontierCoding,
    evidenceLevel: "high",
  },
  {
    planId: "claude_opus_48_api",
    tierByCapability: frontierCoding,
    evidenceLevel: "high",
  },
  {
    planId: "claude_sonnet_5_api",
    tierByCapability: nearFrontierCoding,
    evidenceLevel: "high",
  },
  {
    planId: "kimi_k3_api_global",
    tierByCapability: frontierCoding,
    evidenceLevel: "high",
  },
  {
    planId: "kimi_k3_api_cn",
    tierByCapability: frontierCoding,
    evidenceLevel: "medium",
  },
];
for (const t of newTiers) upsertByPlanId(tiers.tiers, "planId", t);

// Bump existing plan tiers for frontier models
function setTier(planId, tierByCapability, notes) {
  const t = tiers.tiers.find((x) => x.planId === planId);
  if (!t) return;
  t.tierByCapability = { ...t.tierByCapability, ...tierByCapability };
  if (notes) t.notes = notes;
  t.evidenceLevel = t.evidenceLevel || "medium";
}
setTier("chatgpt_plus", { agentCoding: "S", research: "S" }, "GPT-5.6 Sol on Plus.");
setTier("chatgpt_pro_5x", frontierCoding, "GPT-5.6 Sol Pro class.");
setTier("chatgpt_pro_20x", frontierCoding, "GPT-5.6 Sol Pro class.");
setTier("claude_pro", frontierCoding, "Opus 4.8 / Opus 5 class.");
setTier("claude_max_5x", frontierCoding, "Opus 5 class.");
setTier("claude_max_20x", frontierCoding, "Opus 5 class.");
setTier(
  "kimi_allegretto_cn",
  { agentCoding: "A", backend: "A", debugging: "A", codeReview: "A", research: "S" },
  "K3 in membership pool."
);
setTier(
  "kimi_allegro_cn",
  { agentCoding: "S", backend: "A", debugging: "A", codeReview: "A", research: "S" },
  "K3 long-context / swarm."
);
setTier(
  "kimi_moderato_cn",
  { agentCoding: "A", backend: "B", debugging: "B", codeReview: "B", research: "A" },
  "K3 shared pool at Moderato."
);
setTier(
  "google_ai_pro_us",
  { agentCoding: "A", backend: "A", debugging: "A", codeReview: "A", research: "S" },
  "Gemini 3 Pro."
);
setTier(
  "google_ai_ultra_5x_us",
  { agentCoding: "S", backend: "A", debugging: "A", codeReview: "A", research: "S" },
  "Gemini 3 Deep Think."
);
setTier(
  "google_ai_ultra_20x_us",
  { agentCoding: "S", backend: "A", debugging: "A", codeReview: "A", research: "S" },
  "Gemini 3 Deep Think."
);

// ---------- model access profiles ----------
access.schemaVersion = "0.3.0";
access.lastUpdatedAt = TODAY;
access.notes = [
  "Plan-level model access profiles used to estimate high-intelligence coverage.",
  "S means frontier/top-tier for the capability; A means advanced but not the top frontier; B/C/D are progressively weaker.",
  "2026-07 models: GPT-5.6 Sol/Terra, Claude Opus 5 / 4.8 / Sonnet 5, Kimi K3, Grok 4.x, Gemini 3.x.",
];

function upsertProfile(planId, models, notes) {
  const i = access.profiles.findIndex((p) => p.planId === planId);
  const rec = { planId, models, notes };
  if (i >= 0) access.profiles[i] = rec;
  else access.profiles.push(rec);
}

upsertProfile(
  "chatgpt_plus",
  [
    {
      modelId: "gpt-5.6-sol",
      label: "GPT-5.6 Sol",
      quotaShare: 1,
      tierByCapability: frontierCoding,
    },
  ],
  "Plus includes GPT-5.6 Sol at medium/high effort; Pro-level Sol Pro reserved for Pro."
);
upsertProfile(
  "chatgpt_pro_5x",
  [
    {
      modelId: "gpt-5.6-sol-pro",
      label: "GPT-5.6 Sol Pro",
      quotaShare: 1,
      tierByCapability: frontierCoding,
    },
  ],
  "Pro tiers can select Sol Pro for hardest tasks."
);
upsertProfile(
  "chatgpt_pro_20x",
  [
    {
      modelId: "gpt-5.6-sol-pro",
      label: "GPT-5.6 Sol Pro",
      quotaShare: 1,
      tierByCapability: frontierCoding,
    },
  ],
  "Pro tiers can select Sol Pro for hardest tasks."
);
upsertProfile(
  "claude_pro",
  [
    {
      modelId: "claude-opus-4.8",
      label: "Claude Opus 4.8 / Opus 5",
      quotaShare: 1,
      tierByCapability: frontierCoding,
    },
  ],
  "Pro/Max surface Opus 4.8 and Opus 5 class models; Sonnet 5 also available."
);
upsertProfile(
  "claude_max_5x",
  [
    {
      modelId: "claude-opus-5",
      label: "Claude Opus 5",
      quotaShare: 1,
      tierByCapability: frontierCoding,
    },
  ],
  "Max prioritizes higher Opus 5 usage windows."
);
upsertProfile(
  "claude_max_20x",
  [
    {
      modelId: "claude-opus-5",
      label: "Claude Opus 5",
      quotaShare: 1,
      tierByCapability: frontierCoding,
    },
  ],
  "Max prioritizes higher Opus 5 usage windows."
);
upsertProfile(
  "kimi_moderato_cn",
  [
    {
      modelId: "kimi-k3",
      label: "Kimi K3",
      quotaShare: 0.55,
      tierByCapability: nearFrontierCoding,
    },
    {
      modelId: "kimi-k2.6",
      label: "Kimi K2.6",
      quotaShare: 0.45,
      tierByCapability: {
        agentCoding: "B",
        backend: "B",
        debugging: "B",
        codeReview: "B",
        research: "A",
      },
    },
  ],
  "K3 consumes shared membership quota; free K2.6 chat entry may not draw pool."
);
upsertProfile(
  "kimi_allegretto_cn",
  [
    {
      modelId: "kimi-k3",
      label: "Kimi K3",
      quotaShare: 0.7,
      tierByCapability: frontierCoding,
    },
    {
      modelId: "kimi-k2.7-code",
      label: "Kimi K2.7 Code",
      quotaShare: 0.3,
      tierByCapability: nearFrontierCoding,
    },
  ],
  "Allegretto Code multiplier + K3."
);
upsertProfile(
  "kimi_allegro_cn",
  [
    {
      modelId: "kimi-k3",
      label: "Kimi K3 (1M)",
      quotaShare: 0.75,
      tierByCapability: frontierCoding,
    },
    {
      modelId: "kimi-k2.7-code",
      label: "Kimi K2.7 Code",
      quotaShare: 0.25,
      tierByCapability: nearFrontierCoding,
    },
  ],
  "Allegro: K3 long chat + large Code multiplier."
);
upsertProfile(
  "supergrok",
  [
    {
      modelId: "grok-4.3",
      label: "Grok 4.x",
      quotaShare: 1,
      tierByCapability: {
        agentCoding: "A",
        backend: "A",
        debugging: "A",
        codeReview: "A",
        research: "S",
      },
    },
  ],
  "SuperGrok frontier pool."
);
upsertProfile(
  "supergrok_heavy",
  [
    {
      modelId: "grok-4-heavy",
      label: "Grok 4 Heavy / multi-agent",
      quotaShare: 1,
      tierByCapability: frontierCoding,
    },
  ],
  "Heavy multi-agent tier."
);
upsertProfile(
  "supergrok_lite",
  [
    {
      modelId: "grok-4",
      label: "Grok 4",
      quotaShare: 1,
      tierByCapability: {
        agentCoding: "B",
        backend: "B",
        debugging: "B",
        codeReview: "B",
        research: "A",
      },
    },
  ],
  "Lite SuperGrok access."
);
upsertProfile(
  "perplexity_pro",
  [
    {
      modelId: "perplexity-research-pool",
      label: "Perplexity multi-model research pool",
      quotaShare: 1,
      tierByCapability: {
        agentCoding: "C",
        backend: "C",
        debugging: "C",
        codeReview: "C",
        research: "S",
      },
    },
  ],
  "Pro Search / Deep Research; routes across frontier models inside product."
);
upsertProfile(
  "perplexity_max",
  [
    {
      modelId: "perplexity-computer",
      label: "Perplexity Computer + research",
      quotaShare: 1,
      tierByCapability: {
        agentCoding: "B",
        backend: "B",
        debugging: "B",
        codeReview: "B",
        research: "S",
      },
    },
  ],
  "Max unlocks Computer / unlimited-style research."
);
upsertProfile(
  "kimi_moderato_global",
  [
    {
      modelId: "kimi-k3",
      label: "Kimi K3",
      quotaShare: 1,
      tierByCapability: nearFrontierCoding,
    },
  ],
  "GLOBAL Moderato K3 pool."
);
upsertProfile(
  "kimi_allegretto_global",
  [
    {
      modelId: "kimi-k3",
      label: "Kimi K3",
      quotaShare: 1,
      tierByCapability: frontierCoding,
    },
  ],
  "GLOBAL Allegretto."
);
upsertProfile(
  "kimi_allegro_global",
  [
    {
      modelId: "kimi-k3",
      label: "Kimi K3 (1M)",
      quotaShare: 1,
      tierByCapability: frontierCoding,
    },
  ],
  "GLOBAL Allegro long context."
);
upsertProfile(
  "kimi_vivace_global",
  [
    {
      modelId: "kimi-k3",
      label: "Kimi K3 (1M)",
      quotaShare: 1,
      tierByCapability: frontierCoding,
    },
  ],
  "GLOBAL Vivace."
);
upsertProfile(
  "openai_gpt56_sol_api",
  [
    {
      modelId: "gpt-5.6-sol",
      label: "GPT-5.6 Sol API",
      quotaShare: 1,
      tierByCapability: frontierCoding,
    },
  ],
  null
);
upsertProfile(
  "claude_opus_5_api",
  [
    {
      modelId: "claude-opus-5",
      label: "Claude Opus 5 API",
      quotaShare: 1,
      tierByCapability: frontierCoding,
    },
  ],
  null
);
upsertProfile(
  "claude_opus_48_api",
  [
    {
      modelId: "claude-opus-4.8",
      label: "Claude Opus 4.8 API",
      quotaShare: 1,
      tierByCapability: frontierCoding,
    },
  ],
  null
);
upsertProfile(
  "kimi_k3_api_global",
  [
    {
      modelId: "kimi-k3",
      label: "Kimi K3 API",
      quotaShare: 1,
      tierByCapability: frontierCoding,
    },
  ],
  null
);
upsertProfile(
  "kimi_k3_api_cn",
  [
    {
      modelId: "kimi-k3",
      label: "Kimi K3 API CN",
      quotaShare: 1,
      tierByCapability: frontierCoding,
    },
  ],
  null
);

// Cursor premium pool note update
{
  const cur = access.profiles.find((p) => p.planId === "cursor_pro");
  if (cur) {
    cur.notes =
      "Premium pool includes latest GPT / Claude Opus / Gemini frontier models subject to Cursor routing; Composer remains mid pool.";
  }
}

// ---------- relations ----------
relations.schemaVersion = "0.3.0";
relations.lastUpdatedAt = TODAY;
// fix wrong gemini id
for (const r of relations.planRelations) {
  if (r.planA === "gemini_ai_plus") r.planA = "google_ai_pro_us";
  if (r.planB === "gemini_ai_plus") r.planB = "google_ai_pro_us";
}

const newRelations = [
  {
    planA: "supergrok",
    planB: "chatgpt_plus",
    overlapScore: 70,
    complementScore: 40,
    explanation: "两者均为通用前沿聊天订阅，重叠较高；Grok 实时 X/Imagine 有差异化。",
  },
  {
    planA: "supergrok",
    planB: "claude_pro",
    overlapScore: 65,
    complementScore: 45,
    explanation: "通用推理重叠；Claude 更偏深度代码/写作，Grok 更偏实时信息与多模态生成。",
  },
  {
    planA: "supergrok",
    planB: "cursor_pro",
    overlapScore: 35,
    complementScore: 85,
    explanation: "Grok 通用助手 + Cursor IDE 执行，互补性高。",
  },
  {
    planA: "perplexity_pro",
    planB: "cursor_pro",
    overlapScore: 25,
    complementScore: 85,
    explanation: "Perplexity 强搜索研究，Cursor 强编程执行，组合好。",
  },
  {
    planA: "perplexity_pro",
    planB: "kimi_moderato_cn",
    overlapScore: 45,
    complementScore: 65,
    explanation: "研究场景有重叠；Kimi 中文 Agent 与 Perplexity 英文检索互补。",
  },
  {
    planA: "kimi_allegretto_cn",
    planB: "claude_pro",
    overlapScore: 55,
    complementScore: 55,
    explanation: "K3 与 Claude 在代码/Agent 上有重叠，但中文办公 Agent 与 Claude 英文深度推理仍可互补。",
  },
  {
    planA: "kimi_k3_api_global",
    planB: "claude_opus_5_api",
    overlapScore: 60,
    complementScore: 50,
    explanation: "两者都是前沿 API；可按任务分流，但能力面重叠不低。",
  },
  {
    planA: "openai_gpt56_sol_api",
    planB: "claude_opus_5_api",
    overlapScore: 70,
    complementScore: 40,
    explanation: "双前沿 API，重叠高；通常二选一作为主力，另一作补充。",
  },
  {
    planA: "supergrok",
    planB: "perplexity_pro",
    overlapScore: 55,
    complementScore: 55,
    explanation: "都强实时信息；Perplexity 引用研究更系统，Grok 生成/多模态更强。",
  },
  {
    planA: "kimi_moderato_global",
    planB: "chatgpt_plus",
    overlapScore: 55,
    complementScore: 55,
    explanation: "Kimi GLOBAL 与 ChatGPT Plus 通用能力重叠，中文 Agent 与 GPT 生态可互补。",
  },
];
for (const r of newRelations) {
  const exists = relations.planRelations.some(
    (x) =>
      (x.planA === r.planA && x.planB === r.planB) ||
      (x.planA === r.planB && x.planB === r.planA)
  );
  if (!exists) relations.planRelations.push(r);
}

// ---------- fx ----------
fx.schemaVersion = "0.3.0";
fx.lastUpdatedAt = TODAY;
fx.status = "manual_mid_market_estimate_refreshed";
fx.rates = [
  { currency: "CNY", rateToCny: 1, source: "identity", asOf: TODAY },
  {
    currency: "USD",
    rateToCny: 6.78,
    source: "appstoreprice_embedded_mid_market_2026-07-30",
    asOf: TODAY,
  },
  {
    currency: "JPY",
    rateToCny: 0.0414,
    source: "derived_from_appstoreprice_jpy_cny_pairs_2026-07-30",
    asOf: TODAY,
  },
  {
    currency: "EUR",
    rateToCny: 7.71,
    source: "derived_from_appstoreprice_eur_cny_pairs_2026-07-30",
    asOf: TODAY,
  },
  {
    currency: "GBP",
    rateToCny: 9.01,
    source: "derived_from_appstoreprice_gbp_cny_pairs_2026-07-30",
    asOf: TODAY,
  },
];
fx.notes = [
  "Mid-market style estimates for recommendation comparisons, not payment settlement rates.",
  "2026-07-30 refresh aligned roughly with appstoreprice.org embedded FX (USD/CNY ≈ 6.78).",
  "JPY/CNY ≈ 0.0414 from JP App Store list pairs (e.g. ChatGPT Plus ¥3000 ≈ ¥124.12 CNY).",
  "Full multi-currency App Store matrices are in regional-prices.json with source-side CNY conversion.",
];

// ---------- regional-prices plan mapping fix for Kimi tiers ----------
regional.schemaVersion = "0.3.0";
regional.lastUpdatedAt = TODAY;
// rebuild kimi plan mappings from product names
const kimiApp = regional.apps.find((a) => a.appKey === "kimi");
if (kimiApp) {
  const kimiMap = [
    { re: /^moderato$/i, planId: "kimi_moderato_global" },
    { re: /^allegretto$/i, planId: "kimi_allegretto_global" },
    { re: /^allegro$/i, planId: "kimi_allegro_global" },
    { re: /^vivace$/i, planId: "kimi_vivace_global" },
    { re: /^andante$/i, planId: "kimi_andante_cn" },
  ];
  // remove bad kimi_membership snack mapping
  regional.planRegionalPrices = regional.planRegionalPrices.filter(
    (p) => p.planId !== "kimi_membership"
  );
  for (const product of kimiApp.products) {
    const name = (product.name || "").trim();
    const hit = kimiMap.find((m) => m.re.test(name));
    if (!hit) continue;
    if ((product.period || "").toString().toUpperCase().includes("Y")) continue; // skip annual for primary map
    if (!product.prices || product.prices.length < 5) continue;
    regional.planRegionalPrices.push({
      planId: hit.planId,
      appKey: "kimi",
      productId: product.productId,
      productName: product.name,
      period: product.period,
      isMonthly: true,
      usPrice: product.usPrice,
      jpPrice: product.jpPrice,
      lowest: product.lowest,
      prices: product.prices,
      sourceUrl: kimiApp.sourceUrl,
    });
  }
}

// map google_ai_ultra_us → also ultra_20x style note already in product name
// ensure google ultra maps to ultra_20x for recommender convenience
for (const p of regional.planRegionalPrices) {
  if (p.planId === "google_ai_ultra_us") {
    // keep both: clone for 20x id if US ~200
    if (p.usPrice && p.usPrice.price >= 150) {
      const clone = { ...p, planId: "google_ai_ultra_20x_us" };
      if (!regional.planRegionalPrices.some((x) => x.planId === "google_ai_ultra_20x_us")) {
        regional.planRegionalPrices.push(clone);
      }
    }
  }
}

// ---------- write ----------
write("plans.json", plans);
write("api-options.json", api);
write("scores.json", scores);
write("quotas.json", quotas);
write("model-tiers.json", tiers);
write("model-access-profiles.json", access);
write("relations.json", relations);
write("fx-rates.json", fx);
write("regional-prices.json", regional);

// consistency check
const allPlanIds = new Set([
  ...plans.plans.map((p) => p.id),
  ...api.apiOptions.map((p) => p.id),
]);
const missingScores = [...allPlanIds].filter(
  (id) => !scores.planCapabilityScores.some((s) => s.planId === id)
);
const missingQuotas = [...allPlanIds].filter(
  (id) => !quotas.quotas.some((q) => q.planId === id)
);
const missingTiers = [...allPlanIds].filter(
  (id) => !tiers.tiers.some((t) => t.planId === id)
);
console.log("plans", plans.plans.length, "api", api.apiOptions.length);
console.log("missing scores", missingScores);
console.log("missing quotas", missingQuotas);
console.log("missing tiers", missingTiers);
console.log("relations", relations.planRelations.length);
console.log("regional plan maps", regional.planRegionalPrices.map((p) => p.planId).join(", "));
