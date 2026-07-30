import Link from "next/link";
import { recommend } from "@/lib/recommend";
import { formatPriceCny } from "@/lib/budget";
import { buildNeedWeights } from "@/lib/recommend";
import LanguageToggle from "@/components/LanguageToggle";
import ComboCard, { type ComboBadge } from "@/components/ComboCard";
import AllResults from "@/components/AllResults";
import { comboKey } from "@/lib/combo";
import { dict, getCapabilityLabel, type Locale } from "@/lib/locales";
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

function PickSection({
  title,
  gold,
  result,
  rank,
  badge,
  lang,
}: {
  title: string;
  gold?: boolean;
  result: ScoredCombo;
  rank: number;
  badge: ComboBadge;
  lang: Locale;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-extrabold text-neutral-800 tracking-tight flex items-center gap-1.5">
        <span className={gold ? "gold-shimmer-text" : "text-stone-400"}>★</span> {title}
      </h2>
      <ComboCard r={result} rank={rank} badge={badge} lang={lang} />
    </section>
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

  const picks: Array<{
    result: ScoredCombo | undefined;
    title: string;
    badge: ComboBadge;
    gold?: boolean;
  }> = [
    { result: top, title: t.bestPick, badge: "best", gold: true },
    { result: highQuotaPick, title: t.highQuotaPick, badge: "quota" },
    { result: performancePick, title: t.highPerfPick, badge: "perf" },
    { result: chineseQuotaPick, title: t.chineseFriendlyPick, badge: "chinese" },
  ];

  const shownPicks: Array<{ result: ScoredCombo; title: string; badge: ComboBadge; gold?: boolean }> = [];
  const seenKeys = new Set<string>();
  for (const pick of picks) {
    if (!pick.result) continue;
    const key = comboKey(pick.result);
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    shownPicks.push({ ...pick, result: pick.result });
  }

  return (
    <main className="flex-1 min-h-screen bg-stone-50 flex flex-col pb-16">
      <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col gap-6">

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

        {/* Input parameters panel */}
        <div className="rounded-2xl bg-neutral-900 text-neutral-100 p-5 shadow-lg border border-neutral-800">
          <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">
            {t.evalParams}
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm font-medium">
            <div className="bg-neutral-800/60 p-3 rounded-xl border border-neutral-800">
              <span className="block text-[10px] text-neutral-400 font-bold uppercase">{t.paramBudget}</span>
              <span className="text-sm sm:text-base text-neutral-200 font-bold tnum">
                {formatPriceCny(input.budgetCny)}{t.monthUnit}
              </span>
            </div>
            <div className="bg-neutral-800/60 p-3 rounded-xl border border-neutral-800">
              <span className="block text-[10px] text-neutral-400 font-bold uppercase">{t.paramUsage}</span>
              <span className="text-sm sm:text-base text-neutral-200 font-bold tnum">
                {input.monthlyDemandMTokens} MTokens{t.monthUnit}
              </span>
            </div>
            <div className="bg-neutral-800/60 p-3 rounded-xl border border-neutral-800">
              <span className="block text-[10px] text-neutral-400 font-bold uppercase">{t.paramIntel}</span>
              <span className="text-sm sm:text-base text-neutral-200 font-bold">
                {input.highIntelligenceRatioPreset === "low" ? t.intelLow :
                 input.highIntelligenceRatioPreset === "medium" ? t.intelMedium :
                 input.highIntelligenceRatioPreset === "high" ? t.intelHigh : t.intelExtreme}
              </span>
            </div>
            <div className="bg-neutral-800/60 p-3 rounded-xl border border-neutral-800">
              <span className="block text-[10px] text-neutral-400 font-bold uppercase">{t.paramRegion}</span>
              <span className="text-sm sm:text-base text-neutral-200 font-bold">
                {input.region === "CN" ? (lang === "en" ? "🇨🇳 China" : "🇨🇳 中国") :
                 input.region === "US" ? (lang === "en" ? "🇺🇸 USA" : "🇺🇸 美国") :
                 input.region === "JP" ? (lang === "en" ? "🇯🇵 Japan" : "🇯🇵 日本") : (lang === "en" ? "🌐 Global" : "🌐 全球")}
              </span>
            </div>
            <div className="bg-neutral-800/60 p-3 rounded-xl border border-neutral-800">
              <span className="block text-[10px] text-neutral-400 font-bold uppercase">{t.paramPayment}</span>
              <span className="text-[11px] text-neutral-300 font-semibold leading-tight block mt-0.5">
                {input.acceptsApiBilling ? t.paramApiOk : t.paramApiNo}
                <br />
                {input.hasForeignCard ? t.paramCardOk : t.paramCardNo}
              </span>
            </div>
          </div>

          <div className="mt-4 border-t border-neutral-800 pt-3">
            <span className="block text-[10px] text-neutral-400 font-bold uppercase mb-1.5">{t.paramWeights}</span>
            <div className="flex flex-wrap gap-2">
              {Object.entries(weights)
                .sort((a, b) => b[1] - a[1])
                .map(([k, v]) => {
                  const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
                  const percent = total > 0 ? (v / total) * 100 : 0;
                  return (
                    <span
                      key={k}
                      className="inline-flex items-center rounded-lg bg-neutral-800 border border-neutral-700 px-2.5 py-1 text-xs font-semibold text-neutral-300"
                    >
                      {getCapabilityLabel(k, lang)} <span className="tnum">{percent.toFixed(0)}%</span>
                    </span>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Results */}
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
          <div className="space-y-10 mt-2">
            {shownPicks.map((pick) => (
              <PickSection
                key={comboKey(pick.result)}
                title={pick.title}
                gold={pick.gold}
                result={pick.result}
                rank={results.indexOf(pick.result) + 1}
                badge={pick.badge}
                lang={lang}
              />
            ))}

            <AllResults
              results={results}
              excludeKeys={[...seenKeys]}
              lang={lang}
            />
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center space-y-3">
          <p>
            <a
              href="https://github.com/FeiZhuLulu/SubPlan/issues/new/choose"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-neutral-700 hover:text-black underline transition-colors cursor-pointer"
            >
              提交额度数据 / Submit data
            </a>
          </p>
          <p className="text-[11px] text-stone-400 font-medium leading-relaxed">
            {t.footer2}
          </p>
        </div>
      </div>
    </main>
  );
}
