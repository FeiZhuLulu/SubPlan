"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatPriceCny } from "@/lib/budget";
import { presets } from "@/lib/data";
import type { CapabilityKey, RecommendResponse, ScoredCombo } from "@/lib/types";

function coverageLabel(status: ScoredCombo["coverageStatus"]) {
  if (status === "sufficient") return "覆盖充足";
  if (status === "tight") return "额度紧凑";
  return "覆盖不足";
}

function budgetLabel(status: ScoredCombo["budgetStatus"]) {
  if (status === "within") return "预算内";
  if (status === "slightlyOver") return "略超预算";
  return "超出预算";
}

function existingPriceCny(result: ScoredCombo) {
  return result.combo.totalPriceCny - result.combo.newPriceCny;
}

function formatQuota(value: number) {
  if (value >= 1000) return `${Math.round(value).toLocaleString()} MTokens`;
  return `${Math.round(value)} MTokens`;
}

function usageEstimateText(result: ScoredCombo) {
  const planQuotas = result.combo.plans
    .filter((plan) => plan.textQuota > 0)
    .map((plan) => `${plan.name} 约 ${formatQuota(plan.textQuota)}`)
    .join(" / ");

  const detail = planQuotas ? `，单项估算：${planQuotas}` : "";
  return `额度估算约 ${formatQuota(result.combo.totalTextQuota)}${detail}。来源为社区统计与 AI 估算，不承诺 100% 准确。`;
}

function ComboCard({ result, badge }: { result: ScoredCombo; badge?: string }) {
  return (
    <article className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl shadow-zinc-100">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {badge && (
            <span className="mb-2 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
              {badge}
            </span>
          )}
          <h2 className="text-xl font-extrabold text-zinc-900">
            {result.combo.plans.map((plan) => plan.name).join(" + ")}
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {result.combo.plans.map((plan) => (
              <span
                key={plan.id}
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
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
                    : "建议新增"} · {plan.provider} · {formatPriceCny(plan.priceCny)}
              </span>
            ))}
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-zinc-900">
            {formatPriceCny(result.combo.totalPriceCny)}
            <span className="text-xs font-semibold text-zinc-400"> /月</span>
          </p>
          {result.combo.newPriceCny !== result.combo.totalPriceCny && (
            <p className="text-xs font-bold text-zinc-400">
              已有 {formatPriceCny(existingPriceCny(result))} · 新增 {formatPriceCny(result.combo.newPriceCny)}
            </p>
          )}
          <p className="text-xs font-bold text-zinc-400">
            约 {Math.round(result.combo.totalTextQuota)} MTokens
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl bg-zinc-50 p-3">
          <p className="text-xs font-bold text-zinc-400">能力分</p>
          <p className="text-lg font-black text-zinc-900">{result.capabilityScore.toFixed(1)}</p>
        </div>
        <div className="rounded-2xl bg-zinc-50 p-3">
          <p className="text-xs font-bold text-zinc-400">综合分</p>
          <p className="text-lg font-black text-blue-700">{result.finalScore.toFixed(1)}</p>
        </div>
        <div className="rounded-2xl bg-zinc-50 p-3">
          <p className="text-xs font-bold text-zinc-400">覆盖率</p>
          <p className="text-lg font-black text-zinc-900">
            {(result.combo.usageCoverage * 100).toFixed(0)}%
          </p>
          <p className="text-xs font-semibold text-zinc-500">{coverageLabel(result.coverageStatus)}</p>
        </div>
        <div className="rounded-2xl bg-zinc-50 p-3">
          <p className="text-xs font-bold text-zinc-400">预算</p>
          <p className="text-sm font-bold text-zinc-800">{budgetLabel(result.budgetStatus)}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {Object.entries(result.capabilityBreakdown)
          .sort((a, b) => b[1].allocated - a[1].allocated)
          .map(([capability, info]) => (
            <div key={capability} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-700">
                <span>{presets.capabilityLabels[capability as CapabilityKey] ?? capability}</span>
                <span>{Math.round(info.allocated)} MTokens</span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                主要由 <strong>{info.primaryPlan}</strong> 承担，能力分 {info.score}
              </p>
            </div>
          ))}
      </div>

      {(result.reasons.length > 0 || result.combo.totalTextQuota > 0) && (
        <ul className="mt-5 space-y-2 text-sm font-medium text-zinc-700">
          {result.reasons.map((reason) => (
            <li key={reason}>• {reason}</li>
          ))}
          {result.combo.totalTextQuota > 0 && <li>• {usageEstimateText(result)}</li>}
        </ul>
      )}

      {result.cautions.length > 0 && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-medium text-amber-800">
          {result.cautions.map((caution) => (
            <p key={caution}>• {caution}</p>
          ))}
        </div>
      )}
    </article>
  );
}

export default function ResultClient() {
  const searchParams = useSearchParams();
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
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-900 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
          <Link
            href="/#existing-subscriptions"
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-bold text-blue-700 shadow-sm"
          >
            ← 重新输入需求
          </Link>
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            {data?.dataVersion ?? "v0.1"}
          </span>
        </div>

        <section>
          <h1 className="text-3xl font-extrabold tracking-tight">SubPlan 智能订阅组合推荐</h1>
          <p className="mt-2 text-sm font-medium text-zinc-500">
            推荐结果通过 `/api/recommend` 计算，按预算、用量和能力需求进行额度约束评分。
          </p>
        </section>

        {loading && (
          <div className="rounded-3xl border border-zinc-200 bg-white p-8 text-sm font-bold text-zinc-500">
            正在计算推荐组合...
          </div>
        )}

        {error && (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && results.length === 0 && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm font-medium text-amber-900">
            未找到符合预算和额度约束的组合。可以提高预算、降低用量，或开启 API 计费补位后重试。
            如果选择了已有订阅，它们也会计入总预算。
          </div>
        )}

        {!loading && !error && top && (
          <div className="space-y-8">
            <section className="space-y-3">
              <h2 className="text-lg font-extrabold">最优推荐方案</h2>
              <ComboCard result={top} badge="最推荐" />
            </section>

            {budgetPick && budgetPick !== top && (
              <section className="space-y-3">
                <h2 className="text-lg font-extrabold">量大管饱备选</h2>
                <ComboCard result={budgetPick} badge="量大" />
              </section>
            )}

            {performancePick && performancePick !== top && performancePick !== budgetPick && (
              <section className="space-y-3">
                <h2 className="text-lg font-extrabold">高性能强力组合</h2>
                <ComboCard result={performancePick} badge="高性能" />
              </section>
            )}

            {alternatives.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-lg font-extrabold">其它候选组合</h2>
                <div className="space-y-5">
                  {alternatives.map((result) => (
                    <ComboCard key={result.combo.plans.map((plan) => plan.id).join("-")} result={result} />
                  ))}
                </div>
              </section>
            )}

            {data?.assumptions.length ? (
              <div className="rounded-3xl border border-zinc-200 bg-white p-5 text-xs font-medium leading-relaxed text-zinc-500">
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
