import { recommend } from "../../lib/recommend.ts";
import type { UserInput } from "../../lib/types.ts";

const input: UserInput = {
  budgetCny: 300,
  budgetTolerance: 0.15,
  monthlyDemandMTokens: 1500,
  primaryUseCase: "frontend_main_backend_light", // guess; will print weights
  region: "CN",
  acceptsApiBilling: true,
  hasForeignCard: true,
  highIntelligenceRatioPreset: "high",
};

const results = recommend(input);
console.log("total results:", results.length);
for (const r of results.slice(0, 15)) {
  console.log(
    r.finalScore.toFixed(1),
    "|",
    r.combo.plans.map((p) => p.id).join(" + "),
    "| ¥" + Math.round(r.combo.totalPriceCny),
    "| cov " + r.combo.usageCoverage.toFixed(2),
    "| highCov " + (r.combo.highIntelligenceCoverage ?? 1).toFixed(2),
    "| " + r.budgetStatus
  );
}
const hit = results.find((r) => {
  const ids = r.combo.plans.map((p) => p.id).sort();
  return ids.includes("chatgpt_plus") && ids.includes("kimi_allegretto_cn");
});
console.log("chatgpt+kimi present:", hit ? JSON.stringify({ score: hit.finalScore, price: hit.combo.totalPriceCny, budget: hit.budgetStatus }) : "NO");
