/**
 * Align v0.3/0.4 rescores with the original dataset scale (git HEAD scores.json).
 *
 * Problem: unified matrix mapped frontier models to 95–100, breaking consistency
 * with Cursor/GLM/DeepSeek/etc. still on the original 0–100 curation scale.
 *
 * Fix:
 * 1. Start from HEAD scores for every plan that already existed.
 * 2. Apply modest model-upgrade deltas (unified relative ranking preserved).
 * 3. Score brand-new plans by analogy to HEAD peers (same scale).
 * 4. Keep model-benchmarks.json as relative evidence, not raw plan scores.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.resolve(__dirname, "../../data");
const HEAD = path.resolve(__dirname, "../raw/scores-head.json");
const TODAY = "2026-07-30";

const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const write = (n, o) => {
  fs.writeFileSync(path.join(DATA, n), JSON.stringify(o, null, 2) + "\n");
  console.log("wrote", n);
};

const head = read(HEAD);
const current = read(path.join(DATA, "scores.json"));
const tiers = read(path.join(DATA, "model-tiers.json"));
const benchmarks = read(path.join(DATA, "model-benchmarks.json"));
const plans = read(path.join(DATA, "plans.json"));
const api = read(path.join(DATA, "api-options.json"));

const headMap = new Map(head.planCapabilityScores.map((r) => [r.planId, r]));
const CAPS = [
  "frontend",
  "backend",
  "agentCoding",
  "debugging",
  "codeReview",
  "chineseWriting",
  "englishWriting",
  "research",
  "chat",
  "imageGeneration",
  "multimodal",
  "ecosystem",
];

function clamp(n) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function cloneScores(sc) {
  const o = {};
  for (const k of CAPS) o[k] = sc[k] ?? 0;
  return o;
}

function applyDelta(sc, delta) {
  const o = cloneScores(sc);
  for (const [k, v] of Object.entries(delta || {})) {
    o[k] = clamp((o[k] ?? 0) + v);
  }
  return o;
}

function tierFrom(n) {
  if (n >= 90) return "S";
  if (n >= 80) return "A";
  if (n >= 65) return "B";
  if (n >= 45) return "C";
  return "D";
}

function makeRec(planId, scores, notes, conf = "medium") {
  return {
    planId,
    scores: cloneScores(scores),
    scoreConfidence: conf,
    scoreBasis: "head_scale_aligned_v0.4.1",
    notes,
  };
}

/**
 * Model-upgrade deltas on HEAD base (not absolute recompute).
 * Relative order from unified matrix: Opus5 ≥ Fable ≈ Sol > K3 > Opus4.8 > Grok > Flash
 * Absolute numbers stay near original dataset.
 */
const HEAD_UPGRADES = {
  // OpenAI → GPT-5.6 Sol (Codex path; no Sol Pro)
  chatgpt_plus: {
    delta: { agentCoding: 6, backend: 3, debugging: 3, codeReview: 3, frontend: 2, research: 1, multimodal: 1 },
    notes: "HEAD base + GPT-5.6 Sol (unified rank ~Sol). Scale aligned to original dataset.",
  },
  chatgpt_pro_5x: {
    delta: { agentCoding: 2, backend: 1, debugging: 1, codeReview: 1, research: 0 },
    notes: "HEAD Pro base + Sol higher-effort quota (not Sol Pro). Dataset scale.",
  },
  chatgpt_pro_20x: {
    delta: { agentCoding: 2, backend: 1, debugging: 1, codeReview: 1, research: 0 },
    notes: "HEAD Pro base + Sol higher-effort quota (not Sol Pro). Dataset scale.",
  },
  chatgpt_free: {
    delta: { agentCoding: 2, backend: 1, research: 1, chat: 1 },
    notes: "Light refresh; free tier still limited.",
  },
  chatgpt_go_us: {
    delta: { agentCoding: 2, backend: 1, research: 1 },
    notes: "Light refresh on HEAD Go scores.",
  },

  // Claude → Opus 5 / Fable 5 (Max includes Fable; Pro has Fable credits)
  claude_pro: {
    delta: { agentCoding: 4, backend: 3, debugging: 3, codeReview: 3, frontend: 4, research: 2, englishWriting: 1 },
    notes: "HEAD + Opus 5/4.8 main, Fable via credits. Dataset scale (not 95–100 remap).",
  },
  claude_max_5x: {
    delta: { agentCoding: 4, backend: 2, debugging: 2, codeReview: 2, frontend: 2, research: 2, englishWriting: 1 },
    notes: "HEAD + Fable 5 (~50% limits) + Opus 5. Dataset scale.",
  },
  claude_max_20x: {
    delta: { agentCoding: 4, backend: 2, debugging: 2, codeReview: 2, frontend: 2, research: 2, englishWriting: 1 },
    notes: "HEAD + Fable 5 + Opus 5. Same class as Max 5x; quota differs.",
  },
  claude_free: {
    delta: { agentCoding: 1, research: 1 },
    notes: "Light refresh.",
  },

  // Google → 3.6 Flash workhorse / 3.1 Pro research
  google_ai_plus_us: {
    delta: { agentCoding: 8, backend: 5, debugging: 5, codeReview: 4, frontend: 6, research: 2, multimodal: 4, imageGeneration: 4, chat: 2 },
    notes: "HEAD + Gemini 3.6 Flash (GA 2026-07-21), not Gemini 3 Flash.",
  },
  google_ai_pro_us: {
    delta: { agentCoding: 4, backend: 3, debugging: 3, codeReview: 3, frontend: 3, research: 1, multimodal: 1 },
    notes: "HEAD + 3.1 Pro research + 3.6 Flash volume.",
  },
  google_ai_ultra_5x_us: {
    delta: { agentCoding: 5, backend: 3, debugging: 3, codeReview: 3, research: 1, multimodal: 1 },
    notes: "HEAD + Deep Think / highest Pro + 3.6 Flash.",
  },
  google_ai_ultra_20x_us: {
    delta: { agentCoding: 5, backend: 3, debugging: 3, codeReview: 3, research: 1, multimodal: 1 },
    notes: "HEAD Ultra base + model refresh.",
  },

  // Kimi → K3 coding S, slightly below Sol/Fable on unified rank
  kimi_adagio_cn: {
    delta: { agentCoding: 2, research: 2, multimodal: 3, chineseWriting: 1 },
    notes: "Free tier light K3 exposure.",
  },
  kimi_andante_cn: {
    delta: { agentCoding: 3, backend: 2, debugging: 2, frontend: 3, research: 4, multimodal: 4, chineseWriting: 2 },
    notes: "HEAD + limited K3 share.",
  },
  kimi_moderato_cn: {
    delta: { agentCoding: 4, backend: 4, debugging: 4, codeReview: 4, frontend: 6, research: 8, multimodal: 6, chineseWriting: 2, chat: 3 },
    notes: "HEAD + K3 pool. Unified rank: K3 coding S but below Sol/Fable; absolute scale = HEAD+delta.",
  },
  kimi_allegretto_cn: {
    delta: { agentCoding: 1, backend: 3, debugging: 3, codeReview: 3, research: 8, multimodal: 4, chineseWriting: 2, chat: 3 },
    notes: "HEAD Allegretto already strong coding; +K3 research/multimodal. Keep dataset scale.",
  },
  kimi_allegro_cn: {
    // may not exist with high scores in head - handle below
    delta: { agentCoding: 2, backend: 3, debugging: 3, codeReview: 3, research: 6, multimodal: 4, chineseWriting: 2 },
    notes: "HEAD + K3 long-context/swarm.",
  },
};

// Brand-new plans: build from HEAD peer templates
function peer(planId) {
  const r = headMap.get(planId);
  if (!r) throw new Error("missing peer " + planId);
  return cloneScores(r.scores);
}

const NEW_PLANS = {
  google_ai_pro_jp: {
    from: "google_ai_pro_us",
    delta: HEAD_UPGRADES.google_ai_pro_us.delta,
    notes: "Mirrors US Pro capability (HEAD+3.1 Pro/3.6 Flash); JP price only differs.",
  },
  grok_free: {
    from: "chatgpt_free",
    delta: { agentCoding: 8, backend: 5, research: 6, imageGeneration: 15, multimodal: 10, chat: 2, englishWriting: 4, chineseWriting: -5, ecosystem: -5 },
    notes: "Analog to free chat tier + Grok Imagine; dataset scale.",
  },
  supergrok_lite: {
    from: "chatgpt_go_us",
    delta: { agentCoding: 8, backend: 4, debugging: 4, research: 6, imageGeneration: 12, multimodal: 8, chat: 4, chineseWriting: -4, ecosystem: -4 },
    notes: "Between Go and Plus; SuperGrok Lite. Dataset scale.",
  },
  supergrok: {
    from: "chatgpt_plus",
    delta: {
      agentCoding: 2, // slightly under Sol-era Plus after upgrade path
      backend: -2,
      debugging: -1,
      codeReview: -1,
      research: 2,
      imageGeneration: 2,
      multimodal: 0,
      chineseWriting: -8,
      ecosystem: -10,
      chat: -1,
    },
    // Then apply chatgpt_plus upgrade mentally: base HEAD plus 82→ we'll apply plus upgrade first
    notes: "Peer ChatGPT Plus (HEAD) then Grok 4.5 profile: research/Imagine strong, coding a step under Sol.",
    afterPeerUpgrade: "chatgpt_plus",
  },
  supergrok_heavy: {
    from: "chatgpt_pro_5x",
    delta: { agentCoding: -2, backend: -3, research: 0, imageGeneration: 1, chineseWriting: -8, ecosystem: -12, chat: -1 },
    notes: "Peer Pro-class quota; Heavy multi-agent. Dataset scale.",
    afterPeerUpgrade: "chatgpt_pro_5x",
  },
  perplexity_free: {
    from: "chatgpt_free",
    delta: {
      agentCoding: -10,
      backend: -12,
      frontend: -12,
      debugging: -12,
      codeReview: -12,
      research: 10,
      imageGeneration: -40,
      multimodal: -15,
      chat: -5,
      ecosystem: -15,
    },
    notes: "Search-first free; low coding. Dataset scale.",
  },
  perplexity_pro: {
    from: "google_ai_pro_us",
    delta: {
      agentCoding: -22,
      backend: -20,
      frontend: -20,
      debugging: -22,
      codeReview: -22,
      research: 4,
      imageGeneration: -30,
      multimodal: -20,
      chat: 0,
      ecosystem: -14,
      chineseWriting: -2,
    },
    notes: "Research S product; coding not a focus. Anchored to HEAD Google Pro research band.",
    afterPeerUpgrade: "google_ai_pro_us",
  },
  perplexity_max: {
    from: "google_ai_ultra_5x_us",
    delta: {
      agentCoding: -18,
      backend: -16,
      frontend: -16,
      debugging: -18,
      codeReview: -18,
      research: 2,
      imageGeneration: -28,
      multimodal: -18,
      ecosystem: -12,
    },
    notes: "Max/Computer research peak; coding still secondary. Dataset scale.",
    afterPeerUpgrade: "google_ai_ultra_5x_us",
  },
  kimi_moderato_global: {
    from: "kimi_moderato_cn",
    delta: { chineseWriting: -1, englishWriting: 2 },
    notes: "GLOBAL Moderato ≈ CN Moderato capability (K3). Dataset scale.",
    afterPeerUpgrade: "kimi_moderato_cn",
  },
  kimi_allegretto_global: {
    from: "kimi_allegretto_cn",
    delta: { chineseWriting: -1, englishWriting: 2 },
    notes: "GLOBAL Allegretto ≈ CN Allegretto (K3). Dataset scale.",
    afterPeerUpgrade: "kimi_allegretto_cn",
  },
  kimi_allegro_global: {
    from: "kimi_allegro_cn",
    delta: { chineseWriting: -1, englishWriting: 2 },
    notes: "GLOBAL Allegro ≈ CN Allegro. Dataset scale.",
    afterPeerUpgrade: "kimi_allegro_cn",
  },
  kimi_vivace_global: {
    from: "kimi_allegro_cn",
    delta: { agentCoding: 1, backend: 2, research: 3, frontend: 2, chineseWriting: 0, englishWriting: 3, chat: 2 },
    notes: "Top GLOBAL tier above Allegro. Dataset scale.",
    afterPeerUpgrade: "kimi_allegro_cn",
  },

  // APIs — peer subscription/API HEAD rows
  openai_gpt56_sol_api: {
    from: "chatgpt_pro_5x",
    delta: { imageGeneration: -50, multimodal: -4, ecosystem: -4, chat: -2 },
    notes: "Sol API ≈ Pro-class coding (HEAD Pro + Sol). No image product.",
    afterPeerUpgrade: "chatgpt_pro_5x",
  },
  openai_gpt56_terra_api: {
    from: "chatgpt_plus",
    delta: { agentCoding: -2, backend: -2, research: -2, imageGeneration: -50, multimodal: -8 },
    notes: "Terra between Luna and Sol on unified rank; absolute ≈ Plus band.",
    afterPeerUpgrade: "chatgpt_plus",
  },
  openai_gpt56_luna_api: {
    from: "chatgpt_go_us",
    delta: { agentCoding: 8, backend: 6, debugging: 6, codeReview: 6, research: 2, imageGeneration: -50 },
    notes: "Luna value tier; SWE strong but below Sol. Dataset scale.",
  },
  claude_opus_5_api: {
    from: "claude_max_5x",
    delta: { imageGeneration: 0, research: 1, chat: 1 },
    notes: "Opus 5 API ≈ Max coding band (HEAD Max + Fable/Opus refresh).",
    afterPeerUpgrade: "claude_max_5x",
  },
  claude_opus_48_api: {
    from: "claude_pro",
    delta: { agentCoding: 2, backend: 2, debugging: 2, codeReview: 2, imageGeneration: 0 },
    notes: "Opus 4.8 API slightly under Opus 5 / Fable ceiling.",
    afterPeerUpgrade: "claude_pro",
  },
  claude_fable_5_api: {
    from: "claude_max_5x",
    delta: { agentCoding: 1, research: 2, englishWriting: 2, imageGeneration: 0 },
    notes: "Fable 5 API: unified rank ≈ Sol, intelligence slightly above Sol. Dataset scale.",
    afterPeerUpgrade: "claude_max_5x",
  },
  claude_sonnet_5_api: {
    from: "claude_pro",
    delta: { agentCoding: -4, backend: -3, debugging: -3, codeReview: -3, research: -2, imageGeneration: 0 },
    notes: "Sonnet 5 workhorse under Opus/Fable. Dataset scale.",
    afterPeerUpgrade: "claude_pro",
  },
  kimi_k3_api_global: {
    from: "kimi_allegretto_cn",
    delta: { research: 4, multimodal: 2, chineseWriting: 1 },
    notes: "K3 API coding S on unified rank, absolute ≈ Allegretto band (HEAD scale).",
    afterPeerUpgrade: "kimi_allegretto_cn",
  },
  kimi_k3_api_cn: {
    from: "kimi_allegretto_cn",
    delta: { research: 4, multimodal: 2, chineseWriting: 2 },
    notes: "Same K3 model as GLOBAL; CN price estimated.",
    afterPeerUpgrade: "kimi_allegretto_cn",
  },
};

// Build upgraded HEAD bases first
const upgraded = new Map();
for (const [planId, rec] of headMap) {
  const up = HEAD_UPGRADES[planId];
  if (up) {
    upgraded.set(
      planId,
      makeRec(planId, applyDelta(rec.scores, up.delta), up.notes, rec.scoreConfidence || "medium")
    );
  } else {
    // keep original HEAD scores, stamp basis
    upgraded.set(
      planId,
      makeRec(
        planId,
        rec.scores,
        (rec.notes ? rec.notes + " " : "") + "Preserved from dataset HEAD scale (v0.4.1 align).",
        rec.scoreConfidence || "medium"
      )
    );
  }
}

// New plans
for (const [planId, cfg] of Object.entries(NEW_PLANS)) {
  let base;
  if (cfg.afterPeerUpgrade && upgraded.has(cfg.afterPeerUpgrade)) {
    base = upgraded.get(cfg.afterPeerUpgrade).scores;
  } else if (upgraded.has(cfg.from)) {
    base = upgraded.get(cfg.from).scores;
  } else {
    base = peer(cfg.from);
  }
  // special: supergrok builds from upgraded plus then delta
  const scores = applyDelta(base, cfg.delta);
  // force anthropic-like image 0 for claude apis
  if (planId.startsWith("claude_")) scores.imageGeneration = 0;
  upgraded.set(planId, makeRec(planId, scores, cfg.notes, "medium"));
}

// Ensure every enabled plan/api has a score row
const allIds = [
  ...plans.plans.map((p) => p.id),
  ...api.apiOptions.map((p) => p.id),
];
const enabled = new Set([
  ...plans.plans.filter((p) => p.enabledForRecommendation).map((p) => p.id),
  ...api.apiOptions.filter((p) => p.enabledForRecommendation).map((p) => p.id),
]);

// Keep any current-only rows that aren't handled (shouldn't happen)
for (const id of allIds) {
  if (!upgraded.has(id) && headMap.has(id)) {
    upgraded.set(id, makeRec(id, headMap.get(id).scores, "Preserved HEAD.", "medium"));
  }
}

// Merge into scores file: prefer aligned for all we have; keep unknown current as fallback only if needed
const outList = [];
const seen = new Set();
for (const id of allIds) {
  if (seen.has(id)) continue;
  if (upgraded.has(id)) {
    outList.push(upgraded.get(id));
    seen.add(id);
  } else {
    const cur = current.planCapabilityScores.find((x) => x.planId === id);
    if (cur) {
      outList.push({
        ...cur,
        scoreBasis: "head_scale_aligned_v0.4.1_fallback",
        notes: (cur.notes || "") + " Fallback; not in HEAD.",
      });
      seen.add(id);
    }
  }
}
// also include head-only disabled that were in head scores
for (const [id, rec] of upgraded) {
  if (!seen.has(id)) {
    outList.push(rec);
    seen.add(id);
  }
}

const scoresOut = {
  schemaVersion: "0.4.1",
  lastUpdatedAt: TODAY,
  capabilityKeys: head.capabilityKeys || CAPS,
  notes: [
    "Plan-level 0–100 capability scores.",
    "v0.4.1 ALIGNED TO ORIGINAL DATASET SCALE (git HEAD scores.json).",
    "Model upgrades (GPT-5.6 Sol, Claude Fable/Opus5, Kimi K3, Gemini 3.6 Flash, Grok, Perplexity) applied as modest deltas on HEAD bases — not a 95–100 remap.",
    "Unified benchmark matrix in model-benchmarks.json remains the relative evidence source; plan scores stay comparable to Cursor/GLM/DeepSeek rows.",
    "Sol Pro excluded. Gemini 3.6 Flash not Gemini 3 Flash. K3 coding treated as S-class relative to Sol/Fable, absolute numbers on dataset scale.",
  ],
  planCapabilityScores: outList,
};
write("scores.json", scoresOut);

// Tiers: derive coding tiers from aligned scores for plans we care about; preserve others from current/head
function setTier(planId, scores, notes) {
  return {
    planId,
    tierByCapability: {
      agentCoding: tierFrom(scores.agentCoding),
      backend: tierFrom(scores.backend),
      debugging: tierFrom(scores.debugging),
      codeReview: tierFrom(scores.codeReview),
      research: tierFrom(scores.research),
    },
    evidenceLevel: "medium",
    notes,
  };
}

const tierMap = new Map(tiers.tiers.map((t) => [t.planId, t]));
for (const rec of outList) {
  if (!enabled.has(rec.planId) && !upgraded.has(rec.planId)) continue;
  const t = setTier(rec.planId, rec.scores, "Aligned to HEAD score scale v0.4.1");
  tierMap.set(rec.planId, { ...tierMap.get(rec.planId), ...t });
}
tiers.schemaVersion = "0.4.1";
tiers.lastUpdatedAt = TODAY;
tiers.notes = [
  "S/A/B/C/D from aligned plan scores (S≥90, A≥80, B≥65, C≥45).",
  "v0.4.1: resynced to original dataset score scale after unified-matrix remap was too compressed at 95–100.",
];
tiers.tiers = [...tierMap.values()];
write("model-tiers.json", tiers);

// Update benchmarks methodology note
benchmarks.schemaVersion = "0.4.1";
benchmarks.lastUpdatedAt = TODAY;
benchmarks.planScorePolicy = {
  version: "0.4.1",
  rule: "model-benchmarks.json is for relative model ranking only. planCapabilityScores are calibrated to the original SubPlan dataset scale (HEAD), using HEAD scores + modest upgrade deltas. Do not write raw norm(SWE)/norm(AA) * 100 into plan scores.",
  reason: "Cursor/GLM/DeepSeek/etc. remain on the original curation scale; remapping frontier plans to 95–100 broke cross-plan comparability.",
};
if (benchmarks.methodology) {
  benchmarks.methodology.planScore =
    "quotaShare-weighted evidence informs DELTAS on HEAD plan scores; absolute plan scores stay on dataset scale (v0.4.1).";
}
write("model-benchmarks.json", benchmarks);

// Audit print
const show = [
  "chatgpt_plus",
  "chatgpt_pro_5x",
  "claude_pro",
  "claude_max_5x",
  "kimi_moderato_cn",
  "kimi_allegretto_cn",
  "google_ai_plus_us",
  "google_ai_pro_us",
  "cursor_pro",
  "glm_coding_pro_cn",
  "supergrok",
  "perplexity_pro",
  "kimi_k3_api_global",
  "claude_fable_5_api",
];
console.log("\nplan".padEnd(26), "ac", "fe", "be", "re", "zh", "img", "ch");
for (const id of show) {
  const r = outList.find((x) => x.planId === id);
  if (!r) {
    console.log(id, "MISSING");
    continue;
  }
  const s = r.scores;
  console.log(
    id.padEnd(26),
    s.agentCoding,
    s.frontend,
    s.backend,
    s.research,
    s.chineseWriting,
    s.imageGeneration,
    s.chat
  );
}
const acs = outList.map((x) => x.scores.agentCoding);
console.log(
  "\nagentCoding range",
  Math.min(...acs),
  "-",
  Math.max(...acs),
  "median",
  acs.sort((a, b) => a - b)[Math.floor(acs.length / 2)]
);

// enabled missing
const miss = [...enabled].filter((id) => !outList.some((x) => x.planId === id));
console.log("enabled missing scores", miss);
