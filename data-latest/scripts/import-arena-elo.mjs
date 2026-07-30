/**
 * Import scraped Arena WebDev Elo into model-benchmarks + plan frontend scores.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.resolve(__dirname, "../../data");
const TODAY = "2026-07-30";

// Scraped from https://arena.ai/leaderboard/code/webdev (Overall, Jul 28 2026)
// and fullstack tab (Jul 24 2026)
const webdevOverall = [
  { rank: 1, modelId: "claude-opus-5-max", arenaId: "claude-opus-5-max", score: 1712, ci: "+20/-20", votes: 1278, preliminary: true },
  { rank: 2, modelId: "kimi-k3", arenaId: "kimi-k3-max", score: 1682, ci: "+13/-13", votes: 3777, preliminary: true },
  { rank: 3, modelId: "claude-opus-5", arenaId: "claude-opus-5-high", score: 1669, ci: "+13/-13", votes: 2855 },
  { rank: 4, modelId: "claude-fable-5", arenaId: "claude-fable-5", score: 1628, ci: "+10/-10", votes: 5887 },
  { rank: 5, modelId: "gpt-5.6-sol", arenaId: "gpt-5.6-sol-xhigh (codex-harness)", score: 1623, ci: "+10/-10", votes: 5460 },
  { rank: 6, modelId: "glm-5.2", arenaId: "glm-5.2-max", score: 1588, ci: "+9/-9", votes: 5865 },
  { rank: 7, modelId: "claude-opus-4.8", arenaId: "claude-opus-4-8-thinking", score: 1568, ci: "+8/-8", votes: 8412 },
  { rank: 10, modelId: "grok-4.5", arenaId: "grok-4.5", score: 1550, ci: "+11/-11", votes: 3502 },
  { rank: 12, modelId: "claude-sonnet-5", arenaId: "claude-sonnet-5-high", score: 1544, ci: "+10/-10", votes: 4228 },
  { rank: 16, modelId: "gemini-3.6-flash", arenaId: "gemini-3.6-flash", score: 1528, ci: "+13/-13", votes: 2768, preliminary: true },
  { rank: 22, modelId: "kimi-k2.6", arenaId: "kimi-k2.6", score: 1510, ci: "+8/-8", votes: 9255 },
  { rank: 31, modelId: "kimi-k2.7-code", arenaId: "kimi-k2.7-code", score: 1473, ci: "+10/-10", votes: 4535 },
  { rank: 39, modelId: "gemini-3.1-pro", arenaId: "gemini-3.1-pro-preview", score: 1446, ci: "+6/-6", votes: 18070 },
];

const fullstack = [
  { rank: 1, modelId: "kimi-k3", arenaId: "kimi-k3-max", score: 1664, ci: "+26/-26", votes: 667, preliminary: true },
  { rank: 2, modelId: "gpt-5.6-sol", arenaId: "gpt-5.6-sol-xhigh (codex-harness)", score: 1633, ci: "+20/-20", votes: 955 },
  { rank: 3, modelId: "claude-fable-5", arenaId: "claude-fable-5", score: 1623, ci: "+26/-26", votes: 543 },
  { rank: 4, modelId: "glm-5.2", arenaId: "glm-5.2-max", score: 1599, ci: "+22/-22", votes: 817 },
  { rank: 5, modelId: "claude-opus-4.8", arenaId: "claude-opus-4-8-thinking", score: 1597, ci: "+17/-17", votes: 1922 },
  { rank: 14, modelId: "grok-4.5", arenaId: "grok-4.5", score: 1564, ci: "+24/-24", votes: 619 },
  { rank: 16, modelId: "kimi-k2.6", arenaId: "kimi-k2.6", score: 1557, ci: "+19/-19", votes: 1363 },
  { rank: 17, modelId: "claude-sonnet-5", arenaId: "claude-sonnet-5-high", score: 1552, ci: "+28/-28", votes: 430 },
  { rank: 34, modelId: "gemini-3.1-pro", arenaId: "gemini-3.1-pro-preview", score: 1448, ci: "+18/-18", votes: 1763 },
];

const arenaFile = {
  schemaVersion: "0.4.6",
  lastUpdatedAt: TODAY,
  scrapedAt: TODAY,
  source: "https://arena.ai/leaderboard",
  boards: {
    webdevOverall: {
      url: "https://arena.ai/leaderboard/code/webdev",
      title: "Code Arena | WebDev Overall",
      asOf: "2026-07-28",
      votes: 492170,
      models: 104,
      scoreType: "Arena Elo (bootstrap CI)",
      rows: webdevOverall,
    },
    webdevFullstack: {
      url: "https://arena.ai/leaderboard/code/webdev/fullstack",
      title: "Code Arena | WebDev Fullstack",
      asOf: "2026-07-24",
      votes: 22969,
      models: 39,
      scoreType: "Arena Elo (bootstrap CI)",
      rows: fullstack,
    },
  },
  notes: [
    "Scraped live HTML tables from arena.ai (not third-hand rank lists).",
    "PRIMARY frontend evidence: WebDev Overall + Fullstack Elo.",
  ],
};
fs.writeFileSync(path.join(DATA, "arena-webdev-scores.json"), JSON.stringify(arenaFile, null, 2) + "\n");

function eloToFrontend(elo) {
  if (elo == null) return null;
  const lo = 1440;
  const hi = 1712;
  const t = Math.max(0, Math.min(1, (elo - lo) / (hi - lo)));
  return Math.round(78 + t * 20);
}

function pickElo(modelId) {
  const o = webdevOverall.find((r) => r.modelId === modelId);
  const f = fullstack.find((r) => r.modelId === modelId);
  if (o && f) return Math.round((o.score + f.score) / 2);
  if (o) return o.score;
  if (f) return f.score;
  return null;
}

const modelElo = {
  "kimi-k3": pickElo("kimi-k3"),
  "gpt-5.6-sol": pickElo("gpt-5.6-sol"),
  "claude-fable-5": pickElo("claude-fable-5"),
  "claude-opus-5": webdevOverall.find((r) => r.modelId === "claude-opus-5")?.score ?? 1669,
  "claude-opus-5-max": 1712,
  "claude-opus-4.8": pickElo("claude-opus-4.8"),
  "claude-sonnet-5": pickElo("claude-sonnet-5"),
  "grok-4.5": pickElo("grok-4.5"),
  "gemini-3.6-flash": webdevOverall.find((r) => r.modelId === "gemini-3.6-flash")?.score,
  "gemini-3.1-pro": pickElo("gemini-3.1-pro"),
  "kimi-k2.7-code": webdevOverall.find((r) => r.modelId === "kimi-k2.7-code")?.score,
  "kimi-k2.6": pickElo("kimi-k2.6"),
  "glm-5.2": pickElo("glm-5.2"),
};

const bm = JSON.parse(fs.readFileSync(path.join(DATA, "model-benchmarks.json"), "utf8"));
bm.schemaVersion = "0.4.6";
bm.lastUpdatedAt = TODAY;
bm.arenaFrontendLeaderboard = {
  asOf: "2026-07-28",
  sourceUrl: "https://arena.ai/leaderboard/code/webdev",
  scrapedFile: "data/arena-webdev-scores.json",
  scoreType: "Arena Elo",
  primaryBoard: "webdevOverall",
  secondaryBoard: "webdevFullstack",
  policy: "frontend uses real Arena Elo from scraped tables.",
  keyScores: modelElo,
  topWebdevOverall: webdevOverall.slice(0, 12),
  topFullstack: fullstack.slice(0, 5),
};
if (bm.methodology?.metrics?.arenaFrontendCode) {
  bm.methodology.metrics.arenaFrontendCode.scraped = true;
  bm.methodology.metrics.arenaFrontendCode.note =
    "PRIMARY frontend = scraped Arena Elo (WebDev Overall + Fullstack). data/arena-webdev-scores.json";
}
if (Array.isArray(bm.models)) {
  for (const m of bm.models) {
    const elo = modelElo[m.modelId];
    m.metrics = m.metrics || {};
    if (elo != null) {
      const o = webdevOverall.find((r) => r.modelId === m.modelId);
      const f = fullstack.find((r) => r.modelId === m.modelId);
      m.metrics.arenaFrontendCode = {
        elo,
        frontendScore0to100: eloToFrontend(elo),
        webdevOverall: o?.score ?? null,
        fullstack: f?.score ?? null,
        primaryFor: "frontend",
        source: "https://arena.ai/leaderboard/code/webdev",
      };
    }
  }
}
fs.writeFileSync(path.join(DATA, "model-benchmarks.json"), JSON.stringify(bm, null, 2) + "\n");

const scores = JSON.parse(fs.readFileSync(path.join(DATA, "scores.json"), "utf8"));
const planModel = {
  kimi_moderato_cn: "kimi-k3",
  kimi_allegretto_cn: "kimi-k3",
  kimi_allegro_cn: "kimi-k3",
  kimi_andante_cn: "kimi-k3",
  kimi_moderato_global: "kimi-k3",
  kimi_allegretto_global: "kimi-k3",
  kimi_allegro_global: "kimi-k3",
  kimi_vivace_global: "kimi-k3",
  kimi_k3_api_global: "kimi-k3",
  kimi_k3_api_cn: "kimi-k3",
  chatgpt_plus: "gpt-5.6-sol",
  chatgpt_pro_5x: "gpt-5.6-sol",
  chatgpt_pro_20x: "gpt-5.6-sol",
  openai_gpt56_sol_api: "gpt-5.6-sol",
  claude_fable_5_api: "claude-fable-5",
  claude_max_5x: "claude-opus-5-max",
  claude_max_20x: "claude-opus-5-max",
  claude_pro: "claude-opus-5",
  claude_opus_5_api: "claude-opus-5",
  claude_opus_48_api: "claude-opus-4.8",
  claude_sonnet_5_api: "claude-sonnet-5",
  supergrok: "grok-4.5",
  supergrok_heavy: "grok-4.5",
  supergrok_lite: "grok-4.5",
  google_ai_plus_us: "gemini-3.6-flash",
  google_ai_pro_us: "gemini-3.1-pro",
  google_ai_pro_jp: "gemini-3.1-pro",
  glm_coding_pro_cn: "glm-5.2",
  glm_coding_max_cn: "glm-5.2",
};

for (const [planId, mid] of Object.entries(planModel)) {
  const elo = modelElo[mid];
  if (elo == null) continue;
  const fe = eloToFrontend(elo);
  const r = scores.planCapabilityScores.find((x) => x.planId === planId);
  if (!r) continue;
  const prev = r.scores.frontend;
  r.scores.frontend = fe;
  r.notes =
    "Arena WebDev Elo " +
    elo +
    " (" +
    mid +
    ") → frontend " +
    fe +
    " [scraped arena.ai " +
    TODAY +
    "]. was " +
    prev +
    ".";
}

scores.schemaVersion = "0.4.6";
scores.lastUpdatedAt = TODAY;
scores.notes = [
  "v0.4.6: frontend from LIVE Arena Elo scrape (arena.ai WebDev Overall Jul28 + Fullstack Jul24).",
  "Raw table: data/arena-webdev-scores.json. Map Elo 1440→78 … 1712→98.",
  "Grok Build metrics kept for SuperGrok coding path.",
];
fs.writeFileSync(path.join(DATA, "scores.json"), JSON.stringify(scores, null, 2) + "\n");

console.log("modelElo", modelElo);
console.log("frontend map", Object.fromEntries(Object.entries(modelElo).map(([k, v]) => [k, eloToFrontend(v)])));
for (const id of [
  "kimi_allegretto_cn",
  "chatgpt_plus",
  "claude_max_5x",
  "claude_pro",
  "claude_fable_5_api",
  "supergrok",
  "google_ai_plus_us",
]) {
  const s = scores.planCapabilityScores.find((x) => x.planId === id);
  console.log(id, "frontend=", s?.scores.frontend, "|", s?.notes?.slice(0, 90));
}
