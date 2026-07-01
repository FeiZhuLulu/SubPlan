"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getAllPlans, presets } from "@/lib/data";
import type { CapabilityKey } from "@/lib/types";

const ADD_ONS: { id: CapabilityKey | string; label: string; icon: string }[] = [
  { id: "agentCoding", label: "Agent 自动编程", icon: "🤖" },
  { id: "chineseWriting", label: "中文内容写作", icon: "✍️" },
  { id: "englishWriting", label: "英文文档撰写", icon: "🌐" },
  { id: "imageGeneration", label: "AI 图像生成", icon: "🎨" },
  { id: "multimodal", label: "多模态理解", icon: "👁️" },
  { id: "research", label: "深度文献研究", icon: "🔍" },
  { id: "mobileExperience", label: "移动端适配体验", icon: "📱" },
  { id: "ideIntegration", label: "IDE 编辑器集成", icon: "💻" },
];

export default function RecommendForm() {
  const router = useRouter();
  const existingPlanOptions = getAllPlans()
    .filter((plan) => plan.enabledForRecommendation && plan.recommendationRole === "primary_subscription")
    .slice()
    .sort((a, b) => `${a.provider} ${a.name}`.localeCompare(`${b.provider} ${b.name}`));
  const [budget, setBudget] = useState<string>("200");
  const [budgetTolerance, setBudgetTolerance] = useState<string>("normal");
  const [usage, setUsage] = useState<string>("500");
  const [primary, setPrimary] = useState<string>("backend_main_frontend_light");
  const [secondary, setSecondary] = useState<string>("none");
  const [region, setRegion] = useState<string>("CN");
  const [acceptsApi, setAcceptsApi] = useState<boolean>(false);
  const [hasForeignCard, setHasForeignCard] = useState<boolean>(false);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [existingPlanIds, setExistingPlanIds] = useState<string[]>([]);
  const [highIntelRatio, setHighIntelRatio] = useState<string>("medium");

  // Estimator Modal State
  const [showEstimator, setShowEstimator] = useState(false);
  const [estCodingTime, setEstCodingTime] = useState<string>("1-3");
  const [estConversations, setEstConversations] = useState<string>("5-15");
  const [estAgent, setEstAgent] = useState<boolean>(false);
  const [estLongFiles, setEstLongFiles] = useState<boolean>(false);
  const [estDebugging, setEstDebugging] = useState<boolean>(false);

  // Calculate live estimation in modal
  const getEstimatedValue = () => {
    let base = 0;
    // Coding time base
    if (estCodingTime === "0") base += 0;
    else if (estCodingTime === "<1") base += 50;
    else if (estCodingTime === "1-3") base += 150;
    else if (estCodingTime === "3-5") base += 400;
    else if (estCodingTime === "5+") base += 800;

    // Chat base
    if (estConversations === "<5") base += 20;
    else if (estConversations === "5-15") base += 100;
    else if (estConversations === "15-30") base += 250;
    else if (estConversations === "30+") base += 600;

    if (base === 0) return 10; // floor

    // Multipliers
    let multiplier = 1.0;
    if (estAgent) multiplier *= 1.8;
    if (estLongFiles) multiplier *= 1.5;
    if (estDebugging) multiplier *= 1.3;

    return Math.round(base * multiplier);
  };

  const applyEstimation = () => {
    setUsage(getEstimatedValue().toString());
    setShowEstimator(false);
  };

  const toggleAddOn = (id: string) => {
    setSelectedAddOns((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleExistingPlan = (id: string) => {
    setExistingPlanIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set("budget", budget);
    params.set("tolerance", budgetTolerance);
    params.set("usage", usage);
    params.set("intelligence", highIntelRatio);
    params.set("primary", primary);
    params.set("secondary", secondary);
    params.set("region", region);
    params.set("api", acceptsApi ? "1" : "0");
    params.set("card", hasForeignCard ? "1" : "0");
    if (selectedAddOns.length > 0) {
      params.set("addons", selectedAddOns.join(","));
    }
    if (existingPlanIds.length > 0) {
      params.set("existing", existingPlanIds.join(","));
    }
    router.push(`/result?${params.toString()}`);
  };

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-2xl rounded-3xl bg-white/80 p-6 shadow-xl ring-1 ring-zinc-200/50 backdrop-blur-md sm:p-8 relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/5"
      >
        {/* Glow effect */}
        <div className="absolute -right-32 -top-32 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-32 -bottom-32 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 relative z-10">
          
          {/* Budget input */}
          <div className="sm:col-span-2 group">
            <label className="block text-sm font-semibold text-zinc-700 group-hover:text-blue-600 transition-colors">
              月预算（人民币 / 元）
            </label>
            <div className="mt-2 relative rounded-xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <span className="text-zinc-400 sm:text-sm">¥</span>
              </div>
              <input
                type="number"
                min={0}
                step="any"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="block w-full pl-8 pr-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50/50 text-zinc-900 transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:outline-none"
                placeholder="200"
                required
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-zinc-700">预算宽松度</label>
            <select
              value={budgetTolerance}
              onChange={(e) => setBudgetTolerance(e.target.value)}
              className="mt-2 block w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50/50 text-zinc-900 transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:outline-none"
            >
              <option value="strict">严格不超预算</option>
              <option value="normal">默认略超预算（15%）</option>
              <option value="flexible">明显更好可超一点（25%）</option>
            </select>
          </div>

          {/* Quota input */}
          <div className="sm:col-span-2">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-semibold text-zinc-700">
                月度用量需求（MTokens 等效额度/月）
              </label>
              <button
                type="button"
                onClick={() => setShowEstimator(true)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/80 px-2.5 py-1 rounded-md transition-colors"
              >
                📊 不知道用量？点击估算
              </button>
            </div>
            <input
              type="number"
              min={1}
              step="any"
              value={usage}
              onChange={(e) => setUsage(e.target.value)}
              className="mt-2 block w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50/50 text-zinc-900 transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:outline-none"
              placeholder="500"
              required
            />
            <p className="mt-2 text-xs text-zinc-400">
              用量估算默认按 95% 缓存命中率计算。推荐引擎会在额度分配中智能匹配。
            </p>
          </div>

          {/* High Intelligence Ratio Segmented Selector */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-zinc-700">
              高智能模型需求比例 (核心复杂任务)
            </label>
            <div className="mt-2 grid grid-cols-4 gap-2 p-1 bg-zinc-100/50 border border-zinc-200/50 rounded-2xl">
              {[
                { id: "low", label: "低 (20%)", desc: "轻度智能/润色" },
                { id: "medium", label: "中 (50%)", desc: "代码/问答混合" },
                { id: "high", label: "高 (80%)", desc: "复杂推理/开发" },
                { id: "extreme", label: "极高 (95%)", desc: "深度智能依赖" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setHighIntelRatio(item.id)}
                  className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
                    highIntelRatio === item.id
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/10"
                      : "text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50/50"
                  }`}
                >
                  <span>{item.label}</span>
                  <span className={`text-[9px] font-medium leading-none ${highIntelRatio === item.id ? "text-blue-100" : "text-zinc-400"}`}>
                    {item.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Primary Use Case */}
          <div>
            <label className="block text-sm font-semibold text-zinc-700">主要用途</label>
            <select
              value={primary}
              onChange={(e) => setPrimary(e.target.value)}
              className="mt-2 block w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50/50 text-zinc-900 transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:outline-none"
            >
              {presets.primaryUseCases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Secondary Use Case */}
          <div>
            <label className="block text-sm font-semibold text-zinc-700">次要用途</label>
            <select
              value={secondary}
              onChange={(e) => setSecondary(e.target.value)}
              className="mt-2 block w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50/50 text-zinc-900 transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:outline-none"
            >
              {presets.secondaryUseCases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Region */}
          <div>
            <label className="block text-sm font-semibold text-zinc-700">所在地区</label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="mt-2 block w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50/50 text-zinc-900 transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:outline-none"
            >
              <option value="CN">🇨🇳 中国 (CN)</option>
              <option value="US">🇺🇸 美国 (US)</option>
              <option value="JP">🇯🇵 日本 (JP)</option>
              <option value="GLOBAL">🌐 全球 (GLOBAL)</option>
            </select>
          </div>

          {/* Checklist options */}
          <div className="flex flex-col justify-center gap-3 bg-zinc-50/50 border border-zinc-100 rounded-xl p-4 mt-2">
            <label className="flex items-center gap-2.5 text-sm font-medium text-zinc-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={acceptsApi}
                onChange={(e) => setAcceptsApi(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
              />
              接受 API 计费计价方式
            </label>
            <label className="flex items-center gap-2.5 text-sm font-medium text-zinc-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasForeignCard}
                onChange={(e) => setHasForeignCard(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
              />
              持有支持境外支付的外币卡
            </label>
          </div>
        </div>

        <div id="existing-subscriptions" className="mt-8 relative z-10 scroll-mt-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <span className="block text-sm font-semibold text-zinc-700">已有订阅</span>
              <p className="mt-1 text-xs text-zinc-400">
                选择你已经在付费或稳定使用的计划，推荐结果会标记“已拥有/建议新增”。
              </p>
            </div>
            {existingPlanIds.length > 0 && (
              <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                已选 {existingPlanIds.length}
              </span>
            )}
          </div>
          <div className="mt-3 max-h-44 overflow-y-auto rounded-2xl border border-zinc-100 bg-zinc-50/40 p-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {existingPlanOptions.map((plan) => {
                const active = existingPlanIds.includes(plan.id);
                return (
                  <button
                    key={plan.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleExistingPlan(plan.id)}
                    className={`rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                      active
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                        : "border-zinc-200 bg-white/60 text-zinc-600 hover:border-zinc-300 hover:bg-white"
                    }`}
                  >
                    <span className="block truncate">{plan.name}</span>
                    <span className="block truncate text-[10px] font-medium opacity-70">
                      {plan.provider}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Add ons */}
        <div className="mt-8 relative z-10">
          <span className="block text-sm font-semibold text-zinc-700">附加能力需求</span>
          <div className="mt-3 flex flex-wrap gap-2.5">
            {ADD_ONS.map((addOn) => {
              const active = selectedAddOns.includes(addOn.id);
              return (
                <button
                  key={addOn.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleAddOn(addOn.id)}
                  className={`rounded-xl border px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    active
                      ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                      : "border-zinc-200/80 bg-zinc-50/30 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
                  }`}
                >
                  <span>{addOn.icon}</span>
                  <span>{addOn.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit */}
        <div className="mt-8 relative z-10">
          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-5 py-4 text-base font-bold text-white shadow-lg shadow-blue-500/20 transition-all active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
          >
            📊 分析并生成订阅推荐组合
          </button>
        </div>
      </form>

      {/* Estimator Modal Dialog */}
      {showEstimator && (
        <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-zinc-100 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="font-bold text-zinc-900 flex items-center gap-1.5">
                <span>📊</span> AI 用量估算模型
              </h3>
              <button
                type="button"
                onClick={() => setShowEstimator(false)}
                className="text-zinc-400 hover:text-zinc-600 font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Question 1 */}
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">1. 每日使用 AI 辅助开发时长</label>
                <div className="mt-2 grid grid-cols-5 gap-1.5">
                  {[
                    { id: "0", label: "无" },
                    { id: "<1", label: "<1小时" },
                    { id: "1-3", label: "1-3小时" },
                    { id: "3-5", label: "3-5小时" },
                    { id: "5+", label: "5小时+" },
                  ].map((x) => (
                    <button
                      key={x.id}
                      type="button"
                      onClick={() => setEstCodingTime(x.id)}
                      className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
                        estCodingTime === x.id
                          ? "border-blue-500 bg-blue-50/50 text-blue-700"
                          : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                      }`}
                    >
                      {x.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question 2 */}
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">2. 每日对话与问答频次</label>
                <div className="mt-2 grid grid-cols-4 gap-1.5">
                  {[
                    { id: "<5", label: "<5轮" },
                    { id: "5-15", label: "5-15轮" },
                    { id: "15-30", label: "15-30轮" },
                    { id: "30+", label: "30轮+" },
                  ].map((x) => (
                    <button
                      key={x.id}
                      type="button"
                      onClick={() => setEstConversations(x.id)}
                      className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
                        estConversations === x.id
                          ? "border-blue-500 bg-blue-50/50 text-blue-700"
                          : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                      }`}
                    >
                      {x.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Switches */}
              <div className="border border-zinc-100 bg-zinc-50/40 p-4 rounded-2xl space-y-3">
                <span className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">加成调节因子</span>
                <div className="flex flex-col gap-3">
                  <label className="flex items-center justify-between text-sm text-zinc-700 font-semibold cursor-pointer">
                    <span className="flex flex-col">
                      <span>使用 Multi-file Agent 自动改项目</span>
                      <span className="text-[10px] text-zinc-400 font-normal">多文件分析与大规模修改 (x1.8)</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={estAgent}
                      onChange={(e) => setEstAgent(e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                  <label className="flex items-center justify-between text-sm text-zinc-700 font-semibold cursor-pointer border-t border-zinc-100 pt-3">
                    <span className="flex flex-col">
                      <span>经常上传大文件 / 长代码库</span>
                      <span className="text-[10px] text-zinc-400 font-normal">经常引入大量上下文进行推理 (x1.5)</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={estLongFiles}
                      onChange={(e) => setEstLongFiles(e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                  <label className="flex items-center justify-between text-sm text-zinc-700 font-semibold cursor-pointer border-t border-zinc-100 pt-3">
                    <span className="flex flex-col">
                      <span>多轮交互排错与复杂排查</span>
                      <span className="text-[10px] text-zinc-400 font-normal">高频次且长反馈的连续排错工作流 (x1.3)</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={estDebugging}
                      onChange={(e) => setEstDebugging(e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                </div>
              </div>

              {/* Estimate results */}
              <div className="bg-blue-600 border border-blue-500 text-white p-5 rounded-2xl flex items-center justify-between shadow-lg shadow-blue-600/10">
                <div>
                  <span className="text-xs font-semibold opacity-90 block">预计等效用量需求</span>
                  <span className="text-2xl font-black">{getEstimatedValue()} MTokens</span>
                  <span className="text-xs opacity-75 font-medium">/月</span>
                </div>
                <span className="text-xs border border-white/20 bg-white/10 px-3 py-1.5 rounded-lg text-center backdrop-blur-sm">
                  按 95% 缓存计算
                </span>
              </div>
            </div>

            <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowEstimator(false)}
                className="rounded-xl bg-zinc-200 hover:bg-zinc-300 text-zinc-700 px-4 py-2.5 text-sm font-semibold transition-all"
              >
                取消
              </button>
              <button
                type="button"
                onClick={applyEstimation}
                className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 text-sm font-semibold transition-all shadow-md shadow-blue-600/10"
              >
                应用估算用量
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
