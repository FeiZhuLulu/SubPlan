import Link from "next/link";
import { recommend } from "@/lib/recommend";
import { presets } from "@/lib/data";
import { formatPriceCny } from "@/lib/budget";
import { buildNeedWeights } from "@/lib/recommend";
import type {
  UserInput,
  CapabilityKey,
  ScoredCombo,
  HighIntelligenceRatioPreset,
} from "@/lib/types";

type SearchParams = {
  budget?: string;
  tolerance?: string;
  usage?: string;
  intelligence?: string;
  primary?: string;
  secondary?: string;
  region?: string;
  api?: string;
  card?: string;
  addons?: string;
  existing?: string;
};

function parseHighIntelligenceRatioPreset(
  value: string | undefined
): HighIntelligenceRatioPreset {
  if (value === "low" || value === "medium" || value === "high" || value === "extreme") {
    return value;
  }
  return "medium";
}

function parseRegion(value: string | undefined): UserInput["region"] {
  if (value === "CN" || value === "GLOBAL" || value === "US" || value === "JP") {
    return value;
  }
  return "CN";
}

function parseInput(params: SearchParams): UserInput {
  return {
    budgetCny: Number(params.budget) || 0,
    budgetTolerance: params.tolerance === "strict" ? 0 : params.tolerance === "flexible" ? 0.25 : 0.15,
    monthlyDemandMTokens: Number(params.usage) || 0,
    highIntelligenceRatioPreset: parseHighIntelligenceRatioPreset(params.intelligence),
    primaryUseCase: params.primary || "backend_main_frontend_light",
    secondaryUseCase: params.secondary || "none",
    region: parseRegion(params.region),
    acceptsApiBilling: params.api === "1",
    hasForeignCard: params.card === "1",
    addOns: params.addons ? params.addons.split(",") : [],
    existingPlanIds: params.existing ? params.existing.split(",") : [],
  };
}

function getCoverageLabel(status: ScoredCombo["coverageStatus"]) {
  switch (status) {
    case "sufficient":
      return "充足";
    case "tight":
      return "偏紧";
    case "insufficient":
      return "不足";
  }
}

function getBudgetLabel(status: ScoredCombo["budgetStatus"]) {
  switch (status) {
    case "within":
      return "预算内";
    case "slightlyOver":
      return "略超预算";
    case "over":
      return "超出预算";
  }
}

function existingPriceCny(result: ScoredCombo) {
  return result.combo.totalPriceCny - result.combo.newPriceCny;
}

function ComboCard({
  r,
  rank,
  badge,
}: {
  r: ScoredCombo;
  rank: number;
  badge?: string;
}) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-xl shadow-zinc-100 border border-zinc-150/70 hover:shadow-2xl hover:border-zinc-300/80 transition-all duration-300 relative overflow-hidden group">
      
      {/* Decorative top border */}
      <div className={`absolute top-0 inset-x-0 h-1.5 ${
        badge === "最推荐" ? "bg-gradient-to-r from-blue-600 to-indigo-600" :
        badge === "量大" ? "bg-gradient-to-r from-emerald-500 to-teal-500" :
        badge === "高性能" ? "bg-gradient-to-r from-purple-500 to-pink-500" :
        "bg-zinc-200"
      }`} />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center flex-wrap gap-2">
            {badge && (
              <span className={`rounded-full px-3 py-0.5 text-xs font-bold ${
                badge === "最推荐" ? "bg-blue-50 text-blue-700 border border-blue-100" :
                badge === "量大" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                badge === "高性能" ? "bg-purple-50 text-purple-700 border border-purple-100" :
                "bg-zinc-100 text-zinc-700"
              }`}>
                {badge}
              </span>
            )}
            <span className="rounded-full bg-zinc-100 border border-zinc-200 px-2.5 py-0.5 text-xs font-bold text-zinc-600">
              Rank #{rank}
            </span>
          </div>
          
          <h2 className="text-xl font-extrabold text-zinc-900 group-hover:text-blue-600 transition-colors flex items-center gap-2">
            {r.combo.plans.map((p) => p.name).join(" + ")}
          </h2>
          
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            {r.combo.plans.map((p) => p.provider).join(" · ")}
          </p>
          <div className="flex flex-wrap gap-2">
            {r.combo.plans.map((plan) => (
              <span
                key={plan.id}
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold normal-case tracking-normal ${
                  plan.isExisting
                    ? "bg-emerald-50 text-emerald-700"
                    : plan.isUpgrade
                      ? "bg-amber-50 text-amber-700"
                      : "bg-zinc-100 text-zinc-600"
                }`}
              >
                {plan.isExisting
                  ? "已拥有"
                  : plan.isUpgrade
                    ? `建议升级${plan.upgradeFromPlanName ? `自 ${plan.upgradeFromPlanName}` : ""}`
                    : "建议新增"}{" "}
                · {plan.provider} · {formatPriceCny(plan.isUpgrade ? plan.upgradeDeltaCny ?? plan.priceCny : plan.priceCny)}
              </span>
            ))}
          </div>
        </div>

        <div className="text-right">
          <p className="text-2xl font-black text-zinc-900 leading-tight">
            {formatPriceCny(r.combo.totalPriceCny)}
            <span className="text-xs font-semibold text-zinc-400"> /月</span>
          </p>
          {r.combo.newPriceCny !== r.combo.totalPriceCny && (
            <p className="mt-1 text-xs font-bold text-zinc-400">
              已有 {formatPriceCny(existingPriceCny(r))} · 新增 {formatPriceCny(r.combo.newPriceCny)}
            </p>
          )}
          <div className="flex items-center justify-end gap-1.5 mt-1">
            <span className={`h-2.5 w-2.5 rounded-full ${
              r.budgetStatus === "within" ? "bg-emerald-500" :
              r.budgetStatus === "slightlyOver" ? "bg-amber-500" : "bg-red-500"
            }`} />
            <span className="text-xs font-bold text-zinc-500">
              {getBudgetLabel(r.budgetStatus)}
            </span>
          </div>
        </div>
      </div>

      {/* Main score metrics grids */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 border-t border-b border-zinc-100 py-4 my-5">
        <div className="space-y-1">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide">能力匹配度</p>
          <div className="flex items-center gap-2">
            <span className="text-lg font-black text-zinc-800">{r.capabilityScore.toFixed(1)}</span>
            <div className="w-16 bg-zinc-100 rounded-full h-1.5 overflow-hidden hidden sm:block">
              <div
                className="bg-blue-600 h-full rounded-full"
                style={{ width: `${r.capabilityScore}%` }}
              />
            </div>
          </div>
        </div>

        <div className="space-y-1 border-l border-zinc-100 pl-4">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide">算法综合得分</p>
          <p className="text-lg font-black text-zinc-800 bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">
            {r.finalScore.toFixed(1)}
          </p>
        </div>

        <div className="space-y-1 border-l border-zinc-100 pl-4">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide">总额度覆盖率</p>
          <div className="flex items-center gap-2">
            <span className="text-lg font-black text-zinc-800">
              {(r.combo.usageCoverage * 100).toFixed(0)}%
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
              r.coverageStatus === "sufficient" ? "bg-emerald-50 text-emerald-700" :
              r.coverageStatus === "tight" ? "bg-amber-50 text-amber-700" :
              "bg-red-50 text-red-700"
            }`}>
              {getCoverageLabel(r.coverageStatus)}
            </span>
          </div>
        </div>

        <div className="space-y-1 border-l border-zinc-100 pl-4">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide">高智能覆盖率</p>
          <div className="flex items-center gap-2">
            <span className="text-lg font-black text-zinc-800">
              {r.combo.highIntelligenceCoverage !== undefined ? `${(r.combo.highIntelligenceCoverage * 100).toFixed(0)}%` : "100%"}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
              (r.combo.highIntelligenceCoverage ?? 1.0) >= 1.0 ? "bg-emerald-50 text-emerald-700" :
              (r.combo.highIntelligenceCoverage ?? 1.0) >= 0.9 ? "bg-amber-50 text-amber-700" :
              "bg-red-50 text-red-700"
            }`}>
              {(r.combo.highIntelligenceCoverage ?? 1.0) >= 1.0 ? "充足" :
               (r.combo.highIntelligenceCoverage ?? 1.0) >= 0.9 ? "偏紧" : "不足"}
            </span>
          </div>
        </div>
      </div>

      {/* Allocation breakdown */}
      <div className="space-y-3.5">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">能力承担与额度匹配</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {Object.entries(r.capabilityBreakdown)
            .sort((a, b) => b[1].allocated - a[1].allocated)
            .map(([cap, info]) => (
              <div
                key={cap}
                className="rounded-2xl border border-zinc-100 bg-zinc-50/50 p-3 hover:border-zinc-200 transition-colors"
              >
                <div className="flex items-center justify-between text-xs font-bold text-zinc-700 mb-1.5">
                  <span className="text-zinc-800">{presets.capabilityLabels[cap as CapabilityKey]}</span>
                  <span className="text-zinc-500 font-mono">
                    {Math.round(info.allocated)} MTokens (能力分 {info.score})
                  </span>
                </div>
                <div className="text-[11px] text-zinc-500 flex items-center justify-between">
                  <span>主要承担计划: <strong className="text-zinc-700">{info.primaryPlan}</strong></span>
                  <span className="font-semibold text-blue-600 font-mono">分配完成</span>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Reasons and recommendations */}
      {r.reasons.length > 0 && (
        <div className="mt-5 border-t border-zinc-100 pt-4">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">推荐决策依据</h3>
          <ul className="space-y-1.5 text-sm text-zinc-700">
            {r.reasons.map((reason, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-blue-500 text-xs mt-0.5">✦</span>
                <span className="font-medium">{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Cautions */}
      {r.cautions.length > 0 && (
        <div className="mt-4 rounded-2xl bg-amber-50/40 border border-amber-200/50 p-4">
          <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1.5">⚠️ 注意事项</h3>
          <ul className="space-y-1 text-xs text-amber-850">
            {r.cautions.map((caution, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-amber-500">•</span>
                <span className="font-medium">{caution}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default async function ResultPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const input = parseInput(params);
  const results = recommend(input);
  const weights = buildNeedWeights(input);

  const top = results[0];
  
  const highQuotaPick = results
    .filter((r) => r.budgetStatus === "within" || r.budgetStatus === "slightlyOver")
    .filter((r) => r !== top)
    .sort((a, b) => {
      const coverageDelta = b.combo.usageCoverage - a.combo.usageCoverage;
      if (Math.abs(coverageDelta) > 0.05) return coverageDelta;
      return b.capabilityScore - a.capabilityScore;
    })[0];

  const performancePick = results
    .slice()
    .sort((a, b) => b.capabilityScore - a.capabilityScore)[0];
  const chineseQuotaPick = results
    .filter((r) => r !== top && r !== highQuotaPick && r !== performancePick)
    .filter((r) => r.combo.usageCoverage >= 1.5)
    .filter((r) => r.combo.plans.some((p) => (p.scoreRecord.scores.chineseWriting ?? 0) >= 90))
    .filter((r) => !r.combo.plans.some((p) => p.category === "coding_subscription"))
    .sort((a, b) => b.finalScore - a.finalScore)[0];
  const alternatives = results
    .filter(
      (r) =>
        r !== top &&
        r !== highQuotaPick &&
        r !== performancePick &&
        r !== chineseQuotaPick
    )
    .slice(0, 4);

  return (
    <main className="flex-1 min-h-screen bg-zinc-50 flex flex-col relative overflow-hidden pb-16">
      
      {/* Background grids */}
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-gradient-to-tr from-blue-200/10 to-indigo-300/15 rounded-full blur-3xl pointer-events-none" />
      
      <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 flex-1 flex flex-col gap-6">
        
        {/* Navigation */}
        <div className="flex items-center justify-between border-b border-zinc-200/60 pb-4">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700 bg-white shadow-sm border border-zinc-200/50 rounded-xl px-4 py-2 transition-all hover:shadow"
          >
            ← 重新输入需求
          </Link>
          <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">
            推荐引擎计算完成
          </span>
        </div>

        <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight">
          SubPlan 智能订阅组合推荐
        </h1>

        {/* Input Parameters panel */}
        <div className="rounded-3xl bg-zinc-900 text-zinc-100 p-5 shadow-xl border border-zinc-855 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">输入评估参数</h2>
          
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm font-medium">
            <div className="bg-zinc-800/40 p-3 rounded-2xl border border-zinc-800">
              <span className="block text-[10px] text-zinc-500 font-bold uppercase">月预算</span>
              <span className="text-sm sm:text-base text-zinc-200 font-bold">{formatPriceCny(input.budgetCny)}/月</span>
            </div>
            <div className="bg-zinc-800/40 p-3 rounded-2xl border border-zinc-800">
              <span className="block text-[10px] text-zinc-500 font-bold uppercase">月用量需求</span>
              <span className="text-sm sm:text-base text-zinc-200 font-bold">{input.monthlyDemandMTokens} MTokens/月</span>
            </div>
            <div className="bg-zinc-800/40 p-3 rounded-2xl border border-zinc-800">
              <span className="block text-[10px] text-zinc-500 font-bold uppercase">高智能比例</span>
              <span className="text-sm sm:text-base text-zinc-200 font-bold">
                {input.highIntelligenceRatioPreset === "low" ? "低 (20%)" :
                 input.highIntelligenceRatioPreset === "medium" ? "中 (50%)" :
                 input.highIntelligenceRatioPreset === "high" ? "高 (80%)" : "极高 (95%)"}
              </span>
            </div>
            <div className="bg-zinc-800/40 p-3 rounded-2xl border border-zinc-800">
              <span className="block text-[10px] text-zinc-500 font-bold uppercase">使用地区</span>
              <span className="text-sm sm:text-base text-zinc-200 font-bold">
                {input.region === "CN" ? "🇨🇳 中国" :
                 input.region === "US" ? "🇺🇸 美国" :
                 input.region === "JP" ? "🇯🇵 日本" : "🌐 全球"}
              </span>
            </div>
            <div className="bg-zinc-800/40 p-3 rounded-2xl border border-zinc-800">
              <span className="block text-[10px] text-zinc-500 font-bold uppercase">支付与接口</span>
              <span className="text-[11px] text-zinc-300 font-semibold leading-tight block mt-0.5">
                {input.acceptsApiBilling ? "✅ 接受 API" : "❌ 仅限订阅"}
                <br />
                {input.hasForeignCard ? "✅ 有外币卡" : "❌ 无外币卡"}
              </span>
            </div>
          </div>

          <div className="mt-4 border-t border-zinc-800/60 pt-3">
            <span className="block text-[10px] text-zinc-500 font-bold uppercase mb-1.5">需求归一化权重</span>
            <div className="flex flex-wrap gap-2">
              {Object.entries(weights)
                .sort((a, b) => b[1] - a[1])
                .map(([k, v]) => (
                  <span
                    key={k}
                    className="inline-flex items-center rounded-lg bg-zinc-800 border border-zinc-700 px-2.5 py-1 text-xs font-semibold text-zinc-300"
                  >
                    {presets.capabilityLabels[k as CapabilityKey]} {(v * 100).toFixed(0)}%
                  </span>
                ))}
            </div>
          </div>
        </div>

        {/* Results area */}
        {results.length === 0 ? (
          <div className="mt-4 rounded-3xl bg-amber-50 border border-amber-200 p-6 text-amber-900 shadow-md">
            <p className="font-bold flex items-center gap-1">
              <span>⚠️</span> 未找到同时符合预算及高智能额度覆盖的组合
            </p>
            <p className="mt-2 text-sm leading-relaxed text-amber-800">
              推荐引擎要求**总额度覆盖率**与**高智能有效覆盖率**均不低于 90%。
              您可能开启了较高的“高智能需求比例”，而当前预算购买不到足够的高智能产品。
              建议您**提高月预算**，或在首页选择较低的“高智能比例”（例如“中”或“低”）后再试。
            </p>
          </div>
        ) : (
          <div className="space-y-8 mt-2">
            
            {/* 1. Best Pick */}
            {top && (
              <section className="space-y-3">
                <h2 className="text-lg font-extrabold text-zinc-800 tracking-tight flex items-center gap-1.5">
                  <span className="text-blue-600">★</span> 最优推荐方案
                </h2>
                <ComboCard r={top} rank={1} badge="最推荐" />
              </section>
            )}

            {/* 2. High quota pick */}
            {highQuotaPick && top && highQuotaPick !== top && (
              <section className="space-y-3">
                <h2 className="text-lg font-extrabold text-zinc-800 tracking-tight flex items-center gap-1.5">
                  <span className="text-emerald-500">★</span> 量大管饱备选
                </h2>
                <ComboCard
                  r={highQuotaPick}
                  rank={results.indexOf(highQuotaPick) + 1}
                  badge="量大"
                />
              </section>
            )}

            {/* 3. Performance Pick */}
            {performancePick && top && performancePick !== top && performancePick !== highQuotaPick && (
              <section className="space-y-3">
                <h2 className="text-lg font-extrabold text-zinc-800 tracking-tight flex items-center gap-1.5">
                  <span className="text-purple-500">★</span> 高性能强力组合
                </h2>
                <ComboCard
                  r={performancePick}
                  rank={results.indexOf(performancePick) + 1}
                  badge="高性能"
                />
              </section>
            )}

            {chineseQuotaPick && (
              <section className="space-y-3">
                <h2 className="text-lg font-extrabold text-zinc-800 tracking-tight flex items-center gap-1.5">
                  <span className="text-amber-500">★</span> 高额度中文友好备选
                </h2>
                <ComboCard
                  r={chineseQuotaPick}
                  rank={results.indexOf(chineseQuotaPick) + 1}
                  badge="高额度"
                />
              </section>
            )}

            {/* 4. Alternatives */}
            {alternatives.length > 0 && (
              <section className="space-y-3.5">
                <h2 className="text-lg font-extrabold text-zinc-855 tracking-tight">
                  其它候选订阅组合
                </h2>
                <div className="space-y-5">
                  {alternatives
                    .map((r) => (
                      <ComboCard
                        key={r.combo.plans.map((p) => p.id).join("-")}
                        r={r}
                        rank={results.indexOf(r) + 1}
                      />
                    ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Footer */}
        <p className="mt-8 text-center text-[11px] text-zinc-400 font-medium">
          数据来源为社区观测统计与 AI 估算，不承诺 100% 准确。缓存折算比例根据高智能（S/A/B/C/D）档位动态调配。
        </p>
      </div>
    </main>
  );
}
