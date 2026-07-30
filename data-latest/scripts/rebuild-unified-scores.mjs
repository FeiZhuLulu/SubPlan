/**
 * Unified benchmark matrix + deterministic rescoring.
 *
 * Rules (user requirement):
 * - All models use the SAME metric set.
 * - Missing = null. Never fill with a different benchmark.
 * - Plan scores derive only from this matrix + fixed product deltas.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.resolve(__dirname, "../../data");
const TODAY = "2026-07-30";

const read = (n) => JSON.parse(fs.readFileSync(path.join(DATA, n), "utf8"));
const write = (n, o) => {
  fs.writeFileSync(path.join(DATA, n), JSON.stringify(o, null, 2) + "\n");
  console.log("wrote", n);
};

// ---------------------------------------------------------------------------
// 1) Unified metric definitions — every model row has exactly these keys
// ---------------------------------------------------------------------------
const METRICS = {
  aaIntelligenceIndex: {
    id: "aaIntelligenceIndex",
    label: "Artificial Analysis Intelligence Index v4.1",
    unit: "index",
    comparableAcrossModels: true,
    harness: "Artificial Analysis (same eval suite for all models)",
    sources: ["https://artificialanalysis.ai/", "https://openai.com/index/gpt-5-6/"],
    asOf: "2026-07",
    role: "general_intelligence",
  },
  swebenchVerifiedVals: {
    id: "swebenchVerifiedVals",
    label: "SWE-bench Verified % (Vals AI Mini-SWE-agent)",
    unit: "percent",
    comparableAcrossModels: true,
    harness: "Vals AI Mini-SWE-agent (single harness)",
    sources: ["https://vals.ai/benchmarks/swebench"],
    asOf: "2026-07-22",
    role: "coding_patch_quality",
  },
  aaCodingAgentIndex: {
    id: "aaCodingAgentIndex",
    label: "Artificial Analysis Coding Agent Index",
    unit: "index",
    // IMPORTANT: AA publishes per-model with model-native harnesses (Codex / Claude Code / Kimi Code / Grok Build).
    // We still store the SAME metric key for everyone, but mark cross-model comparability as limited.
    comparableAcrossModels: "limited_harness_coupled",
    harness:
      "AA Coding Agent Index components (DeepSWE, Terminal-Bench, SWE-Atlas-QnA) with model-native agent harness",
    sources: [
      "https://artificialanalysis.ai/articles/gpt-5-6-has-landed",
      "https://openai.com/index/gpt-5-6/",
    ],
    asOf: "2026-07",
    role: "agent_coding_secondary",
    caveat:
      "Index score is somewhat harness-coupled. Used only as a secondary weight, never as the sole coding score, and never replaced by a different coding bench when missing.",
  },
};

/**
 * Normalize by frontier ceiling (max observed in THIS matrix for that metric).
 * Same formula for every model: value / max_in_matrix * 100.
 * Do NOT use lo/hi windows that over-punish mid-frontier.
 * AA Coding Agent is stored for transparency but excluded from primary score
 * (harness-coupled: Codex vs Claude Code vs Kimi Code).
 */
const FRONTIER_MAX = {
  aaIntelligenceIndex: 61, // Opus 5 max in matrix
  swebenchVerifiedVals: 97.0, // Opus 5 Vals
  aaCodingAgentIndex: 80, // Sol Codex / Opus joint ceiling
};

function norm(metricId, value) {
  if (value == null || Number.isNaN(value)) return null;
  const hi = FRONTIER_MAX[metricId];
  return Math.max(0, Math.min(100, Math.round((value / hi) * 1000) / 10));
}

// ---------------------------------------------------------------------------
// 2) Model matrix — identical keys; null if we do not have THAT metric
// ---------------------------------------------------------------------------
/** @type {Record<string, any>} */
const MODELS = {
  "claude-opus-5": {
    label: "Claude Opus 5",
    provider: "Anthropic",
    metrics: {
      aaIntelligenceIndex: 61,
      swebenchVerifiedVals: 97.0,
      aaCodingAgentIndex: 80, // joint-first with Claude Code (AA reports joint #1 coding agent)
    },
    metricNotes: {
      aaIntelligenceIndex: "AA: Opus 5 (max) ~61, narrowly leads Fable 5",
      swebenchVerifiedVals: "Vals Mini-SWE-agent 97.00%",
      aaCodingAgentIndex: "AA: joint first with Claude Code (xhigh); treated as ~80 ceiling peer to Sol Codex",
    },
  },
  "claude-fable-5": {
    label: "Claude Fable 5",
    provider: "Anthropic",
    metrics: {
      aaIntelligenceIndex: 59.9,
      swebenchVerifiedVals: 95.0,
      aaCodingAgentIndex: 77.2,
    },
    metricNotes: {
      aaIntelligenceIndex: "AA / OpenAI table ~59.9",
      swebenchVerifiedVals: "Vals 95.00%",
      aaCodingAgentIndex: "OpenAI GPT-5.6 announcement table: Fable 5 77.2 on Coding Agent Index v1.1",
    },
  },
  "gpt-5.6-sol": {
    label: "GPT-5.6 Sol",
    provider: "OpenAI",
    metrics: {
      aaIntelligenceIndex: 58.9,
      swebenchVerifiedVals: 96.2,
      aaCodingAgentIndex: 80,
    },
    metricNotes: {
      aaIntelligenceIndex: "OpenAI/AA table 58.9 (max)",
      swebenchVerifiedVals: "Vals 96.20%",
      aaCodingAgentIndex: "Sol max in Codex harness 80 (AA)",
    },
  },
  "gpt-5.6-terra": {
    label: "GPT-5.6 Terra",
    provider: "OpenAI",
    metrics: {
      aaIntelligenceIndex: 55,
      swebenchVerifiedVals: null, // no Vals row collected — leave null, do NOT use another SWE source
      aaCodingAgentIndex: 77.4,
    },
    metricNotes: {
      aaIntelligenceIndex: "OpenAI/AA ~55 (max)",
      swebenchVerifiedVals: null,
      aaCodingAgentIndex: "Terra max 77.4",
    },
  },
  "gpt-5.6-luna": {
    label: "GPT-5.6 Luna",
    provider: "OpenAI",
    metrics: {
      aaIntelligenceIndex: 51.2,
      swebenchVerifiedVals: 93.0,
      aaCodingAgentIndex: 74.6,
    },
    metricNotes: {
      aaIntelligenceIndex: "OpenAI/AA 51.2",
      swebenchVerifiedVals: "Vals 93.00%",
      aaCodingAgentIndex: "Luna max 74.6",
    },
  },
  "kimi-k3": {
    label: "Kimi K3",
    provider: "Kimi / Moonshot",
    metrics: {
      aaIntelligenceIndex: 57,
      swebenchVerifiedVals: 93.4,
      aaCodingAgentIndex: 57,
    },
    metricNotes: {
      aaIntelligenceIndex: "AA ~57",
      swebenchVerifiedVals: "Vals 93.40%",
      aaCodingAgentIndex: "Kimi Code CLI harness 57 (AA #5 class)",
    },
  },
  "claude-opus-4.8": {
    label: "Claude Opus 4.8",
    provider: "Anthropic",
    metrics: {
      aaIntelligenceIndex: 56,
      swebenchVerifiedVals: 88.6,
      aaCodingAgentIndex: 55,
    },
    metricNotes: {
      aaIntelligenceIndex: "AA Opus 4.8 max ~56",
      swebenchVerifiedVals: "Vals 88.60%",
      aaCodingAgentIndex: "AA Opus 4.8 max ~55",
    },
  },
  "grok-4.5": {
    label: "Grok 4.5",
    provider: "xAI",
    metrics: {
      aaIntelligenceIndex: 54,
      swebenchVerifiedVals: 86.6,
      aaCodingAgentIndex: 58,
    },
    metricNotes: {
      aaIntelligenceIndex: "AA Grok 4.5 high ~54",
      swebenchVerifiedVals: "Vals 86.60%",
      aaCodingAgentIndex: "AA coding-agent high ~58 (Grok Build; harness-coupled)",
    },
  },
  "gemini-3.6-flash": {
    label: "Gemini 3.6 Flash",
    provider: "Google",
    metrics: {
      aaIntelligenceIndex: 50,
      swebenchVerifiedVals: null,
      aaCodingAgentIndex: null,
    },
    metricNotes: {
      aaIntelligenceIndex: "AA Gemini 3.6 Flash (high) ~50 vs Sol high 56",
      swebenchVerifiedVals: null,
      aaCodingAgentIndex: null,
    },
  },
  "gemini-3.1-pro": {
    label: "Gemini 3.1 Pro",
    provider: "Google",
    metrics: {
      aaIntelligenceIndex: null, // do not invent from Flash or vendor cards under other names
      swebenchVerifiedVals: null, // older model-card SWE numbers use different harness eras — leave null unless Vals row exists
      aaCodingAgentIndex: null,
    },
    metricNotes: {
      aaIntelligenceIndex: null,
      swebenchVerifiedVals: null,
      aaCodingAgentIndex: null,
    },
  },
  "claude-sonnet-5": {
    label: "Claude Sonnet 5",
    provider: "Anthropic",
    metrics: {
      aaIntelligenceIndex: null,
      swebenchVerifiedVals: null,
      aaCodingAgentIndex: null,
    },
    metricNotes: {},
  },
  "kimi-k2.6": {
    label: "Kimi K2.6",
    provider: "Kimi",
    metrics: {
      aaIntelligenceIndex: null,
      swebenchVerifiedVals: null,
      aaCodingAgentIndex: null,
    },
    metricNotes: {},
  },
  "kimi-k2.7-code": {
    label: "Kimi K2.7 Code",
    provider: "Kimi",
    metrics: {
      aaIntelligenceIndex: null,
      swebenchVerifiedVals: null,
      aaCodingAgentIndex: null,
    },
    metricNotes: {},
  },
  "grok-4": {
    label: "Grok 4",
    provider: "xAI",
    metrics: {
      aaIntelligenceIndex: null,
      swebenchVerifiedVals: null,
      aaCodingAgentIndex: null,
    },
    metricNotes: {},
  },
  "perplexity-research-pool": {
    label: "Perplexity multi-model research pool",
    provider: "Perplexity",
    metrics: {
      aaIntelligenceIndex: null,
      swebenchVerifiedVals: null,
      aaCodingAgentIndex: null,
    },
    metricNotes: {},
    isProductPool: true,
  },
  "perplexity-computer": {
    label: "Perplexity Computer + research",
    provider: "Perplexity",
    metrics: {
      aaIntelligenceIndex: null,
      swebenchVerifiedVals: null,
      aaCodingAgentIndex: null,
    },
    metricNotes: {},
    isProductPool: true,
  },
};

// ---------------------------------------------------------------------------
// 3) Model-level capability scores from UNIFIED formula only
// ---------------------------------------------------------------------------
/**
 * Coding family (agentCoding, backend, debugging, codeReview):
 *   ONLY cross-model comparable primaries:
 *     0.55 * norm(Vals SWE-bench Verified) + 0.45 * norm(AA Intelligence Index)
 *   AA Coding Agent Index is stored but NOT mixed in (harness-coupled).
 *   If one primary missing: use the other * 0.97 (flag medium confidence).
 *   If both missing → null.
 *
 * Research/chat/englishWriting lean AA intelligence when present.
 * Frontend: same coding base (no Code Arena substitution in matrix).
 * Multimodal/image/chinese/ecosystem: product deltas only.
 */
function modelDerivedScores(modelId) {
  const m = MODELS[modelId];
  if (!m) return null;
  const { metrics } = m;
  const sweN = norm("swebenchVerifiedVals", metrics.swebenchVerifiedVals);
  const intelN = norm("aaIntelligenceIndex", metrics.aaIntelligenceIndex);

  let codingBase = null;
  if (sweN != null && intelN != null) {
    codingBase = 0.55 * sweN + 0.45 * intelN;
  } else if (sweN != null) {
    codingBase = sweN * 0.97;
  } else if (intelN != null) {
    codingBase = intelN * 0.97;
  }

  const round = (x) => (x == null ? null : Math.round(x));

  const researchBase = intelN != null ? intelN : codingBase;
  const chatBase = intelN != null ? 0.7 * intelN + 30 : codingBase != null ? 0.5 * codingBase + 40 : null;
  const enWrite = intelN != null ? 0.6 * intelN + 40 : null;
  const frontendBase = codingBase;

  return {
    modelId,
    derived: {
      agentCoding: round(codingBase),
      backend: round(codingBase != null ? codingBase - 1 : null),
      debugging: round(codingBase != null ? codingBase - 1 : null),
      codeReview: round(codingBase != null ? codingBase - 2 : null),
      frontend: round(frontendBase != null ? frontendBase - 3 : null),
      research: round(researchBase != null ? Math.min(100, researchBase + 6) : null),
      chat: round(chatBase),
      englishWriting: round(enWrite != null ? Math.min(100, enWrite) : null),
      chineseWriting: null,
      imageGeneration: null,
      multimodal: null,
      ecosystem: null,
    },
    primaryCoverage: {
      hasSwe: metrics.swebenchVerifiedVals != null,
      hasIntel: metrics.aaIntelligenceIndex != null,
      hasCodingAgent: metrics.aaCodingAgentIndex != null,
      codingAgentUsedInScore: false,
      confidence:
        metrics.swebenchVerifiedVals != null && metrics.aaIntelligenceIndex != null
          ? "high"
          : metrics.aaIntelligenceIndex != null || metrics.swebenchVerifiedVals != null
            ? "medium"
            : "none",
    },
  };
}

// ---------------------------------------------------------------------------
// 4) Plan = weighted model mix + FIXED product deltas (not alternate benches)
// ---------------------------------------------------------------------------
const PRODUCT_DELTAS = {
  // applied after model blend; fixed rules, not model-specific benches
  openai_chat: { imageGeneration: 94, multimodal: 12, ecosystem: 18, chineseWriting: -2 },
  anthropic_chat: { imageGeneration: 0, multimodal: 0, ecosystem: 12, chineseWriting: -8, englishWriting: 4 },
  google_plus_flash: { imageGeneration: 88, multimodal: 22, ecosystem: 20, chineseWriting: 0, chat: 6 },
  google_pro: { imageGeneration: 92, multimodal: 24, ecosystem: 22, chineseWriting: 0, research: 10, chat: 4 },
  google_ultra: { imageGeneration: 95, multimodal: 25, ecosystem: 24, chineseWriting: 0, research: 12, chat: 5, agentCoding: 4 },
  kimi_cn: { chineseWriting: 18, multimodal: 10, ecosystem: 0, imageGeneration: 55, frontend: 8 },
  kimi_global: { chineseWriting: 16, multimodal: 10, ecosystem: 0, imageGeneration: 55, frontend: 8 },
  grok: { imageGeneration: 95, multimodal: 14, ecosystem: 6, research: 10, chat: 8, chineseWriting: -4 },
  perplexity: { research: 28, chat: 6, agentCoding: -18, backend: -18, frontend: -20, debugging: -18, codeReview: -18, imageGeneration: 55, multimodal: 0, ecosystem: 6 },
  api_text: { imageGeneration: 0, multimodal: 0, ecosystem: 8 },
};

function clamp100(n) {
  if (n == null || Number.isNaN(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function blendModels(models /* {modelId, weight}[] */) {
  const keys = [
    "agentCoding",
    "backend",
    "debugging",
    "codeReview",
    "frontend",
    "research",
    "chat",
    "englishWriting",
    "chineseWriting",
    "imageGeneration",
    "multimodal",
    "ecosystem",
  ];
  const acc = Object.fromEntries(keys.map((k) => [k, { sum: 0, w: 0 }]));
  let conf = "high";
  let anyContributor = false;
  for (const { modelId, weight } of models) {
    const d = modelDerivedScores(modelId);
    if (!d) continue;
    // Only models that actually contribute primary-derived scores affect confidence
    const contributes = Object.values(d.derived).some((v) => v != null);
    if (!contributes) continue;
    anyContributor = true;
    if (d.primaryCoverage.confidence === "medium") conf = conf === "high" ? "medium" : conf;
    if (d.primaryCoverage.confidence === "none") conf = "low";
    for (const k of keys) {
      const v = d.derived[k];
      if (v == null) continue;
      acc[k].sum += v * weight;
      acc[k].w += weight;
    }
  }
  if (!anyContributor) conf = "low";
  const out = {};
  for (const k of keys) {
    out[k] = acc[k].w > 0 ? acc[k].sum / acc[k].w : null;
  }
  return { scores: out, confidence: conf };
}

function applyDeltas(base, deltaKey) {
  const d = PRODUCT_DELTAS[deltaKey] || {};
  const out = { ...base };
  for (const [k, v] of Object.entries(d)) {
    if (k === "imageGeneration" || k === "chineseWriting") {
      // absolute product fields when base null
      if (out[k] == null) out[k] = v;
      else if (k === "chineseWriting") out[k] = out[k] + v;
      else out[k] = v; // image often absolute
    } else {
      out[k] = (out[k] ?? 70) + v;
    }
  }
  // defaults for still-null product dims
  if (out.chineseWriting == null) out.chineseWriting = 78;
  if (out.imageGeneration == null) out.imageGeneration = 40;
  if (out.multimodal == null) out.multimodal = 70;
  if (out.ecosystem == null) out.ecosystem = 70;
  if (out.chat == null) out.chat = 80;
  if (out.englishWriting == null) out.englishWriting = 82;
  // coding nulls → conservative mid
  for (const k of ["agentCoding", "backend", "debugging", "codeReview", "frontend", "research"]) {
    if (out[k] == null) out[k] = 65;
  }
  const final = {};
  for (const [k, v] of Object.entries(out)) final[k] = clamp100(v);
  return final;
}

function tierFromScore(n) {
  if (n >= 90) return "S";
  if (n >= 80) return "A";
  if (n >= 65) return "B";
  if (n >= 45) return "C";
  return "D";
}

// Plan model mixes (must match access profiles)
const PLAN_MIX = {
  chatgpt_plus: { models: [{ modelId: "gpt-5.6-sol", weight: 1 }], delta: "openai_chat" },
  chatgpt_pro_5x: { models: [{ modelId: "gpt-5.6-sol", weight: 1 }], delta: "openai_chat", bonus: { agentCoding: 2, backend: 2, research: 1 } },
  chatgpt_pro_20x: { models: [{ modelId: "gpt-5.6-sol", weight: 1 }], delta: "openai_chat", bonus: { agentCoding: 2, backend: 2, research: 1 } },
  claude_pro: {
    models: [
      { modelId: "claude-opus-5", weight: 0.35 },
      { modelId: "claude-opus-4.8", weight: 0.35 },
      { modelId: "claude-fable-5", weight: 0.15 },
      { modelId: "claude-sonnet-5", weight: 0.15 },
    ],
    delta: "anthropic_chat",
  },
  claude_max_5x: {
    models: [
      { modelId: "claude-fable-5", weight: 0.45 },
      { modelId: "claude-opus-5", weight: 0.35 },
      { modelId: "claude-opus-4.8", weight: 0.15 },
      { modelId: "claude-sonnet-5", weight: 0.05 },
    ],
    delta: "anthropic_chat",
  },
  claude_max_20x: {
    models: [
      { modelId: "claude-fable-5", weight: 0.5 },
      { modelId: "claude-opus-5", weight: 0.35 },
      { modelId: "claude-opus-4.8", weight: 0.1 },
      { modelId: "claude-sonnet-5", weight: 0.05 },
    ],
    delta: "anthropic_chat",
  },
  google_ai_plus_us: { models: [{ modelId: "gemini-3.6-flash", weight: 1 }], delta: "google_plus_flash" },
  google_ai_pro_us: {
    models: [
      { modelId: "gemini-3.1-pro", weight: 0.55 },
      { modelId: "gemini-3.6-flash", weight: 0.45 },
    ],
    delta: "google_pro",
  },
  google_ai_pro_jp: {
    models: [
      { modelId: "gemini-3.1-pro", weight: 0.55 },
      { modelId: "gemini-3.6-flash", weight: 0.45 },
    ],
    delta: "google_pro",
  },
  google_ai_ultra_5x_us: {
    models: [
      { modelId: "gemini-3.1-pro", weight: 0.7 },
      { modelId: "gemini-3.6-flash", weight: 0.3 },
    ],
    delta: "google_ultra",
  },
  google_ai_ultra_20x_us: {
    models: [
      { modelId: "gemini-3.1-pro", weight: 0.75 },
      { modelId: "gemini-3.6-flash", weight: 0.25 },
    ],
    delta: "google_ultra",
  },
  kimi_moderato_cn: {
    models: [
      { modelId: "kimi-k3", weight: 0.55 },
      { modelId: "kimi-k2.6", weight: 0.45 },
    ],
    delta: "kimi_cn",
  },
  kimi_allegretto_cn: {
    models: [
      { modelId: "kimi-k3", weight: 0.7 },
      { modelId: "kimi-k2.7-code", weight: 0.3 },
    ],
    delta: "kimi_cn",
  },
  kimi_allegro_cn: {
    models: [
      { modelId: "kimi-k3", weight: 0.75 },
      { modelId: "kimi-k2.7-code", weight: 0.25 },
    ],
    delta: "kimi_cn",
    bonus: { research: 3, agentCoding: 1 },
  },
  kimi_andante_cn: {
    models: [
      { modelId: "kimi-k3", weight: 0.35 },
      { modelId: "kimi-k2.6", weight: 0.65 },
    ],
    delta: "kimi_cn",
  },
  kimi_moderato_global: { models: [{ modelId: "kimi-k3", weight: 1 }], delta: "kimi_global" },
  kimi_allegretto_global: { models: [{ modelId: "kimi-k3", weight: 1 }], delta: "kimi_global" },
  kimi_allegro_global: { models: [{ modelId: "kimi-k3", weight: 1 }], delta: "kimi_global", bonus: { research: 3 } },
  kimi_vivace_global: { models: [{ modelId: "kimi-k3", weight: 1 }], delta: "kimi_global", bonus: { research: 4, agentCoding: 1 } },
  supergrok: { models: [{ modelId: "grok-4.5", weight: 1 }], delta: "grok" },
  supergrok_heavy: { models: [{ modelId: "grok-4.5", weight: 1 }], delta: "grok", bonus: { agentCoding: 4, research: 2 } },
  supergrok_lite: { models: [{ modelId: "grok-4", weight: 1 }], delta: "grok", bonus: { agentCoding: -8, research: -4, imageGeneration: -5 } },
  perplexity_pro: { models: [{ modelId: "perplexity-research-pool", weight: 1 }], delta: "perplexity" },
  perplexity_max: { models: [{ modelId: "perplexity-computer", weight: 1 }], delta: "perplexity", bonus: { research: 2, agentCoding: 6 } },
  openai_gpt56_sol_api: { models: [{ modelId: "gpt-5.6-sol", weight: 1 }], delta: "api_text" },
  openai_gpt56_terra_api: { models: [{ modelId: "gpt-5.6-terra", weight: 1 }], delta: "api_text" },
  openai_gpt56_luna_api: { models: [{ modelId: "gpt-5.6-luna", weight: 1 }], delta: "api_text" },
  claude_opus_5_api: { models: [{ modelId: "claude-opus-5", weight: 1 }], delta: "api_text" },
  claude_opus_48_api: { models: [{ modelId: "claude-opus-4.8", weight: 1 }], delta: "api_text" },
  claude_fable_5_api: { models: [{ modelId: "claude-fable-5", weight: 1 }], delta: "api_text" },
  claude_sonnet_5_api: { models: [{ modelId: "claude-sonnet-5", weight: 1 }], delta: "api_text" },
  kimi_k3_api_global: { models: [{ modelId: "kimi-k3", weight: 1 }], delta: "kimi_global" },
  kimi_k3_api_cn: { models: [{ modelId: "kimi-k3", weight: 1 }], delta: "kimi_cn" },
};

function scorePlan(planId) {
  const cfg = PLAN_MIX[planId];
  if (!cfg) return null;
  const { scores: blended, confidence } = blendModels(cfg.models);
  let s = applyDeltas(blended, cfg.delta);
  if (cfg.bonus) {
    for (const [k, v] of Object.entries(cfg.bonus)) {
      s[k] = clamp100((s[k] ?? 70) + v);
    }
  }
  // anthropic image force 0
  if (cfg.delta === "anthropic_chat" || (cfg.delta === "api_text" && planId.startsWith("claude_"))) {
    if (planId.includes("claude") || cfg.delta === "anthropic_chat") {
      if (MODELS[cfg.models[0]?.modelId]?.provider === "Anthropic" || planId.includes("claude")) {
        s.imageGeneration = 0;
      }
    }
  }
  if (planId.startsWith("claude_")) s.imageGeneration = 0;

  const noteParts = [
    "Unified matrix: AA Intelligence Index + Vals SWE-bench Verified (+ AA Coding Agent secondary if present).",
    `Models: ${cfg.models.map((m) => `${m.modelId}@${m.weight}`).join(", ")}.`,
    "No cross-bench substitution for missing cells.",
  ];
  return {
    planId,
    scores: s,
    scoreConfidence: confidence === "none" ? "low" : confidence,
    scoreBasis: "unified_benchmark_matrix_v0.4.0",
    notes: noteParts.join(" "),
    tiers: {
      agentCoding: tierFromScore(s.agentCoding),
      backend: tierFromScore(s.backend),
      debugging: tierFromScore(s.debugging),
      codeReview: tierFromScore(s.codeReview),
      research: tierFromScore(s.research),
    },
  };
}

// ---------------------------------------------------------------------------
// Write model-benchmarks.json as the single source of truth
// ---------------------------------------------------------------------------
const modelRows = Object.entries(MODELS).map(([modelId, m]) => {
  const derived = modelDerivedScores(modelId);
  return {
    modelId,
    label: m.label,
    provider: m.provider,
    isProductPool: !!m.isProductPool,
    metrics: m.metrics,
    metricNotes: m.metricNotes,
    normalized: {
      aaIntelligenceIndex: norm("aaIntelligenceIndex", m.metrics.aaIntelligenceIndex),
      swebenchVerifiedVals: norm("swebenchVerifiedVals", m.metrics.swebenchVerifiedVals),
      aaCodingAgentIndex: norm("aaCodingAgentIndex", m.metrics.aaCodingAgentIndex),
    },
    derivedCapabilityScores: derived?.derived ?? null,
    coverage: derived?.primaryCoverage ?? null,
  };
});

const benchmarksOut = {
  schemaVersion: "0.4.0",
  lastUpdatedAt: TODAY,
  methodology: {
    principle:
      "One fixed metric set for every model. Missing values are null. We never score model A with metric set X and model B with a different set Y.",
    metrics: METRICS,
    normalization: {
      method: "value / frontier_max_in_matrix * 100",
      frontierMax: FRONTIER_MAX,
      note: "Same ceiling for every model. No lo/hi window that over-penalizes mid-frontier.",
    },
    modelScoreFormula: {
      codingFamily:
        "PRIMARY ONLY: 0.55*norm(Vals SWE-bench Verified) + 0.45*norm(AA Intelligence Index). If one missing: use the other * 0.97 (medium confidence). AA Coding Agent Index is recorded but NOT mixed into the score (harness-coupled).",
      research: "Primarily norm(AA Intelligence); else coding base.",
      productOnlyDims: ["chineseWriting", "imageGeneration", "multimodal", "ecosystem"],
      planScore: "quotaShare-weighted average of model derived scores + fixed product deltas (not alternate benches).",
    },
    nonGoals: [
      "Do not use vendor-only SWE-bench Pro to fill missing Vals SWE cells.",
      "Do not use Code Arena only for Kimi frontend while using another frontend proxy for others inside the matrix.",
      "Do not mix AA Coding Agent Index into primary scores across different agent harnesses.",
      "Do not use Sol Pro (not in Codex path).",
    ],
  },
  sources: [
    { id: "aa", title: "Artificial Analysis", url: "https://artificialanalysis.ai/", asOf: "2026-07" },
    { id: "vals_swe", title: "Vals AI SWE-bench Verified", url: "https://vals.ai/benchmarks/swebench", asOf: "2026-07-22" },
    { id: "openai_gpt56", title: "OpenAI GPT-5.6 post (tables citing AA)", url: "https://openai.com/index/gpt-5-6/", asOf: "2026-07-09" },
    { id: "aa_opus5", title: "AA Claude Opus 5 writeup", url: "https://artificialanalysis.ai/", asOf: "2026-07" },
  ],
  models: modelRows,
};

write("model-benchmarks.json", benchmarksOut);

// ---------------------------------------------------------------------------
// Apply to scores.json + model-tiers.json for PLAN_MIX plans
// ---------------------------------------------------------------------------
const scores = read("scores.json");
const tiers = read("model-tiers.json");
scores.schemaVersion = "0.4.0";
scores.lastUpdatedAt = TODAY;
scores.notes = [
  "Plan capability scores 0-100.",
  "v0.4.0 UNIFIED: every frontier model scored on the same metric set (AA Intelligence Index + Vals SWE-bench Verified; AA Coding Agent secondary when present).",
  "Missing metric cells are null — never replaced with a different benchmark.",
  "Formula + matrix: data/model-benchmarks.json methodology section.",
  "Product-only dims (image/chinese/multimodal/ecosystem) use fixed product deltas, not cherry-picked model benches.",
];

tiers.schemaVersion = "0.4.0";
tiers.lastUpdatedAt = TODAY;
tiers.notes = [
  "Intelligence tiers S/A/B/C/D mapped from unified 0-100 scores (S≥90, A≥80, B≥65, C≥45).",
  "v0.4.0 aligned with unified benchmark matrix.",
];

const computed = [];
for (const planId of Object.keys(PLAN_MIX)) {
  const r = scorePlan(planId);
  if (!r) continue;
  computed.push(r);
  const si = scores.planCapabilityScores.findIndex((x) => x.planId === planId);
  const scoreRec = {
    planId,
    scores: r.scores,
    scoreConfidence: r.scoreConfidence,
    scoreBasis: r.scoreBasis,
    notes: r.notes,
  };
  if (si >= 0) scores.planCapabilityScores[si] = scoreRec;
  else scores.planCapabilityScores.push(scoreRec);

  const ti = tiers.tiers.findIndex((x) => x.planId === planId);
  const tierRec = {
    planId,
    tierByCapability: r.tiers,
    evidenceLevel: r.scoreConfidence === "high" ? "high" : r.scoreConfidence === "medium" ? "medium" : "low",
    notes: "From unified matrix v0.4.0",
  };
  if (ti >= 0) tiers.tiers[ti] = { ...tiers.tiers[ti], ...tierRec };
  else tiers.tiers.push(tierRec);
}

write("scores.json", scores);
write("model-tiers.json", tiers);

// Print coding ladder for audit
console.log("\n=== Unified model coding ladder (derived agentCoding) ===");
for (const row of modelRows.filter((m) => m.derivedCapabilityScores?.agentCoding != null).sort((a, b) => b.derivedCapabilityScores.agentCoding - a.derivedCapabilityScores.agentCoding)) {
  const m = row.metrics;
  console.log(
    row.modelId.padEnd(18),
    "code",
    row.derivedCapabilityScores.agentCoding,
    "| AA",
    m.aaIntelligenceIndex ?? "—",
    "SWE",
    m.swebenchVerifiedVals ?? "—",
    "CA",
    m.aaCodingAgentIndex ?? "—",
    "|",
    row.coverage.confidence
  );
}
console.log("\n=== Plan agentCoding (after product deltas) ===");
for (const r of computed.sort((a, b) => b.scores.agentCoding - a.scores.agentCoding).slice(0, 20)) {
  console.log(r.planId.padEnd(28), r.scores.agentCoding, r.tiers.agentCoding, r.scoreConfidence);
}
