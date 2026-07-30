import { recommend } from "../../lib/recommend.ts";
import type { UserInput } from "../../lib/types.ts";

const cases: Array<{ label: string; input: UserInput }> = [
  {
    label: "CN agent_coding",
    input: {
      budgetCny: 200,
      monthlyDemandMTokens: 100,
      primaryUseCase: "agent_coding",
      region: "CN",
      acceptsApiBilling: true,
      hasForeignCard: true,
      highIntelligenceRatioPreset: "medium",
    },
  },
  {
    label: "GLOBAL research",
    input: {
      budgetCny: 300,
      monthlyDemandMTokens: 80,
      primaryUseCase: "ai_beginner_general",
      region: "GLOBAL",
      acceptsApiBilling: false,
      hasForeignCard: true,
      highIntelligenceRatioPreset: "high",
    },
  },
  {
    label: "JP coding",
    input: {
      budgetCny: 250,
      monthlyDemandMTokens: 80,
      primaryUseCase: "agent_coding",
      region: "JP",
      acceptsApiBilling: false,
      hasForeignCard: true,
    },
  },
  {
    label: "US research + new models",
    input: {
      budgetCny: 250,
      monthlyDemandMTokens: 60,
      primaryUseCase: "ai_beginner_general",
      region: "US",
      acceptsApiBilling: false,
      hasForeignCard: true,
    },
  },
  {
    label: "CN heavy budget with API",
    input: {
      budgetCny: 500,
      monthlyDemandMTokens: 300,
      primaryUseCase: "agent_coding",
      region: "CN",
      acceptsApiBilling: true,
      hasForeignCard: true,
      highIntelligenceRatioPreset: "extreme",
    },
  },
];

let failed = 0;
for (const c of cases) {
  try {
    const r = recommend(c.input);
    if (!r.length) {
      console.log(c.label, "EMPTY results");
      failed++;
      continue;
    }
    const top = r[0];
    const names = top.combo.plans.map((p) => p.id).join("+");
    console.log(
      c.label,
      `n=${r.length}`,
      names,
      `¥${Math.round(top.combo.totalPriceCny)}`,
      `score=${top.finalScore.toFixed(1)}`,
      `cap=${top.capabilityScore.toFixed(1)}`,
      `cov=${top.coverageStatus}`,
      `hi=${top.combo.highIntelligenceCoverage?.toFixed?.(2) ?? "n/a"}`
    );
    // sanity: scores finite
    for (const item of r.slice(0, 5)) {
      if (!Number.isFinite(item.finalScore) || !Number.isFinite(item.capabilityScore)) {
        console.log("  NONFINITE", item.combo.plans.map((p) => p.id).join("+"));
        failed++;
      }
    }
    // new providers appear somewhere in top15 for global/us
    if (c.label.includes("US") || c.label.includes("GLOBAL")) {
      const flat = r.flatMap((x) => x.combo.plans.map((p) => p.id));
      const hasNew = flat.some(
        (id) =>
          id.includes("supergrok") ||
          id.includes("perplexity") ||
          id.includes("kimi_") && id.includes("global")
      );
      console.log("  newPlansInResults=", hasNew, "sample=", [...new Set(flat)].slice(0, 12).join(","));
    }
  } catch (e) {
    failed++;
    console.error(c.label, "ERROR", e);
  }
}
console.log(failed === 0 ? "SMOKE_OK" : `SMOKE_FAILED ${failed}`);
process.exit(failed === 0 ? 0 : 1);
