import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.resolve(__dirname, "../../data");
const TODAY = "2026-07-30";

// Absolute Elo: HNXpi8UaIAAM6Ag.jpg | Field win rates: HNYpK-LbEAAg2yw.jpg
const frontend = [
  { rank: 1, modelId: "kimi-k3", label: "Kimi-K3", score: 1679, winRate: 0.76 },
  { rank: 2, modelId: "claude-fable-5", label: "Claude Fable 5", score: 1631, winRate: 0.63 },
  { rank: 3, modelId: "gpt-5.6-sol", label: "GPT-5.6 Sol (xHigh)", score: 1618, winRate: 0.58 },
  { rank: 4, modelId: "glm-5.2", label: "GLM-5.2 (Max)", score: 1587, winRate: 0.55 },
  { rank: 5, modelId: "claude-opus-4.8", label: "Claude Opus 4.8 (Thinking)", score: 1562, winRate: 0.53 },
  { rank: 6, modelId: "grok-4.5", label: "Grok-4.5", score: 1558, winRate: 0.53 },
  { rank: 7, modelId: "claude-opus-4.7-thinking", label: "Claude Opus 4.7 (Thinking)", score: 1558, winRate: 0.49 },
  { rank: 8, modelId: "claude-opus-4.7", label: "Claude Opus 4.7", score: 1555, winRate: 0.49 },
  { rank: 9, modelId: "claude-opus-4.6-thinking", label: "Claude Opus 4.6 (Thinking)", score: 1542, winRate: 0.48 },
  { rank: 10, modelId: "claude-sonnet-5", label: "Claude Sonnet 5 (High)", score: 1542, winRate: 0.48 },
  { rank: 11, modelId: "muse-spark-1.1", label: "Muse Spark 1.1", score: 1538, winRate: 0.5 },
  { rank: 12, modelId: "claude-opus-4.6", label: "Claude Opus 4.6", score: 1536, winRate: 0.48 },
  { rank: 13, modelId: "claude-opus-4.8-base", label: "Claude Opus 4.8", score: 1534, winRate: 0.47 },
  { rank: 14, modelId: "seed-2.1-pro", label: "Seed-2.1 Pro", score: 1534, winRate: 0.48 },
  { rank: 15, modelId: "glm-5.1", label: "GLM-5.1", score: 1526, winRate: 0.46 },
  { rank: 16, modelId: "claude-sonnet-4.6", label: "Claude Sonnet 4.6", score: 1522, winRate: 0.44 },
  { rank: 17, modelId: "qwen-3.7-max", label: "Qwen-3.7 Max", score: 1516, winRate: 0.42 },
  { rank: 18, modelId: "kimi-k2.6", label: "Kimi-K2.6", score: 1515, winRate: 0.42 },
  { rank: 19, modelId: "gpt-5.5", label: "GPT-5.5 (xHigh)", score: 1504, winRate: 0.42 },
  { rank: 20, modelId: "minimax-m3", label: "MiniMax-M3", score: 1493, winRate: 0.4 },
];

function h2h(ra, rb) {
  return 1 / (1 + Math.pow(10, (rb - ra) / 400));
}

/** ~1 plan-frontend point per 20 Elo; Fable=1631 → 94 so K3-Fable stays ~2 pts */
function eloToFrontend(elo) {
  const centerElo = 1631;
  const centerScore = 94;
  return Math.round(Math.max(78, Math.min(98, centerScore + (elo - centerElo) / 20)));
}

const modelElo = Object.fromEntries(frontend.map((r) => [r.modelId, r.score]));
const modelWr = Object.fromEntries(frontend.map((r) => [r.modelId, r.winRate]));

const k3 = 1679;
const fable = 1631;
const sol = 1618;
console.log("K3-Fable Elo gap:", k3 - fable, "H2H K3 win:", (h2h(k3, fable) * 100).toFixed(1) + "%");
console.log("K3-Sol Elo gap:", k3 - sol, "H2H K3 win:", (h2h(k3, sol) * 100).toFixed(1) + "%");
console.log("Fable-Sol Elo gap:", fable - sol, "H2H Fable win:", (h2h(fable, sol) * 100).toFixed(1) + "%");
console.log("Field WR K3 76% vs Fable 63% is vs pool, not pairwise");

const arena = {
  schemaVersion: "0.4.8",
  lastUpdatedAt: TODAY,
  source: "https://arena.ai/leaderboard/code",
  boards: {
    frontendCodeArena: {
      title: "Frontend Code Arena",
      primaryFor: "frontend",
      scoreType: "Arena Score + field win rate",
      sourceImages: {
        absolute: "E:\\图片\\HNXpi8UaIAAM6Ag.jpg",
        relativeWinRate: "E:\\图片\\HNYpK-LbEAAg2yw.jpg",
      },
      rows: frontend,
      notes: [
        "Absolute scores from HNXpi8UaIAAM6Ag.jpg; field win rates from HNYpK-LbEAAg2yw.jpg.",
        "Win rate is overall vs field (50% = average), not head-to-head vs K3.",
        "K3 1679 vs Fable 1631 = only 48 Elo ≈ 57% expected H2H — close, not a large gap.",
      ],
    },
  },
  interpretation: {
    k3VsFable: {
      eloGap: 48,
      expectedH2HWinRateK3: Number(h2h(k3, fable).toFixed(3)),
      fieldWinRate: { k3: 0.76, fable: 0.63 },
      conclusion: "Slight edge to K3; field win rates overstate pairwise distance.",
    },
  },
};
fs.writeFileSync(path.join(DATA, "arena-webdev-scores.json"), JSON.stringify(arena, null, 2) + "\n");

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
  claude_max_5x: "claude-fable-5",
  claude_max_20x: "claude-fable-5",
  claude_pro: "claude-opus-4.8",
  claude_opus_48_api: "claude-opus-4.8",
  claude_sonnet_5_api: "claude-sonnet-5",
  supergrok: "grok-4.5",
  supergrok_heavy: "grok-4.5",
  supergrok_lite: "grok-4.5",
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
  const wr = modelWr[mid];
  r.notes =
    "Frontend Code Arena Elo " +
    elo +
    (wr != null ? " / field-WR " + Math.round(wr * 100) + "%" : "") +
    " (" +
    mid +
    ") → frontend " +
    fe +
    ". K3–Fable only +48 Elo (~57% H2H). was " +
    prev +
    ".";
}
const viv = scores.planCapabilityScores.find((x) => x.planId === "kimi_vivace_global");
if (viv) viv.scores.frontend = Math.min(98, eloToFrontend(1679) + 1);

scores.schemaVersion = "0.4.8";
scores.lastUpdatedAt = TODAY;
scores.notes = [
  "v0.4.8: frontend = Frontend Code Arena absolute Elo + relative field win rates (user charts).",
  "K3 1679/76% vs Fable 1631/63%: Elo gap 48 only (~57% H2H); plan scores 96 vs 94 — close.",
  "Field win rate is vs whole pool, not pairwise.",
  "Raw: data/arena-webdev-scores.json",
];
fs.writeFileSync(path.join(DATA, "scores.json"), JSON.stringify(scores, null, 2) + "\n");

const bm = JSON.parse(fs.readFileSync(path.join(DATA, "model-benchmarks.json"), "utf8"));
bm.schemaVersion = "0.4.8";
bm.lastUpdatedAt = TODAY;
bm.arenaFrontendLeaderboard = {
  board: "Frontend Code Arena",
  sourceImages: ["E:\\图片\\HNXpi8UaIAAM6Ag.jpg", "E:\\图片\\HNYpK-LbEAAg2yw.jpg"],
  keyScores: {
    "kimi-k3": { elo: 1679, fieldWinRate: 0.76, planFrontend: eloToFrontend(1679) },
    "claude-fable-5": { elo: 1631, fieldWinRate: 0.63, planFrontend: eloToFrontend(1631) },
    "gpt-5.6-sol": { elo: 1618, fieldWinRate: 0.58, planFrontend: eloToFrontend(1618) },
    "glm-5.2": { elo: 1587, fieldWinRate: 0.55, planFrontend: eloToFrontend(1587) },
    "claude-opus-4.8": { elo: 1562, fieldWinRate: 0.53, planFrontend: eloToFrontend(1562) },
    "grok-4.5": { elo: 1558, fieldWinRate: 0.53, planFrontend: eloToFrontend(1558) },
  },
  pairwise: {
    k3VsFable: { eloGap: 48, expectedH2H: Number(h2h(k3, fable).toFixed(3)) },
    k3VsSol: { eloGap: 61, expectedH2H: Number(h2h(k3, sol).toFixed(3)) },
    fableVsSol: { eloGap: 13, expectedH2H: Number(h2h(fable, sol).toFixed(3)) },
  },
  policy: "PRIMARY frontend board. Compress Elo→score so small Elo gaps stay small.",
};
fs.writeFileSync(path.join(DATA, "model-benchmarks.json"), JSON.stringify(bm, null, 2) + "\n");

console.log("Plan frontend (tight mapping):");
for (const id of [
  "kimi_allegretto_cn",
  "claude_fable_5_api",
  "claude_max_5x",
  "chatgpt_plus",
  "claude_pro",
  "supergrok",
  "glm_coding_pro_cn",
]) {
  const s = scores.planCapabilityScores.find((x) => x.planId === id);
  console.log(id, s.scores.frontend);
}
