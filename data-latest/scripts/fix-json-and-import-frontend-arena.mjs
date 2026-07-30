import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.resolve(__dirname, "../../data");
const TODAY = "2026-07-30";

function tryLoad(p) {
  try {
    let s = fs.readFileSync(p, "utf8");
    s = s.replace(/\\n\s*$/, "");
    return JSON.parse(s);
  } catch (e) {
    console.error("load fail", p, e.message);
    return null;
  }
}

// Rebuild arena file cleanly
const frontendCodeArena = [
  { rank: 1, modelId: "kimi-k3", label: "Kimi-K3", score: 1679 },
  { rank: 2, modelId: "claude-fable-5", label: "Claude Fable 5", score: 1631 },
  { rank: 3, modelId: "gpt-5.6-sol", label: "GPT-5.6 Sol (xHigh)", score: 1618 },
  { rank: 4, modelId: "glm-5.2", label: "GLM-5.2 (Max)", score: 1587 },
  { rank: 5, modelId: "claude-opus-4.8", label: "Claude Opus 4.8 (Thinking)", score: 1562 },
  { rank: 6, modelId: "grok-4.5", label: "Grok-4.5", score: 1558 },
  { rank: 7, modelId: "claude-opus-4.7-thinking", label: "Claude Opus 4.7 (Thinking)", score: 1558 },
  { rank: 8, modelId: "claude-opus-4.7", label: "Claude Opus 4.7", score: 1555 },
  { rank: 9, modelId: "claude-opus-4.6-thinking", label: "Claude Opus 4.6 (Thinking)", score: 1542 },
  { rank: 10, modelId: "claude-sonnet-5", label: "Claude Sonnet 5 (High)", score: 1542 },
  { rank: 11, modelId: "muse-spark-1.1", label: "Muse Spark 1.1", score: 1538 },
  { rank: 12, modelId: "claude-opus-4.6", label: "Claude Opus 4.6", score: 1536 },
  { rank: 13, modelId: "claude-opus-4.8-base", label: "Claude Opus 4.8", score: 1534 },
  { rank: 14, modelId: "seed-2.1-pro", label: "Seed-2.1 Pro", score: 1534 },
  { rank: 15, modelId: "glm-5.1", label: "GLM-5.1", score: 1526 },
  { rank: 16, modelId: "claude-sonnet-4.6", label: "Claude Sonnet 4.6", score: 1522 },
  { rank: 17, modelId: "qwen-3.7-max", label: "Qwen-3.7 Max", score: 1516 },
  { rank: 18, modelId: "kimi-k2.6", label: "Kimi-K2.6", score: 1515 },
  { rank: 19, modelId: "gpt-5.5", label: "GPT-5.5 (xHigh)", score: 1504 },
  { rank: 20, modelId: "minimax-m3", label: "MiniMax-M3", score: 1493 },
];

const arena = {
  schemaVersion: "0.4.7",
  lastUpdatedAt: TODAY,
  source: "https://arena.ai/leaderboard/code",
  boards: {
    frontendCodeArena: {
      title: "Frontend Code Arena",
      asOf: "from user screenshot HNXpi8UaIAAM6Ag.jpg",
      imagePath: "E:\\图片\\HNXpi8UaIAAM6Ag.jpg",
      scoreType: "Arena Score",
      headline: "Kimi-K3 Ranked #1",
      primaryFor: "frontend",
      rows: frontendCodeArena,
      notes:
        "PRIMARY board for SubPlan frontend. Transcribed from official Arena chart screenshot provided by user.",
    },
  },
  notes: [
    "Frontend PRIMARY = Frontend Code Arena scores in this file.",
    "WebDev Overall is a different board — do not use for frontend.",
  ],
};
fs.writeFileSync(path.join(DATA, "arena-webdev-scores.json"), JSON.stringify(arena, null, 2) + "\n");

function eloToFrontend(elo) {
  const lo = 1490;
  const hi = 1679;
  const t = Math.max(0, Math.min(1, (elo - lo) / (hi - lo)));
  return Math.round(80 + t * 18);
}

const modelElo = Object.fromEntries(frontendCodeArena.map((r) => [r.modelId, r.score]));

// scores.json — try load previous, else rebuild notes only on frontend
let scores = tryLoad(path.join(DATA, "scores.json"));
if (!scores) {
  console.error("scores.json unrecoverable — abort frontend remap");
  process.exit(1);
}

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
  r.notes =
    "Frontend Code Arena " +
    elo +
    " (" +
    mid +
    ") → frontend " +
    fe +
    " [HNXpi8UaIAAM6Ag.jpg]. was " +
    prev +
    ".";
}
const viv = scores.planCapabilityScores.find((x) => x.planId === "kimi_vivace_global");
if (viv) viv.scores.frontend = Math.min(100, eloToFrontend(1679) + 1);

scores.schemaVersion = "0.4.7";
scores.lastUpdatedAt = TODAY;
scores.notes = [
  "v0.4.7: frontend PRIMARY = Frontend Code Arena real scores from user chart HNXpi8UaIAAM6Ag.jpg.",
  "K3 1679, Fable 1631, Sol 1618, GLM-5.2 1587, Opus4.8T 1562, Grok-4.5 1558.",
  "Not WebDev Overall (different board).",
  "Raw: data/arena-webdev-scores.json → boards.frontendCodeArena",
];
fs.writeFileSync(path.join(DATA, "scores.json"), JSON.stringify(scores, null, 2) + "\n");

// benchmarks — load or minimal patch
let bm = tryLoad(path.join(DATA, "model-benchmarks.json"));
if (bm) {
  bm.schemaVersion = "0.4.7";
  bm.lastUpdatedAt = TODAY;
  bm.arenaFrontendLeaderboard = {
    asOf: TODAY,
    board: "Frontend Code Arena",
    sourceImage: "E:\\图片\\HNXpi8UaIAAM6Ag.jpg",
    scrapedFile: "data/arena-webdev-scores.json",
    scoreType: "Arena Score",
    policy: "PRIMARY frontend = Frontend Code Arena only.",
    top20: frontendCodeArena,
    keyScores: {
      "kimi-k3": 1679,
      "claude-fable-5": 1631,
      "gpt-5.6-sol": 1618,
      "glm-5.2": 1587,
      "claude-opus-4.8": 1562,
      "grok-4.5": 1558,
      "claude-sonnet-5": 1542,
      "kimi-k2.6": 1515,
    },
  };
  fs.writeFileSync(path.join(DATA, "model-benchmarks.json"), JSON.stringify(bm, null, 2) + "\n");
}

// validate
JSON.parse(fs.readFileSync(path.join(DATA, "scores.json"), "utf8"));
JSON.parse(fs.readFileSync(path.join(DATA, "arena-webdev-scores.json"), "utf8"));
console.log("JSON valid");
for (const id of [
  "kimi_allegretto_cn",
  "chatgpt_plus",
  "claude_fable_5_api",
  "claude_max_5x",
  "claude_pro",
  "supergrok",
  "glm_coding_pro_cn",
]) {
  const s = scores.planCapabilityScores.find((x) => x.planId === id);
  console.log(id, "frontend=", s?.scores.frontend);
}
