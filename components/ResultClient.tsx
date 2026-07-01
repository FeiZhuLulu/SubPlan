"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatPriceCny } from "@/lib/budget";
import { dict, getCapabilityLabel, translateReason, translateCaution, type Locale } from "@/lib/locales";
import type { RecommendResponse, ScoredCombo } from "@/lib/types";

function coverageLabel(status: ScoredCombo["coverageStatus"], t: Record<string, string>) {
  if (status === "sufficient") return t.coverageSufficient;
  if (status === "tight") return t.coverageTight;
  return t.coverageInsufficient;
}

function budgetLabel(status: ScoredCombo["budgetStatus"], t: Record<string, string>) {
  if (status === "within") return t.budgetWithin;
  if (status === "slightlyOver") return t.budgetSlightlyOver;
  return t.budgetOver;
}

function existingPriceCny(result: ScoredCombo) {
  return result.combo.totalPriceCny - result.combo.newPriceCny;
}

function formatQuota(value: number) {
  if (value >= 1000) return `${Math.round(value).toLocaleString()} MTokens`;
  return `${Math.round(value)} MTokens`;
}

function usageEstimateText(result: ScoredCombo, lang: Locale) {
  const planQuotas = result.combo.plans
    .filter((plan) => plan.textQuota > 0)
    .map((plan) => `${plan.name} ${lang === "en" ? "approx." : "约"} ${formatQuota(plan.textQuota)}`)
    .join(" / ");

  const detail = planQuotas ? `${lang === "en" ? ", individual estimation: " : "，单项估算："}${planQuotas}` : "";
  return lang === "en"
    ? `Quota estimate is approx. ${formatQuota(result.combo.totalTextQuota)}${detail}. Sources are from community statistics and AI estimation, not guaranteed to be 100% accurate.`
    : `额度估算约 ${formatQuota(result.combo.totalTextQuota)}${detail}。来源为社区统计与 AI 估算，不承诺 100% 准确。`;
}

function ComboCard({ result, badge, lang }: { result: ScoredCombo; badge?: string; lang: Locale }) {
  const t = dict[lang];

  const isBest = badge === "最推荐";
  const isHighQuota = badge === "量大";
  const isHighPerf = badge === "高性能";
  const isChineseFriendly = badge === "高额度";

  let cardStyles = "rounded-2xl p-6 transition-all duration-300 relative overflow-hidden group border ";
  let topBarStyles = "absolute top-0 inset-x-0 ";
  let badgeLabel = "";
  let badgeStyles = "rounded-full px-3 py-0.5 text-xs font-bold border ";

  if (isBest) {
    // True Premium Metallic Gold Theme with animation
    cardStyles += "bg-gradient-to-br from-white via-white to-amber-50/15 border-amber-500/30 shadow-2xl shadow-amber-500/10 hover:shadow-amber-500/20 hover:border-amber-500/60";
    topBarStyles += "h-2 gold-shimmer-border";
    badgeLabel = lang === "en" ? "✨ Best Pick" : "✨ 综合首选";
    badgeStyles += "bg-amber-50/90 text-amber-855 border-amber-200";
  } else if (isHighPerf) {
    // Smooth flowing neon strip Theme
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
    cardStyles += "bg-white border-stone-200/80 shadow-sm hover:border-stone-350 hover:shadow-md";
    topBarStyles += "h-1 bg-amber-400";
    badgeLabel = lang === "en" ? "✍️ Chinese Friendly" : "✍️ 中文友好";
    badgeStyles += "bg-amber-50 text-amber-800 border-amber-100";
  } else {
    cardStyles += "bg-white border-stone-200 shadow-sm hover:shadow-md hover:border-stone-300";
    topBarStyles += "h-1 bg-stone-200";
  }

  return (
    <article className={cardStyles}>
      {/* Top Border light effect with rounded top-t corners */}
      {isHighPerf ? (
        <div className="absolute top-0 inset-x-0 h-2 bg-neutral-950 overflow-hidden rounded-t-2xl">
          <div className="flowing-neon-strip absolute inset-0" />
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
        <div>
          {badgeLabel && (
            <span className={badgeStyles}>
              {badgeLabel}
            </span>
          )}
          <h2 className={`font-extrabold text-neutral-900 transition-colors flex items-center gap-2 ${isBest ? "text-2xl" : "text-xl"} mt-2`}>
            {result.combo.plans.map((plan) => plan.name).join(" + ")}
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {result.combo.plans.map((plan) => {
              let stateText = "";
              let badgeColor = "";
              if (plan.isExisting) {
                stateText = t.planStateOwned;
                badgeColor = "bg-emerald-50 text-emerald-800 border border-emerald-250";
              } else if (plan.isUpgrade) {
                stateText = t.planStateUpgrade;
                badgeColor = "bg-amber-50 text-amber-800 border border-amber-250";
              } else {
                stateText = t.planStateNew;
                badgeColor = "bg-blue-50 text-blue-800 border border-blue-200";
              }

              return (
                <span
                  key={plan.id}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${badgeColor}`}
                >
                  {stateText} · {plan.provider} · {formatPriceCny(plan.priceCny)}
                </span>
              );
            })}
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-neutral-900">
            {formatPriceCny(result.combo.totalPriceCny)}
            <span className="text-xs font-semibold text-stone-400">{t.monthUnit}</span>
          </p>
          {result.combo.newPriceCny !== result.combo.totalPriceCny && (
            <p className="text-xs font-bold text-stone-400">
              {t.ownedHeader
                .replace("{owned}", formatPriceCny(existingPriceCny(result)))
                .replace("{new}", formatPriceCny(result.combo.newPriceCny))}
            </p>
          )}
          <p className="text-xs font-bold text-stone-400">
            {lang === "en" ? "Approx. " : "约 "} {Math.round(result.combo.totalTextQuota)} MTokens
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-b border-stone-100 py-4 my-5 relative z-10">
        <div className="space-y-1">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-wide">{lang === "en" ? "Cap Score" : "能力分"}</p>
          <p className="text-lg font-black text-neutral-900">{result.capabilityScore.toFixed(1)}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-wide">{lang === "en" ? "Composite Score" : "综合分"}</p>
          <p className="text-lg font-black text-blue-700">{result.finalScore.toFixed(1)}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-wide">{lang === "en" ? "Coverage" : "覆盖率"}</p>
          <p className="text-lg font-black text-neutral-900">
            {(result.combo.usageCoverage * 100).toFixed(0)}%
          </p>
          <p className="text-xs font-semibold text-stone-500">{coverageLabel(result.coverageStatus, t)}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-wide">{t.paramBudget}</p>
          <p className="text-sm font-bold text-neutral-800">{budgetLabel(result.budgetStatus, t)}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 relative z-10">
        {Object.entries(result.capabilityBreakdown)
          .sort((a, b) => b[1].allocated - a[1].allocated)
          .map(([capability, info]) => (
            <div key={capability} className="rounded-2xl border border-stone-150 bg-stone-50/50 p-3">
              <div className="flex items-center justify-between text-xs font-bold text-neutral-700">
                <span>{getCapabilityLabel(capability, lang)}</span>
                <span>{Math.round(info.allocated)} MTokens</span>
              </div>
              <p className="mt-1 text-xs text-stone-500">
                {lang === "en" ? "Mainly by " : "主要由 "} <strong>{info.primaryPlan}</strong> {lang === "en" ? ", score: " : " 承担，能力分 "}{info.score}
              </p>
            </div>
          ))}
      </div>

      {(result.reasons.length > 0 || result.combo.totalTextQuota > 0) && (
        <ul className="mt-5 space-y-2 text-sm font-medium text-stone-700 border-t border-stone-100 pt-4 relative z-10">
          {result.reasons.map((reason) => (
            <li key={reason}>• {translateReason(reason, lang)}</li>
          ))}
          {result.combo.totalTextQuota > 0 && <li>• {usageEstimateText(result, lang)}</li>}
        </ul>
      )}

      {result.cautions.length > 0 && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/40 p-4 text-xs font-medium text-amber-850 relative z-10">
          {result.cautions.map((caution) => (
            <p key={caution}>• {translateCaution(caution, lang)}</p>
          ))}
        </div>
      )}
    </article>
  );
}

export default function ResultClient() {
  const searchParams = useSearchParams();
  const lang: Locale = searchParams.get("lang") === "en" ? "en" : "zh";
  const t = dict[lang];

  const [data, setData] = useState<RecommendResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const requestBody = useMemo(
    () => ({
      budgetCny: Number(searchParams.get("budget")) || 0,
      budgetTolerance: searchParams.get("tolerance") || "normal",
      monthlyDemandMTokens: Number(searchParams.get("usage")) || 1,
      primaryUseCase: searchParams.get("primary") || "backend_main_frontend_light",
      secondaryUseCase: searchParams.get("secondary") || "none",
      region: searchParams.get("region") || "CN",
      acceptsApiBilling: searchParams.get("api") === "1",
      hasForeignCard: searchParams.get("card") === "1",
      addOns: searchParams.get("addons")?.split(",").filter(Boolean) ?? [],
      existingPlanIds: searchParams.get("existing")?.split(",").filter(Boolean) ?? [],
      highIntelligenceRatioPreset: searchParams.get("intelligence") || "medium",
    }),
    [searchParams]
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "推荐计算失败");
        if (!cancelled) setData(payload);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "推荐计算失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [requestBody]);

  const results = data?.results ?? [];
  const top = results[0];
  const budgetPick = results
    .filter((result) => result.budgetStatus === "within")
    .sort((a, b) => a.combo.totalPriceCny - b.combo.totalPriceCny)[0];
  const performancePick = [...results].sort((a, b) => b.capabilityScore - a.capabilityScore)[0];
  const alternatives = results
    .filter((result) => result !== top && result !== budgetPick && result !== performancePick)
    .slice(0, 4);

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 text-neutral-900 sm:px-6">
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
        .flowing-neon-strip {
          background: linear-gradient(90deg, #a855f7 0%, #ec4899 25%, #3b82f6 50%, #a855f7 75%, #ec4899 100%);
          background-size: 200% auto;
          animation: flowLED 4s linear infinite;
        }
        .battery-charge-indicator {
          height: 100%;
          background: linear-gradient(90deg, #34d399, #10b981);
          animation: batteryCharge 3s ease-in-out infinite;
        }
      `}} />

      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex items-center justify-between border-b border-stone-200 pb-4">
          <Link
            href={`/#existing-subscriptions${lang === "en" ? "?lang=en" : ""}`}
            className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-bold text-neutral-800 hover:text-black shadow-sm"
          >
            {t.reenter}
          </Link>
          <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
            {data?.dataVersion ?? "v0.1"}
          </span>
        </div>

        <section>
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900">{t.resultTitle}</h1>
          <p className="mt-2 text-sm font-medium text-stone-500">
            {lang === "en"
              ? "Recommendations are computed via `/api/recommend`, evaluated against budget, usage, and capability preferences."
              : "推荐结果通过 `/api/recommend` 计算，按预算、用量和能力需求进行额度约束评分。"}
          </p>
        </section>

        {loading && (
          <div className="rounded-2xl border border-stone-250 bg-white p-8 text-sm font-bold text-stone-500">
            {lang === "en" ? "Calculating recommendations..." : "正在计算推荐组合..."}
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-bold text-red-750">
            {error}
          </div>
        )}

        {!loading && !error && results.length === 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm font-medium text-amber-905">
            {lang === "en"
              ? "No combination fits the budget and quota requirements. Try raising budget, reducing usage, or enabling API billing. Selected existing plans are also included in total cost."
              : "未找到符合预算和额度约束的组合。可以提高预算、降低用量，或开启 API 计费补位后重试。如果选择了已有订阅，它们也会计入总预算。"}
          </div>
        )}

        {!loading && !error && top && (
          <div className="space-y-8">
            <section className="space-y-3">
              <h2 className="text-lg font-extrabold flex items-center gap-1.5">
                <span className="gold-shimmer-text">★</span> {t.bestPick}
              </h2>
              <ComboCard result={top} badge="最推荐" lang={lang} />
            </section>

            {budgetPick && budgetPick !== top && (
              <section className="space-y-3">
                <h2 className="text-lg font-extrabold flex items-center gap-1.5">
                  <span className="text-emerald-600">★</span> {t.highQuotaPick}
                </h2>
                <ComboCard result={budgetPick} badge="量大" lang={lang} />
              </section>
            )}

            {performancePick && performancePick !== top && performancePick !== budgetPick && (
              <section className="space-y-3">
                <h2 className="text-lg font-extrabold flex items-center gap-1.5">
                  <span className="text-fuchsia-600">★</span> {t.highPerfPick}
                </h2>
                <ComboCard result={performancePick} badge="高性能" lang={lang} />
              </section>
            )}

            {alternatives.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-lg font-extrabold">{t.otherCandidates}</h2>
                <div className="space-y-5">
                  {alternatives.map((result) => (
                    <ComboCard key={result.combo.plans.map((plan) => plan.id).join("-")} result={result} lang={lang} />
                  ))}
                </div>
              </section>
            )}

            {data?.assumptions.length ? (
              <div className="rounded-2xl border border-stone-200 bg-white p-5 text-xs font-medium leading-relaxed text-stone-500">
                {data.assumptions.map((assumption) => (
                  <p key={assumption}>• {assumption}</p>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </main>
  );
}
