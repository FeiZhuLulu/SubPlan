import Link from "next/link";
import { recommend } from "@/lib/recommend";
import { formatPriceCny } from "@/lib/budget";
import { buildNeedWeights } from "@/lib/recommend";
import LanguageToggle from "@/components/LanguageToggle";
import {
  dict,
  getCapabilityLabel,
  translateReason,
  translateCaution,
  type Locale,
} from "@/lib/locales";
import type {
  UserInput,
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
  lang?: string;
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

function getCoverageLabel(status: ScoredCombo["coverageStatus"], t: Record<string, string>) {
  switch (status) {
    case "sufficient":
      return t.coverageSufficient;
    case "tight":
      return t.coverageTight;
    case "insufficient":
      return t.coverageInsufficient;
    default:
      return status;
  }
}

function getBudgetLabel(status: ScoredCombo["budgetStatus"], t: Record<string, string>) {
  switch (status) {
    case "within":
      return t.budgetWithin;
    case "slightlyOver":
      return t.budgetSlightlyOver;
    case "over":
      return t.budgetOver;
    default:
      return status;
  }
}

function existingPriceCny(result: ScoredCombo) {
  return result.combo.totalPriceCny - result.combo.newPriceCny;
}

function budgetUtilizationScore(result: ScoredCombo, budgetCny: number) {
  if (budgetCny <= 0) return 0;
  const utilization = result.combo.totalPriceCny / budgetCny;
  if (utilization >= 0.7 && utilization <= 1.15) return 1;
  if (utilization < 0.7) return Math.max(0, utilization / 0.7);
  return Math.max(0, 1 - (utilization - 1.15));
}

function highQuotaCandidateScore(result: ScoredCombo, budgetCny: number) {
  const coverageScore = Math.min(result.combo.usageCoverage, 2) * 35;
  const highCoverageScore = Math.min(result.combo.highIntelligenceCoverage ?? 1, 1) * 30;
  const capabilityScore = result.capabilityScore * 0.25;
  const budgetScore = budgetUtilizationScore(result, budgetCny) * 18;
  return coverageScore + highCoverageScore + capabilityScore + budgetScore;
}

function ComboCard({
  r,
  rank,
  badge,
  lang,
}: {
  r: ScoredCombo;
  rank: number;
  badge?: string;
  lang: Locale;
}) {
  const t = dict[lang];

  // Distinguish visually based on the badge type to establish visual hierarchy
  const isBest = badge === "最推荐";
  const isHighQuota = badge === "量大";
  const isHighPerf = badge === "高性能";
  const isChineseFriendly = badge === "高额度";

  // Custom visual configurations
  let cardStyles = "rounded-2xl p-6 transition-all duration-300 relative overflow-hidden group border ";
  let topBarStyles = "absolute top-0 inset-x-0 ";
  let badgeLabel = "";
  let badgeStyles = "rounded-full px-3 py-0.5 text-xs font-bold border ";

  if (isBest) {
    // True Premium Metallic Gold Theme with animation
    cardStyles += "bg-gradient-to-br from-white via-white to-amber-50/15 border-amber-500/30 shadow-2xl shadow-amber-500/10 hover:shadow-amber-500/20 hover:border-amber-500/60";
    topBarStyles += "h-2 gold-shimmer-border";
    badgeLabel = lang === "en" ? "✨ Best Pick" : "✨ 综合首选";
    badgeStyles += "bg-amber-50/90 text-amber-800 border-amber-200";
  } else if (isHighPerf) {
    // LED Pixel Strip Theme
    cardStyles += "bg-gradient-to-br from-white via-white to-fuchsia-50/10 border-fuchsia-200/80 shadow-xl shadow-fuchsia-500/5 hover:shadow-fuchsia-500/15 hover:border-fuchsia-350";
    topBarStyles += "h-2 bg-neutral-950";
    badgeLabel = lang === "en" ? "⚡ Max Performance" : "⚡ 极致性能";
    badgeStyles += "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100";
  } else if (isHighQuota) {
    // Battery Charging Theme
    cardStyles += "bg-gradient-to-br from-white via-white to-emerald-50/10 border-emerald-250/80 shadow-xl shadow-emerald-500/5 hover:shadow-emerald-500/15 hover:border-emerald-350";
    topBarStyles += "h-2 bg-stone-100";
    badgeLabel = lang === "en" ? "🔋 High Quota" : "🔋 量大管饱";
    badgeStyles += "bg-emerald-50 text-emerald-800 border-emerald-100";
  } else if (isChineseFriendly) {
    // Clean Amber Accent Theme
    cardStyles += "bg-white border-stone-200/80 shadow-sm hover:border-stone-350 hover:shadow-md";
    topBarStyles += "h-1 bg-amber-400";
    badgeLabel = lang === "en" ? "✍️ Chinese Friendly" : "✍️ 中文友好";
    badgeStyles += "bg-amber-50 text-amber-850 border-amber-250";
  } else {
    // Ordinary alternatives: neutral and set-back visually
    cardStyles += "bg-white border-stone-200 shadow-sm hover:shadow-md hover:border-stone-300";
    topBarStyles += "h-1 bg-stone-200";
  }

  return (
    <div className={cardStyles}>
      {/* Top Border light effect with rounded top-t corners */}
      {isHighPerf ? (
        <div className="absolute top-0 inset-x-0 h-2 bg-neutral-950 overflow-hidden rounded-t-2xl">
          <div className="led-pixel-strip absolute inset-0" />
          <div className="led-pixel-mask absolute inset-0" />
        </div>
      ) : isHighQuota ? (
        <div className="absolute top-0 inset-x-0 h-2 bg-stone-100 overflow-hidden rounded-t-2xl">
          <div className="battery-charge-indicator" />
        </div>
      ) : (
        <div className={`${topBarStyles} rounded-t-2xl`} />
      )}

      {/* Sweeping golden reflection overlay */}
      {isBest && <div className="gold-shine-sweep" />}

      <div className="flex flex-wrap items-start justify-between gap-4 relative z-10">
        <div className="space-y-2">
          <div className="flex items-center flex-wrap gap-2">
            {badgeLabel && (
              <span className={badgeStyles}>
                {badgeLabel}
              </span>
            )}
            <span className="rounded-full bg-stone-100 border border-stone-200 px-2.5 py-0.5 text-xs font-bold text-stone-600">
              Rank #{rank}
            </span>
          </div>
          
          <h2 className={`font-extrabold text-neutral-900 transition-colors flex items-center gap-2 ${isBest ? "text-2xl" : "text-xl"}`}>
            {r.combo.plans.map((p) => p.name).join(" + ")}
          </h2>
          
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
            {r.combo.plans.map((p) => p.provider).join(" · ")}
          </p>
          <div className="flex flex-wrap gap-2">
            {r.combo.plans.map((plan) => {
              let stateLabel = "";
              let badgeColor = "";

              if (plan.isExisting) {
                stateLabel = t.planStateOwned;
                badgeColor = "bg-emerald-50 text-emerald-800 border border-emerald-200";
              } else if (plan.isUpgrade) {
                stateLabel = t.planStateUpgradeFrom.replace(
                  "{from}",
                  plan.upgradeFromPlanName ?? ""
                );
                badgeColor = "bg-amber-50 text-amber-850 border border-amber-200";
              } else {
                stateLabel = t.planStateNew;
                badgeColor = "bg-blue-50 text-blue-800 border border-blue-200";
              }

              return (
                <span
                  key={plan.id}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold normal-case tracking-normal ${badgeColor}`}
                >
                  {stateLabel} · {plan.provider} · {formatPriceCny(plan.isUpgrade ? plan.upgradeDeltaCny ?? plan.priceCny : plan.priceCny)}
                </span>
              );
            })}
          </div>
        </div>

        <div className="text-right">
          <p className={`font-black text-neutral-900 leading-tight ${isBest ? "text-3xl" : "text-2xl"}`}>
            {formatPriceCny(r.combo.totalPriceCny)}
            <span className="text-xs font-semibold text-stone-400">{t.monthUnit}</span>
          </p>
          {r.combo.newPriceCny !== r.combo.totalPriceCny && (
            <p className="mt-1 text-xs font-bold text-stone-450">
              {t.ownedHeader
                .replace("{owned}", formatPriceCny(existingPriceCny(r)))
                .replace("{new}", formatPriceCny(r.combo.newPriceCny))}
            </p>
          )}
          <div className="flex items-center justify-end gap-1.5 mt-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${
              r.budgetStatus === "within" ? "bg-emerald-500" :
              r.budgetStatus === "slightlyOver" ? "bg-amber-500" : "bg-red-500"
            }`} />
            <span className="text-xs font-bold text-stone-500">
              {getBudgetLabel(r.budgetStatus, t)}
            </span>
          </div>
        </div>
      </div>

      {/* Main score metrics grids */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 border-t border-b border-stone-100 py-4 my-5 relative z-10">
        <div className="space-y-1">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-wide">{t.metricsCapability}</p>
          <div className="flex items-center gap-2">
            <span className="text-lg font-black text-neutral-800">{r.capabilityScore.toFixed(1)}</span>
            <div className="w-16 bg-stone-100 rounded-full h-1.5 overflow-hidden hidden sm:block">
              <div
                className="bg-neutral-850 h-full rounded-full"
                style={{ width: `${r.capabilityScore}%` }}
              />
            </div>
          </div>
        </div>

        <div className="space-y-1 border-l border-stone-100 pl-4">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-wide">{t.metricsAlgScore}</p>
          <p className="text-lg font-black text-neutral-850">
            {r.finalScore.toFixed(1)}
          </p>
        </div>

        <div className="space-y-1 border-l border-stone-100 pl-4">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-wide">{t.metricsQuotaCoverage}</p>
          <div className="flex items-center gap-2">
            <span className="text-lg font-black text-neutral-800">
              {(r.combo.usageCoverage * 100).toFixed(0)}%
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
              r.coverageStatus === "sufficient" ? "bg-emerald-50 text-emerald-700" :
              r.coverageStatus === "tight" ? "bg-amber-50 text-amber-700" :
              "bg-red-50 text-red-700"
            }`}>
              {getCoverageLabel(r.coverageStatus, t)}
            </span>
          </div>
        </div>

        <div className="space-y-1 border-l border-stone-100 pl-4">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-wide">{t.metricsIntelCoverage}</p>
          <div className="flex items-center gap-2">
            <span className="text-lg font-black text-neutral-800">
              {r.combo.highIntelligenceCoverage !== undefined ? `${(r.combo.highIntelligenceCoverage * 100).toFixed(0)}%` : "100%"}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
              (r.combo.highIntelligenceCoverage ?? 1.0) >= 1.0 ? "bg-emerald-50 text-emerald-700" :
              (r.combo.highIntelligenceCoverage ?? 1.0) >= 0.9 ? "bg-amber-50 text-amber-700" :
              "bg-red-50 text-red-700"
            }`}>
              {(r.combo.highIntelligenceCoverage ?? 1.0) >= 1.0 ? t.coverageSufficient :
               (r.combo.highIntelligenceCoverage ?? 1.0) >= 0.9 ? t.coverageTight : t.coverageInsufficient}
            </span>
          </div>
        </div>
      </div>

      {/* Allocation breakdown */}
      <div className="space-y-3.5 relative z-10">
        <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">{t.allocHeader}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {Object.entries(r.capabilityBreakdown)
            .sort((a, b) => b[1].allocated - a[1].allocated)
            .map(([cap, info]) => (
              <div
                key={cap}
                className="rounded-2xl border border-stone-150 bg-stone-50/50 p-3 hover:border-stone-250 transition-colors"
              >
                <div className="flex items-center justify-between text-xs font-bold text-stone-700 mb-1.5">
                  <span className="text-neutral-800">{getCapabilityLabel(cap, lang)}</span>
                  <span className="text-stone-500 font-mono">
                    {Math.round(info.allocated)} MTokens ({t.allocScore} {info.score})
                  </span>
                </div>
                <div className="text-[11px] text-stone-500 flex items-center justify-between">
                  <span>{t.allocPlan}: <strong className="text-neutral-800">{info.primaryPlan}</strong></span>
                  <span className="font-semibold text-neutral-800 font-mono">{t.allocDone}</span>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Reasons and recommendations */}
      {r.reasons.length > 0 && (
        <div className="mt-5 border-t border-stone-150 pt-4 relative z-10">
          <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">{t.logicHeader}</h3>
          <ul className="space-y-1.5 text-sm text-stone-700">
            {r.reasons.map((reason, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-stone-500 text-xs mt-0.5">✦</span>
                <span className="font-medium">{translateReason(reason, lang)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Cautions */}
      {r.cautions.length > 0 && (
        <div className="mt-4 rounded-2xl bg-amber-55/40 border border-amber-200/50 p-4 relative z-10">
          <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1.5">{t.cautionHeader}</h3>
          <ul className="space-y-1 text-xs text-amber-850">
            {r.cautions.map((caution, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-amber-500">•</span>
                <span className="font-medium">{translateCaution(caution, lang)}</span>
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
  const lang: Locale = params.lang === "en" ? "en" : "zh";
  const t = dict[lang];

  const input = parseInput(params);
  const results = recommend(input);
  const weights = buildNeedWeights(input);

  const top = results[0];
  
  const highQuotaPick = results
    .filter((r) => r.budgetStatus === "within" || r.budgetStatus === "slightlyOver")
    .filter((r) => r !== top)
    .sort((a, b) => {
      const scoreDelta =
        highQuotaCandidateScore(b, input.budgetCny) -
        highQuotaCandidateScore(a, input.budgetCny);
      if (Math.abs(scoreDelta) > 0.1) return scoreDelta;
      return b.combo.totalPriceCny - a.combo.totalPriceCny;
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
    <main className="flex-1 min-h-screen bg-stone-50 flex flex-col relative overflow-hidden pb-16">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes goldShimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes shineSweep {
          0% { transform: translateX(-150%) skewX(-15deg); }
          100% { transform: translateX(250%) skewX(-15deg); }
        }
        @keyframes flowLED {
          0% { background-position: 0% 50%; }
          100% { background-position: -200% 50%; }
        }
        @keyframes batteryCharge {
          0% { width: 0%; opacity: 0.3; }
          75% { width: 100%; opacity: 1; }
          90% { width: 100%; opacity: 1; }
          95% { width: 100%; opacity: 0; }
          100% { width: 0%; opacity: 0; }
        }
        .gold-shimmer-border {
          background: linear-gradient(90deg, #aa771c 0%, #f1e4c3 25%, #fcf6ba 50%, #e7c996 75%, #aa771c 100%);
          background-size: 200% auto;
          animation: goldShimmer 6s linear infinite;
        }
        .gold-shimmer-text {
          background: linear-gradient(90deg, #aa771c 0%, #f1e4c3 25%, #fcf6ba 50%, #e7c996 75%, #aa771c 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: goldShimmer 6s linear infinite;
          display: inline-block;
        }
        .gold-shine-sweep {
          position: absolute;
          inset: 0;
          width: 50%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.45) 50%, transparent);
          animation: shineSweep 5s ease-in-out infinite;
          pointer-events: none;
          z-index: 5;
        }
        .led-pixel-strip {
          background: linear-gradient(90deg, #a855f7 0%, #ec4899 25%, #3b82f6 50%, #a855f7 75%, #ec4899 100%);
          background-size: 200% auto;
          animation: flowLED 4s linear infinite;
        }
        .led-pixel-mask {
          background-image: repeating-linear-gradient(90deg, transparent 0px, transparent 4px, #0a0a0a 4px, #0a0a0a 6px);
        }
        .battery-charge-indicator {
          height: 100%;
          background: linear-gradient(90deg, #34d399, #10b981);
          animation: batteryCharge 3s ease-in-out infinite;
        }
      `}} />

      <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 flex-1 flex flex-col gap-6">
        
        {/* Navigation */}
        <div className="flex items-center justify-between border-b border-stone-200/80 pb-4">
          <Link
            href={`/${lang === "en" ? "?lang=en" : ""}`}
            className="inline-flex items-center text-sm font-semibold text-neutral-800 hover:text-black bg-white shadow-sm border border-stone-200 rounded-xl px-4 py-2 transition-all hover:shadow cursor-pointer"
          >
            {t.reenter}
          </Link>
          
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <span className="text-xs text-stone-400 font-bold uppercase tracking-wider hidden sm:inline">
              {t.engineFinished}
            </span>
          </div>
        </div>

        <h1 className="text-3xl font-extrabold text-neutral-900 tracking-tight">
          {t.resultTitle}
        </h1>

        {/* Input Parameters panel */}
        <div className="rounded-2xl bg-neutral-900 text-neutral-100 p-5 shadow-lg border border-neutral-850 relative overflow-hidden">
          <h2 className="text-xs font-bold text-neutral-505 uppercase tracking-wider mb-3">{t.evalParams}</h2>
          
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm font-medium">
            <div className="bg-neutral-850/60 p-3 rounded-xl border border-neutral-800">
              <span className="block text-[10px] text-neutral-400 font-bold uppercase">{t.paramBudget}</span>
              <span className="text-sm sm:text-base text-neutral-200 font-bold">{formatPriceCny(input.budgetCny)}{t.monthUnit}</span>
            </div>
            <div className="bg-neutral-850/60 p-3 rounded-xl border border-neutral-800">
              <span className="block text-[10px] text-neutral-400 font-bold uppercase">{t.paramUsage}</span>
              <span className="text-sm sm:text-base text-neutral-200 font-bold">{input.monthlyDemandMTokens} MTokens{t.monthUnit}</span>
            </div>
            <div className="bg-neutral-850/60 p-3 rounded-xl border border-neutral-800">
              <span className="block text-[10px] text-neutral-400 font-bold uppercase">{t.paramIntel}</span>
              <span className="text-sm sm:text-base text-neutral-200 font-bold">
                {input.highIntelligenceRatioPreset === "low" ? t.intelLow :
                 input.highIntelligenceRatioPreset === "medium" ? t.intelMedium :
                 input.highIntelligenceRatioPreset === "high" ? t.intelHigh : t.intelExtreme}
              </span>
            </div>
            <div className="bg-neutral-850/60 p-3 rounded-xl border border-neutral-800">
              <span className="block text-[10px] text-neutral-400 font-bold uppercase">{t.paramRegion}</span>
              <span className="text-sm sm:text-base text-neutral-200 font-bold">
                {input.region === "CN" ? (lang === "en" ? "🇨🇳 China" : "🇨🇳 中国") :
                 input.region === "US" ? (lang === "en" ? "🇺🇸 USA" : "🇺🇸 美国") :
                 input.region === "JP" ? (lang === "en" ? "🇯🇵 Japan" : "🇯🇵 日本") : (lang === "en" ? "🌐 Global" : "🌐 全球")}
              </span>
            </div>
            <div className="bg-neutral-850/60 p-3 rounded-xl border border-neutral-800">
              <span className="block text-[10px] text-neutral-400 font-bold uppercase">{t.paramPayment}</span>
              <span className="text-[11px] text-zinc-350 font-semibold leading-tight block mt-0.5">
                {input.acceptsApiBilling ? t.paramApiOk : t.paramApiNo}
                <br />
                {input.hasForeignCard ? t.paramCardOk : t.paramCardNo}
              </span>
            </div>
          </div>

          <div className="mt-4 border-t border-neutral-800/60 pt-3">
            <span className="block text-[10px] text-neutral-400 font-bold uppercase mb-1.5">{t.paramWeights}</span>
            <div className="flex flex-wrap gap-2">
              {Object.entries(weights)
                .sort((a, b) => b[1] - a[1])
                .map(([k, v]) => (
                  <span
                    key={k}
                    className="inline-flex items-center rounded-lg bg-neutral-850 border border-neutral-800 px-2.5 py-1 text-xs font-semibold text-neutral-350"
                  >
                    {getCapabilityLabel(k, lang)} {(v * 100).toFixed(0)}%
                  </span>
                ))}
            </div>
          </div>
        </div>

        {/* Results area */}
        {results.length === 0 ? (
          <div className="mt-4 rounded-2xl bg-amber-50 border border-amber-200 p-6 text-amber-900 shadow-md">
            <p className="font-bold flex items-center gap-1">
              <span>⚠️</span> {t.noResultTitle}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-amber-800">
              {t.noResultDesc}
            </p>
          </div>
        ) : (
          <div className="space-y-8 mt-2">
            
            {/* 1. Best Pick */}
            {top && (
              <section className="space-y-3">
                <h2 className="text-lg font-extrabold text-neutral-800 tracking-tight flex items-center gap-1.5">
                  <span className="gold-shimmer-text">★</span> {t.bestPick}
                </h2>
                <ComboCard r={top} rank={1} badge="最推荐" lang={lang} />
              </section>
            )}

            {/* 2. High quota pick */}
            {highQuotaPick && top && highQuotaPick !== top && (
              <section className="space-y-3">
                <h2 className="text-lg font-extrabold text-neutral-800 tracking-tight flex items-center gap-1.5">
                  <span className="text-emerald-600">★</span> {t.highQuotaPick}
                </h2>
                <ComboCard
                  r={highQuotaPick}
                  rank={results.indexOf(highQuotaPick) + 1}
                  badge="量大"
                  lang={lang}
                />
              </section>
            )}

            {/* 3. Performance Pick */}
            {performancePick && top && performancePick !== top && performancePick !== highQuotaPick && (
              <section className="space-y-3">
                <h2 className="text-lg font-extrabold text-neutral-850 tracking-tight flex items-center gap-1.5">
                  <span className="text-fuchsia-600">★</span> {t.highPerfPick}
                </h2>
                <ComboCard
                  r={performancePick}
                  rank={results.indexOf(performancePick) + 1}
                  badge="高性能"
                  lang={lang}
                />
              </section>
            )}

            {chineseQuotaPick && (
              <section className="space-y-3">
                <h2 className="text-lg font-extrabold text-neutral-800 tracking-tight flex items-center gap-1.5">
                  <span className="text-amber-600">★</span> {t.chineseFriendlyPick}
                </h2>
                <ComboCard
                  r={chineseQuotaPick}
                  rank={results.indexOf(chineseQuotaPick) + 1}
                  badge="高额度"
                  lang={lang}
                />
              </section>
            )}

            {/* 4. Alternatives */}
            {alternatives.length > 0 && (
              <section className="space-y-3.5">
                <h2 className="text-lg font-extrabold text-neutral-800 tracking-tight">
                  {t.otherCandidates}
                </h2>
                <div className="space-y-5">
                  {alternatives
                    .map((r) => (
                      <ComboCard
                        key={r.combo.plans.map((p) => p.id).join("-")}
                        r={r}
                        rank={results.indexOf(r) + 1}
                        lang={lang}
                      />
                    ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Footer */}
        <p className="mt-8 text-center text-[11px] text-stone-400 font-medium leading-relaxed">
          {t.footer2}
        </p>
      </div>
    </main>
  );
}
