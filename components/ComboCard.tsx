"use client";

import { formatPriceCny } from "@/lib/budget";
import {
  dict,
  getCapabilityLabel,
  translateReason,
  translateCaution,
  type Locale,
} from "@/lib/locales";
import type { ScoredCombo } from "@/lib/types";

export type ComboBadge = "best" | "perf" | "quota" | "chinese";

const BADGE_LABELS: Record<ComboBadge, { zh: string; en: string }> = {
  best: { zh: "✨ 综合首选", en: "✨ Best Pick" },
  perf: { zh: "⚡ 极致性能", en: "⚡ Max Performance" },
  quota: { zh: "🔋 量大管饱", en: "🔋 High Quota" },
  chinese: { zh: "✍️ 中文友好", en: "✍️ Chinese Friendly" },
};

function existingPriceCny(result: ScoredCombo) {
  return result.combo.totalPriceCny - result.combo.newPriceCny;
}

export default function ComboCard({
  r,
  rank,
  badge,
  lang,
}: {
  r: ScoredCombo;
  rank: number;
  badge?: ComboBadge;
  lang: Locale;
}) {
  const t = dict[lang];
  const isBest = badge === "best";

  const cardStyles = isBest
    ? "rounded-2xl border p-6 relative bg-gradient-to-br from-white to-amber-50/40 border-amber-300/80 shadow-lg shadow-amber-900/5 transition-shadow hover:shadow-xl"
    : "rounded-2xl border p-6 relative bg-white border-stone-200 shadow-sm transition-shadow hover:shadow-md";

  const badgeStyles =
    badge === "best"
      ? "rounded-md bg-amber-100 border border-amber-300/70 px-2.5 py-0.5 text-xs font-bold text-amber-900"
      : badge === "perf"
        ? "rounded-md bg-neutral-900 px-2.5 py-0.5 text-xs font-bold text-white"
        : "rounded-md bg-stone-100 border border-stone-200 px-2.5 py-0.5 text-xs font-bold text-stone-600";

  return (
    <article className={cardStyles}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2 min-w-0">
          <div className="flex items-center flex-wrap gap-2">
            {badge && (
              <span className={badgeStyles}>{BADGE_LABELS[badge][lang]}</span>
            )}
            <span className="rounded-md bg-stone-100 border border-stone-200 px-2 py-0.5 text-xs font-bold text-stone-500 tnum">
              #{rank}
            </span>
          </div>

          <h2
            className={`font-extrabold tracking-tight text-neutral-900 ${
              isBest ? "text-2xl" : "text-xl"
            }`}
          >
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
                badgeColor = "bg-amber-50 text-amber-800 border border-amber-200";
              } else {
                stateLabel = t.planStateNew;
                badgeColor = "bg-blue-50 text-blue-800 border border-blue-200";
              }

              return (
                <span
                  key={plan.id}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-bold ${badgeColor}`}
                >
                  {stateLabel} · {plan.provider} ·{" "}
                  <span className="tnum">
                    {formatPriceCny(
                      plan.isUpgrade ? plan.upgradeDeltaCny ?? plan.priceCny : plan.priceCny
                    )}
                  </span>
                </span>
              );
            })}
          </div>
        </div>

        <div className="text-right shrink-0">
          <p
            className={`font-black text-neutral-900 leading-tight tnum ${
              isBest ? "text-3xl" : "text-2xl"
            }`}
          >
            {formatPriceCny(r.combo.totalPriceCny)}
            <span className="text-xs font-semibold text-stone-400">{t.monthUnit}</span>
          </p>
          {r.combo.newPriceCny !== r.combo.totalPriceCny && (
            <p className="mt-1 text-xs font-bold text-stone-400 tnum">
              {t.ownedHeader
                .replace("{owned}", formatPriceCny(existingPriceCny(r)))
                .replace("{new}", formatPriceCny(r.combo.newPriceCny))}
            </p>
          )}
          <div className="flex items-center justify-end gap-1.5 mt-1.5">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                r.budgetStatus === "within"
                  ? "bg-emerald-500"
                  : r.budgetStatus === "slightlyOver"
                    ? "bg-amber-500"
                    : "bg-red-500"
              }`}
            />
            <span className="text-xs font-bold text-stone-500">
              {r.budgetStatus === "within"
                ? t.budgetWithin
                : r.budgetStatus === "slightlyOver"
                  ? t.budgetSlightlyOver
                  : t.budgetOver}
            </span>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 border-t border-b border-stone-100 py-4 my-5">
        <div className="space-y-1">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-wide">
            {t.metricsCapability}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-lg font-black text-neutral-800 tnum">
              {r.capabilityScore.toFixed(1)}
            </span>
            <div className="w-16 bg-stone-100 rounded-full h-1.5 overflow-hidden hidden sm:block">
              <div
                className="bg-neutral-800 h-full rounded-full"
                style={{ width: `${Math.min(100, r.capabilityScore)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="space-y-1 border-l border-stone-100 pl-4">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-wide">
            {t.metricsAlgScore}
          </p>
          <p className="text-lg font-black text-neutral-800 tnum">
            {r.finalScore.toFixed(1)}
          </p>
        </div>

        <div className="space-y-1 border-l border-stone-100 pl-4">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-wide">
            {t.metricsQuotaCoverage}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-lg font-black text-neutral-800 tnum">
              {(r.combo.usageCoverage * 100).toFixed(0)}%
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                r.coverageStatus === "sufficient"
                  ? "bg-emerald-50 text-emerald-700"
                  : r.coverageStatus === "tight"
                    ? "bg-amber-50 text-amber-700"
                    : "bg-red-50 text-red-700"
              }`}
            >
              {r.coverageStatus === "sufficient"
                ? t.coverageSufficient
                : r.coverageStatus === "tight"
                  ? t.coverageTight
                  : t.coverageInsufficient}
            </span>
          </div>
        </div>

        <div className="space-y-1 border-l border-stone-100 pl-4">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-wide">
            {t.metricsIntelCoverage}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-lg font-black text-neutral-800 tnum">
              {`${((r.combo.highIntelligenceCoverage ?? 1) * 100).toFixed(0)}%`}
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                (r.combo.highIntelligenceCoverage ?? 1) >= 1
                  ? "bg-emerald-50 text-emerald-700"
                  : (r.combo.highIntelligenceCoverage ?? 1) >= 0.9
                    ? "bg-amber-50 text-amber-700"
                    : "bg-red-50 text-red-700"
              }`}
            >
              {(r.combo.highIntelligenceCoverage ?? 1) >= 1
                ? t.coverageSufficient
                : (r.combo.highIntelligenceCoverage ?? 1) >= 0.9
                  ? t.coverageTight
                  : t.coverageInsufficient}
            </span>
          </div>
        </div>
      </div>

      {/* Allocation breakdown */}
      {Object.keys(r.capabilityBreakdown).length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">
            {t.allocHeader}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(r.capabilityBreakdown)
              .sort((a, b) => b[1].allocated - a[1].allocated)
              .map(([cap, info]) => (
                <div
                  key={cap}
                  className="rounded-xl border border-stone-200 bg-stone-50/50 p-3 hover:border-stone-300 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-stone-700 mb-1.5">
                    <span className="text-neutral-800">{getCapabilityLabel(cap, lang)}</span>
                    <span className="text-stone-500 tnum">
                      {Math.round(info.allocated)} MTokens ({t.allocScore} {info.score})
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-500 flex items-center justify-between">
                    <span>
                      {t.allocPlan}:{" "}
                      <strong className="text-neutral-800">{info.primaryPlan}</strong>
                    </span>
                    <span className="font-semibold text-neutral-800">{t.allocDone}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Reasons */}
      {r.reasons.length > 0 && (
        <div className="mt-5 border-t border-stone-100 pt-4">
          <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
            {t.logicHeader}
          </h3>
          <ul className="space-y-1.5 text-sm text-stone-700">
            {r.reasons.map((reason, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-stone-400 text-xs mt-0.5">✦</span>
                <span className="font-medium">{translateReason(reason, lang)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Cautions */}
      {r.cautions.length > 0 && (
        <div className="mt-4 rounded-xl bg-amber-50/60 border border-amber-200/60 p-4">
          <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1.5">
            {t.cautionHeader}
          </h3>
          <ul className="space-y-1 text-xs text-amber-900">
            {r.cautions.map((caution, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-amber-500">•</span>
                <span className="font-medium">{translateCaution(caution, lang)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
