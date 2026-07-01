"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Plan, CapabilityScoreRecord, Quota, PlanRelation, ModelTierRecord } from "@/lib/types";

type DataType = "plans" | "apiOptions" | "scores" | "quotas" | "relations" | "modelTiers";
type EditableItem = Partial<Plan & Omit<CapabilityScoreRecord, "scores"> & Quota & PlanRelation> & {
  scores?: Record<string, number>;
};
type AdminPayload = {
  plans?: Plan[];
  apiOptions?: Plan[];
  scores?: CapabilityScoreRecord[];
  quotas?: Quota[];
  relations?: PlanRelation[];
  modelTiers?: ModelTierRecord[];
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "未知错误";
}

const ADMIN_ENABLED =
  process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_ENABLE_ADMIN === "1";

export default function AdminPage() {
  return ADMIN_ENABLED ? <AdminContent /> : <AdminDisabled />;
}

function AdminDisabled() {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-100">
      <div className="mx-auto max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-xl">
        <Link href="/" className="text-sm font-semibold text-blue-400 hover:text-blue-300">
          ← 返回推荐器
        </Link>
        <h1 className="mt-6 text-2xl font-black">数据管理后台已禁用</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          生产环境默认关闭本地 JSON 管理接口，避免公开站点的数据被直接写入。需要临时启用时，
          请同时设置 <code className="rounded bg-zinc-800 px-1.5 py-0.5">ENABLE_ADMIN_API=1</code> 和{" "}
          <code className="rounded bg-zinc-800 px-1.5 py-0.5">NEXT_PUBLIC_ENABLE_ADMIN=1</code>。
        </p>
      </div>
    </main>
  );
}

function AdminContent() {
  const [activeTab, setActiveTab] = useState<DataType>("plans");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Raw data from server
  const [plans, setPlans] = useState<Plan[]>([]);
  const [apiOptions, setApiOptions] = useState<Plan[]>([]);
  const [scores, setScores] = useState<CapabilityScoreRecord[]>([]);
  const [quotas, setQuotas] = useState<Quota[]>([]);
  const [relations, setRelations] = useState<PlanRelation[]>([]);
  const [modelTiers, setModelTiers] = useState<ModelTierRecord[]>([]);

  // Textarea state for modelTiers JSON edit
  const [jsonText, setJsonText] = useState<string>("");

  // Modal / Form state
  const [editingItem, setEditingItem] = useState<EditableItem | null>(null);
  const [isAddMode, setIsAddMode] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin");
      if (!res.ok) throw new Error("加载数据失败");
      const data = (await res.json()) as AdminPayload;
      const fetchedModelTiers = data.modelTiers || [];
      setPlans(data.plans || []);
      setApiOptions(data.apiOptions || []);
      setScores(data.scores || []);
      setQuotas(data.quotas || []);
      setRelations(data.relations || []);
      setModelTiers(fetchedModelTiers);
      setJsonText(JSON.stringify(fetchedModelTiers, null, 2));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Admin data must be loaded from the local JSON API after mount.
    void fetchData();
  }, [fetchData]);

  const showToast = (message: string, isError = false) => {
    if (isError) {
      setError(message);
      setTimeout(() => setError(null), 3000);
    } else {
      setSuccess(message);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const handleSave = async (type: DataType, updatedData: unknown[]) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, data: updatedData }),
      });
      if (!res.ok) throw new Error("保存数据失败");
      const result = (await res.json()) as { success?: boolean; error?: string };
      if (result.success) {
        showToast("保存成功！");
        // Refresh local lists
        if (type === "plans") setPlans(updatedData as Plan[]);
        if (type === "apiOptions") setApiOptions(updatedData as Plan[]);
        if (type === "scores") setScores(updatedData as CapabilityScoreRecord[]);
        if (type === "quotas") setQuotas(updatedData as Quota[]);
        if (type === "relations") setRelations(updatedData as PlanRelation[]);
        if (type === "modelTiers") {
          const tiers = updatedData as ModelTierRecord[];
          setModelTiers(tiers);
          setJsonText(JSON.stringify(tiers, null, 2));
        }
      } else {
        throw new Error(result.error || "未知错误");
      }
    } catch (err) {
      showToast(errorMessage(err), true);
    } finally {
      setSaving(false);
      setEditingItem(null);
      setIsAddMode(false);
    }
  };

  const handleEditClick = (item: EditableItem) => {
    setEditingItem(JSON.parse(JSON.stringify(item)) as EditableItem); // Deep clone
    setIsAddMode(false);
  };

  const handleAddClick = () => {
    setIsAddMode(true);
    if (activeTab === "plans" || activeTab === "apiOptions") {
      setEditingItem({
        id: "",
        provider: "",
        name: "",
        region: "GLOBAL",
        recommendationRole: activeTab === "plans" ? "primary_subscription" : "supplementary_api",
        category: activeTab === "plans" ? "chat_subscription" : "api_router",
        accessModes: ["api"],
        originalPrice: 0,
        originalCurrency: "USD",
        billingCycle: "monthly",
        priceStatus: "verified_official",
        sourceStatus: "official_url_verified",
        sourceUrl: "",
        lastCheckedAt: new Date().toISOString().split("T")[0],
        enabledForRecommendation: true,
      });
    } else if (activeTab === "scores") {
      setEditingItem({
        planId: "",
        scores: {
          frontend: 50,
          backend: 50,
          agentCoding: 50,
          debugging: 50,
          codeReview: 50,
          chineseWriting: 50,
          englishWriting: 50,
          research: 50,
          chat: 50,
          imageGeneration: 50,
          multimodal: 50,
          ecosystem: 50,
        },
        scoreConfidence: "high",
        scoreBasis: "manual",
      });
    } else if (activeTab === "quotas") {
      setEditingItem({
        planId: "",
        estimatedTextWorkloadCapacityMTokens: 100,
        quotaBasis: "estimated",
        quotaConfidence: "estimated_medium",
        cacheHitRateAssumption: 0.95,
        source: "community",
      });
    } else if (activeTab === "relations") {
      setEditingItem({
        planA: "",
        planB: "",
        overlapScore: 0,
        complementScore: 0,
        explanation: "",
      });
    }
  };

  const handleDelete = (index: number) => {
    if (!confirm("确定要删除此条记录吗？此操作在点击确认后会直接提交到服务端保存。")) return;

    if (activeTab === "plans") {
      const copy = [...plans];
      copy.splice(index, 1);
      handleSave("plans", copy);
    } else if (activeTab === "apiOptions") {
      const copy = [...apiOptions];
      copy.splice(index, 1);
      handleSave("apiOptions", copy);
    } else if (activeTab === "scores") {
      const copy = [...scores];
      copy.splice(index, 1);
      handleSave("scores", copy);
    } else if (activeTab === "quotas") {
      const copy = [...quotas];
      copy.splice(index, 1);
      handleSave("quotas", copy);
    } else if (activeTab === "relations") {
      const copy = [...relations];
      copy.splice(index, 1);
      handleSave("relations", copy);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    if (activeTab === "plans") {
      const list = [...plans];
      const item = editingItem as Plan;
      if (isAddMode) {
        if (list.some((x) => x.id === editingItem.id)) {
          alert("ID 已存在！");
          return;
        }
        list.push(item);
      } else {
        const idx = list.findIndex((x) => x.id === editingItem.id);
        if (idx !== -1) list[idx] = item;
      }
      handleSave("plans", list);
    } else if (activeTab === "apiOptions") {
      const list = [...apiOptions];
      const item = editingItem as Plan;
      if (isAddMode) {
        if (list.some((x) => x.id === editingItem.id)) {
          alert("ID 已存在！");
          return;
        }
        list.push(item);
      } else {
        const idx = list.findIndex((x) => x.id === editingItem.id);
        if (idx !== -1) list[idx] = item;
      }
      handleSave("apiOptions", list);
    } else if (activeTab === "scores") {
      const list = [...scores];
      const item = editingItem as CapabilityScoreRecord;
      if (isAddMode) {
        if (list.some((x) => x.planId === editingItem.planId)) {
          alert("该计划评分已存在！");
          return;
        }
        list.push(item);
      } else {
        const idx = list.findIndex((x) => x.planId === editingItem.planId);
        if (idx !== -1) list[idx] = item;
      }
      handleSave("scores", list);
    } else if (activeTab === "quotas") {
      const list = [...quotas];
      const item = editingItem as Quota;
      if (isAddMode) {
        if (list.some((x) => x.planId === editingItem.planId)) {
          alert("该计划额度配置已存在！");
          return;
        }
        list.push(item);
      } else {
        const idx = list.findIndex((x) => x.planId === editingItem.planId);
        if (idx !== -1) list[idx] = item;
      }
      handleSave("quotas", list);
    } else if (activeTab === "relations") {
      const list = [...relations];
      const item = editingItem as PlanRelation;
      if (isAddMode) {
        list.push(item);
      } else {
        // Match by planA and planB key
        const idx = list.findIndex(
          (x) =>
            (x.planA === editingItem.planA && x.planB === editingItem.planB) ||
            (x.planA === editingItem.planB && x.planB === editingItem.planA)
        );
        if (idx !== -1) list[idx] = item;
        else list.push(item);
      }
      handleSave("relations", list);
    }
  };

  return (
    <main className="flex-1 min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans antialiased selection:bg-blue-500 selection:text-white">
      {/* Background patterns */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(30,58,138,0.15),transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(88,28,135,0.1),transparent_50%)] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="h-8 w-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/25">
              推荐
            </span>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              SubPlan · 数据后台
            </h1>
          </div>
          <Link
            href="/"
            className="rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 text-sm font-medium transition-all shadow-sm flex items-center gap-1.5"
          >
            ← 返回前台
          </Link>
        </div>
      </header>

      {/* Content Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6 relative z-10">
        
        {/* Toast notifications */}
        {error && (
          <div className="fixed bottom-5 right-5 bg-red-900/80 border border-red-500 text-red-200 rounded-xl px-4 py-3 shadow-2xl backdrop-blur-md flex items-center gap-2 z-50">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="fixed bottom-5 right-5 bg-green-950/80 border border-green-500 text-green-200 rounded-xl px-4 py-3 shadow-2xl backdrop-blur-md flex items-center gap-2 z-50">
            <span>✅</span>
            <span>{success}</span>
          </div>
        )}

        {/* Tab switcher */}
        <div className="flex flex-wrap gap-2 p-1 bg-zinc-900 border border-zinc-800 rounded-xl max-w-max">
          <button
            onClick={() => { setActiveTab("plans"); setEditingItem(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "plans"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/10"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            订阅计划 (Plans)
          </button>
          <button
            onClick={() => { setActiveTab("apiOptions"); setEditingItem(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "apiOptions"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/10"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            API 选项 (APIs)
          </button>
          <button
            onClick={() => { setActiveTab("scores"); setEditingItem(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "scores"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/10"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            能力评分 (Scores)
          </button>
          <button
            onClick={() => { setActiveTab("quotas"); setEditingItem(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "quotas"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/10"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            额度配置 (Quotas)
          </button>
          <button
            onClick={() => { setActiveTab("relations"); setEditingItem(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "relations"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/10"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            互补/重叠 (Relations)
          </button>
          <button
            onClick={() => { setActiveTab("modelTiers"); setEditingItem(null); setJsonText(JSON.stringify(modelTiers, null, 2)); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "modelTiers"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/10"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            模型分档 (Model Tiers)
          </button>
        </div>

        {/* Action area */}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-zinc-300">
            {activeTab === "plans" && "普通订阅套餐管理"}
            {activeTab === "apiOptions" && "开发者 API 选项管理"}
            {activeTab === "scores" && "能力评分矩阵维护"}
            {activeTab === "quotas" && "用量与额度配置"}
            {activeTab === "relations" && "订阅套餐互补和重叠矩阵"}
            {activeTab === "modelTiers" && "模型能力分档维护 (v0.2 特性)"}
          </h2>
          {activeTab !== "modelTiers" && (
            <button
              onClick={handleAddClick}
              className="rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 text-sm font-semibold shadow-md shadow-blue-600/10 transition-all flex items-center gap-1"
            >
              <span>+</span> 新增数据
            </button>
          )}
        </div>

        {/* Data list view */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <div className="h-10 w-10 border-4 border-zinc-800 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="border border-zinc-800 bg-zinc-900/40 rounded-2xl overflow-hidden shadow-xl backdrop-blur-xl">
            {activeTab === "modelTiers" ? (
              <div className="p-6 space-y-4">
                <p className="text-xs text-zinc-400 leading-relaxed">
                  请在此以 JSON 数组格式直接编辑模型能力分档 (S/A/B/C/D)。点击下方按钮将进行语法验证并直接写入 <code>data/model-tiers.json</code>。
                </p>
                <textarea
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  className="w-full h-[60vh] rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 p-4 font-mono text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  spellCheck="false"
                />
                <div className="flex justify-end pt-2">
                  <button
                    onClick={async () => {
                      try {
                        const parsed = JSON.parse(jsonText);
                        if (!Array.isArray(parsed)) throw new Error("JSON 根节点必须是一个数组");
                        await handleSave("modelTiers", parsed);
                      } catch (err) {
                        alert(`JSON 解析错误: ${errorMessage(err)}`);
                      }
                    }}
                    disabled={saving}
                    className="rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 text-sm font-semibold transition-all disabled:opacity-50"
                  >
                    {saving ? "保存中..." : "保存并应用变更"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[60vh]">
                <table className="w-full text-left text-sm text-zinc-300">
                  <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 text-xs uppercase tracking-wider sticky top-0">
                    {activeTab === "plans" && (
                      <tr>
                        <th className="px-6 py-3.5">ID</th>
                        <th className="px-6 py-3.5">服务商</th>
                        <th className="px-6 py-3.5">名称</th>
                        <th className="px-6 py-3.5">地区</th>
                        <th className="px-6 py-3.5">价格</th>
                        <th className="px-6 py-3.5">计费周期</th>
                        <th className="px-6 py-3.5">推荐角色</th>
                        <th className="px-6 py-3.5">启用</th>
                        <th className="px-6 py-3.5 text-right">操作</th>
                      </tr>
                    )}
                    {activeTab === "apiOptions" && (
                      <tr>
                        <th className="px-6 py-3.5">ID</th>
                        <th className="px-6 py-3.5">服务商</th>
                        <th className="px-6 py-3.5">名称</th>
                        <th className="px-6 py-3.5">地区</th>
                        <th className="px-6 py-3.5">结算货币</th>
                        <th className="px-6 py-3.5">按量单价 (I/C/O)</th>
                        <th className="px-6 py-3.5">需要授权</th>
                        <th className="px-6 py-3.5">启用</th>
                        <th className="px-6 py-3.5 text-right">操作</th>
                      </tr>
                    )}
                    {activeTab === "scores" && (
                      <tr>
                        <th className="px-6 py-3.5">计划 ID</th>
                        <th className="px-6 py-3.5">后端 / 前端</th>
                        <th className="px-6 py-3.5">Agent / Debug</th>
                        <th className="px-6 py-3.5">写作 (中/英)</th>
                        <th className="px-6 py-3.5">研究 / 多模</th>
                        <th className="px-6 py-3.5">生图 / 聊天</th>
                        <th className="px-6 py-3.5">生态 / 审核</th>
                        <th className="px-6 py-3.5">置信度</th>
                        <th className="px-6 py-3.5 text-right">操作</th>
                      </tr>
                    )}
                    {activeTab === "quotas" && (
                      <tr>
                        <th className="px-6 py-3.5">计划 ID</th>
                        <th className="px-6 py-3.5">等效文本额度 (MTokens)</th>
                        <th className="px-6 py-3.5">置信度</th>
                        <th className="px-6 py-3.5">命中率假设</th>
                        <th className="px-6 py-3.5">依据 / 备注</th>
                        <th className="px-6 py-3.5 text-right">操作</th>
                      </tr>
                    )}
                    {activeTab === "relations" && (
                      <tr>
                        <th className="px-6 py-3.5">计划 A</th>
                        <th className="px-6 py-3.5">计划 B</th>
                        <th className="px-6 py-3.5">重叠惩罚分</th>
                        <th className="px-6 py-3.5">互补奖励分</th>
                        <th className="px-6 py-3.5">解释说明</th>
                        <th className="px-6 py-3.5 text-right">操作</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80">
                    {activeTab === "plans" &&
                      plans.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors">
                          <td className="px-6 py-4 font-mono font-medium text-blue-400">{item.id}</td>
                          <td className="px-6 py-4">{item.provider}</td>
                          <td className="px-6 py-4">{item.name}</td>
                          <td className="px-6 py-4">
                            <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300 border border-zinc-700">
                              {item.region}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {item.originalPrice} {item.originalCurrency}
                          </td>
                          <td className="px-6 py-4 text-zinc-400">{item.billingCycle}</td>
                          <td className="px-6 py-4 text-xs text-zinc-400 font-mono">{item.recommendationRole}</td>
                          <td className="px-6 py-4">
                            <span className={`h-2.5 w-2.5 rounded-full inline-block ${item.enabledForRecommendation ? 'bg-green-500' : 'bg-zinc-600'}`} />
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button onClick={() => handleEditClick(item)} className="text-blue-400 hover:text-blue-300">编辑</button>
                            <button onClick={() => handleDelete(idx)} className="text-zinc-500 hover:text-red-400">删除</button>
                          </td>
                        </tr>
                      ))}
                    {activeTab === "apiOptions" &&
                      apiOptions.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors">
                          <td className="px-6 py-4 font-mono font-medium text-blue-400">{item.id}</td>
                          <td className="px-6 py-4">{item.provider}</td>
                          <td className="px-6 py-4">{item.name}</td>
                          <td className="px-6 py-4">
                            <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300 border border-zinc-700">
                              {item.region}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-zinc-400">{item.originalCurrency}</td>
                          <td className="px-6 py-4 font-mono text-xs">
                            {item.pricesPerMToken
                              ? `${item.pricesPerMToken.inputCacheHit ?? '-'} / ${item.pricesPerMToken.inputCacheMiss ?? '-'} / ${item.pricesPerMToken.output ?? '-'}`
                              : "无价格配置"}
                          </td>
                          <td className="px-6 py-4 text-zinc-400">
                            {item.requiresUserAcceptsApiBilling ? "是" : "否"}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`h-2.5 w-2.5 rounded-full inline-block ${item.enabledForRecommendation ? 'bg-green-500' : 'bg-zinc-600'}`} />
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button onClick={() => handleEditClick(item)} className="text-blue-400 hover:text-blue-300">编辑</button>
                            <button onClick={() => handleDelete(idx)} className="text-zinc-500 hover:text-red-400">删除</button>
                          </td>
                        </tr>
                      ))}
                    {activeTab === "scores" &&
                      scores.map((item, idx) => (
                        <tr key={item.planId} className="hover:bg-zinc-800/30 transition-colors">
                          <td className="px-6 py-4 font-mono font-medium text-blue-400">{item.planId}</td>
                          <td className="px-6 py-4">
                            B: {item.scores.backend} / F: {item.scores.frontend}
                          </td>
                          <td className="px-6 py-4">
                            A: {item.scores.agentCoding} / D: {item.scores.debugging}
                          </td>
                          <td className="px-6 py-4 text-zinc-400">
                            中: {item.scores.chineseWriting} / 英: {item.scores.englishWriting}
                          </td>
                          <td className="px-6 py-4 text-zinc-400">
                            研: {item.scores.research} / 多: {item.scores.multimodal}
                          </td>
                          <td className="px-6 py-4 text-zinc-400">
                            图: {item.scores.imageGeneration} / 聊: {item.scores.chat}
                          </td>
                          <td className="px-6 py-4 text-zinc-400">
                            生态: {item.scores.ecosystem} / 审: {item.scores.codeReview}
                          </td>
                          <td className="px-6 py-4 text-xs font-mono">{item.scoreConfidence}</td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button onClick={() => handleEditClick(item)} className="text-blue-400 hover:text-blue-300">编辑</button>
                            <button onClick={() => handleDelete(idx)} className="text-zinc-500 hover:text-red-400">删除</button>
                          </td>
                        </tr>
                      ))}
                    {activeTab === "quotas" &&
                      quotas.map((item, idx) => (
                        <tr key={item.planId} className="hover:bg-zinc-800/30 transition-colors">
                          <td className="px-6 py-4 font-mono font-medium text-blue-400">{item.planId}</td>
                          <td className="px-6 py-4 font-semibold">
                            {item.estimatedTextWorkloadCapacityMTokens !== undefined
                              ? `${item.estimatedTextWorkloadCapacityMTokens} MTokens`
                              : "按量/无限"}
                          </td>
                          <td className="px-6 py-4 text-xs font-mono text-zinc-400">{item.quotaConfidence}</td>
                          <td className="px-6 py-4 text-zinc-400">{(item.cacheHitRateAssumption * 100).toFixed(0)}%</td>
                          <td className="px-6 py-4 max-w-xs truncate text-zinc-400 text-xs" title={item.notes || ''}>
                            {item.notes || "无"}
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button onClick={() => handleEditClick(item)} className="text-blue-400 hover:text-blue-300">编辑</button>
                            <button onClick={() => handleDelete(idx)} className="text-zinc-500 hover:text-red-400">删除</button>
                          </td>
                        </tr>
                      ))}
                    {activeTab === "relations" &&
                      relations.map((item, idx) => (
                        <tr key={`${item.planA}-${item.planB}`} className="hover:bg-zinc-800/30 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs">{item.planA}</td>
                          <td className="px-6 py-4 font-mono text-xs">{item.planB}</td>
                          <td className="px-6 py-4 text-red-400 font-semibold">-{item.overlapScore}</td>
                          <td className="px-6 py-4 text-green-400 font-semibold">+{item.complementScore}</td>
                          <td className="px-6 py-4 text-xs text-zinc-400 max-w-sm truncate" title={item.explanation}>{item.explanation}</td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button onClick={() => handleEditClick(item)} className="text-blue-400 hover:text-blue-300">编辑</button>
                            <button onClick={() => handleDelete(idx)} className="text-zinc-500 hover:text-red-400">删除</button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Modal / Form Edit Layer */}
        {editingItem && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
              <div className="px-6 py-4 bg-zinc-800/60 border-b border-zinc-850 flex items-center justify-between">
                <h3 className="font-bold text-zinc-100">
                  {isAddMode ? "新增数据记录" : "编辑数据记录"} ({activeTab.toUpperCase()})
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="text-zinc-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                {/* 1. Plans Form fields */}
                {(activeTab === "plans" || activeTab === "apiOptions") && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide">ID (不可变更)</label>
                      <input
                        type="text"
                        value={editingItem.id}
                        disabled={!isAddMode}
                        onChange={(e) => setEditingItem({ ...editingItem, id: e.target.value })}
                        className="mt-1 block w-full rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 px-3 py-2 text-sm disabled:opacity-50 disabled:bg-zinc-950 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide">服务商 (Provider)</label>
                      <input
                        type="text"
                        value={editingItem.provider}
                        onChange={(e) => setEditingItem({ ...editingItem, provider: e.target.value })}
                        className="mt-1 block w-full rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide">显示名称</label>
                      <input
                        type="text"
                        value={editingItem.name}
                        onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                        className="mt-1 block w-full rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide">使用地区</label>
                      <select
                        value={editingItem.region}
                        onChange={(e) => setEditingItem({ ...editingItem, region: e.target.value })}
                        className="mt-1 block w-full rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="CN">中国 (CN)</option>
                        <option value="US">美国 (US)</option>
                        <option value="JP">日本 (JP)</option>
                        <option value="GLOBAL">全球 (GLOBAL)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide">结算货币</label>
                      <select
                        value={editingItem.originalCurrency}
                        onChange={(e) => setEditingItem({ ...editingItem, originalCurrency: e.target.value })}
                        className="mt-1 block w-full rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="CNY">人民币 (CNY)</option>
                        <option value="USD">美元 (USD)</option>
                        <option value="EUR">欧元 (EUR)</option>
                        <option value="JPY">日元 (JPY)</option>
                      </select>
                    </div>

                    {activeTab === "plans" ? (
                      <>
                        <div>
                          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide">订阅价格</label>
                          <input
                            type="number"
                            step="0.01"
                            value={editingItem.originalPrice}
                            onChange={(e) => setEditingItem({ ...editingItem, originalPrice: parseFloat(e.target.value) || 0 })}
                            className="mt-1 block w-full rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide">付费方式/周期</label>
                          <select
                            value={editingItem.billingCycle}
                            onChange={(e) => setEditingItem({ ...editingItem, billingCycle: e.target.value as Plan["billingCycle"] })}
                            className="mt-1 block w-full rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          >
                            <option value="monthly">月付 (monthly)</option>
                            <option value="annual">年付 (annual)</option>
                            <option value="free">免费 (free)</option>
                            <option value="pay_as_you_go">按量付费 (pay_as_you_go)</option>
                          </select>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="sm:col-span-2 border border-zinc-800 bg-zinc-950 p-4 rounded-xl space-y-3">
                          <span className="block text-xs font-bold text-zinc-400 uppercase tracking-wide">API 按量价格配置 (每 MToken)</span>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="text-[10px] text-zinc-500 font-bold uppercase block">Cache Hit 输入</label>
                              <input
                                type="number"
                                step="0.000001"
                                value={editingItem.pricesPerMToken?.inputCacheHit ?? 0}
                                onChange={(e) => setEditingItem({
                                  ...editingItem,
                                  pricesPerMToken: {
                                    ...(editingItem.pricesPerMToken || {}),
                                    inputCacheHit: parseFloat(e.target.value) || 0
                                  }
                                })}
                                className="mt-1 block w-full rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 px-3 py-2 text-xs focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-zinc-500 font-bold uppercase block">Cache Miss 输入</label>
                              <input
                                type="number"
                                step="0.000001"
                                value={editingItem.pricesPerMToken?.inputCacheMiss ?? 0}
                                onChange={(e) => setEditingItem({
                                  ...editingItem,
                                  pricesPerMToken: {
                                    ...(editingItem.pricesPerMToken || {}),
                                    inputCacheMiss: parseFloat(e.target.value) || 0
                                  }
                                })}
                                className="mt-1 block w-full rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 px-3 py-2 text-xs focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-zinc-500 font-bold uppercase block">Output 输出</label>
                              <input
                                type="number"
                                step="0.000001"
                                value={editingItem.pricesPerMToken?.output ?? 0}
                                onChange={(e) => setEditingItem({
                                  ...editingItem,
                                  pricesPerMToken: {
                                    ...(editingItem.pricesPerMToken || {}),
                                    output: parseFloat(e.target.value) || 0
                                  }
                                })}
                                className="mt-1 block w-full rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 px-3 py-2 text-xs focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide">官方数据链接</label>
                      <input
                        type="url"
                        value={editingItem.sourceUrl}
                        onChange={(e) => setEditingItem({ ...editingItem, sourceUrl: e.target.value })}
                        className="mt-1 block w-full rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-6 pt-6">
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-300">
                        <input
                          type="checkbox"
                          checked={editingItem.enabledForRecommendation}
                          onChange={(e) => setEditingItem({ ...editingItem, enabledForRecommendation: e.target.checked })}
                          className="h-4 w-4 rounded bg-zinc-800 border-zinc-700 text-blue-600 focus:ring-0 focus:ring-offset-0"
                        />
                        启用该组合推荐
                      </label>
                      {activeTab === "apiOptions" && (
                        <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-300">
                          <input
                            type="checkbox"
                            checked={editingItem.requiresUserAcceptsApiBilling}
                            onChange={(e) => setEditingItem({ ...editingItem, requiresUserAcceptsApiBilling: e.target.checked })}
                            className="h-4 w-4 rounded bg-zinc-800 border-zinc-700 text-blue-600 focus:ring-0 focus:ring-offset-0"
                          />
                          必须启用 API 计费才显示
                        </label>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. Scores Form fields */}
                {activeTab === "scores" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide">计划 ID</label>
                      <input
                        type="text"
                        value={editingItem.planId}
                        disabled={!isAddMode}
                        onChange={(e) => setEditingItem({ ...editingItem, planId: e.target.value })}
                        placeholder="与 Plan ID 完全匹配"
                        className="mt-1 block w-full rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 px-3 py-2 text-sm disabled:opacity-50 disabled:bg-zinc-950 focus:outline-none"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-950 p-4 rounded-xl">
                      {Object.keys(editingItem.scores || {}).map((key) => (
                        <div key={key}>
                          <label className="text-[10px] text-zinc-400 font-bold uppercase truncate block">{key}</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={(editingItem.scores as Record<string, number> | undefined)?.[key] ?? 0}
                            onChange={(e) => {
                              const sc = { ...((editingItem.scores as Record<string, number> | undefined) ?? {}) };
                              sc[key] = parseInt(e.target.value) || 0;
                              setEditingItem({ ...editingItem, scores: sc });
                            }}
                            className="mt-1 block w-full rounded-lg bg-zinc-850 border border-zinc-750 text-zinc-100 px-2 py-1 text-sm focus:outline-none"
                            required
                          />
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide">评分可信度 (Confidence)</label>
                        <select
                          value={editingItem.scoreConfidence}
                          onChange={(e) => setEditingItem({ ...editingItem, scoreConfidence: e.target.value })}
                          className="mt-1 block w-full rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 px-3 py-2 text-sm focus:outline-none"
                        >
                          <option value="high">高可信度 (official)</option>
                          <option value="medium">中可信度 (verified)</option>
                          <option value="low">低可信度 (estimate)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide">评分依据/备注</label>
                        <input
                          type="text"
                          value={editingItem.scoreBasis || ""}
                          onChange={(e) => setEditingItem({ ...editingItem, scoreBasis: e.target.value })}
                          className="mt-1 block w-full rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 px-3 py-2 text-sm focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Quotas Form fields */}
                {activeTab === "quotas" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide">计划 ID</label>
                      <input
                        type="text"
                        value={editingItem.planId}
                        disabled={!isAddMode}
                        onChange={(e) => setEditingItem({ ...editingItem, planId: e.target.value })}
                        placeholder="与 Plan ID 完全匹配"
                        className="mt-1 block w-full rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 px-3 py-2 text-sm disabled:opacity-50 disabled:bg-zinc-950 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide">文本额度 (MTokens 等效值/月)</label>
                      <input
                        type="number"
                        value={editingItem.estimatedTextWorkloadCapacityMTokens ?? ""}
                        onChange={(e) => setEditingItem({
                          ...editingItem,
                          estimatedTextWorkloadCapacityMTokens: e.target.value === "" ? null : parseInt(e.target.value) || 0
                        })}
                        placeholder="如为按量计费，请填空或0"
                        className="mt-1 block w-full rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 px-3 py-2 text-sm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide">缓存命中率估算假设</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        value={editingItem.cacheHitRateAssumption}
                        onChange={(e) => setEditingItem({ ...editingItem, cacheHitRateAssumption: parseFloat(e.target.value) || 0.95 })}
                        className="mt-1 block w-full rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 px-3 py-2 text-sm focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide">可信度</label>
                      <select
                        value={editingItem.quotaConfidence}
                        onChange={(e) => setEditingItem({ ...editingItem, quotaConfidence: e.target.value })}
                        className="mt-1 block w-full rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 px-3 py-2 text-sm focus:outline-none"
                      >
                        <option value="official">官方固定数据 (official)</option>
                        <option value="estimated_high">高度匹配的估算值 (high)</option>
                        <option value="estimated_medium">一般社区估算 (medium)</option>
                        <option value="estimated_low">暂无确认依据 (low)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide">额度依据/来源</label>
                      <input
                        type="text"
                        value={editingItem.quotaBasis}
                        onChange={(e) => setEditingItem({ ...editingItem, quotaBasis: e.target.value })}
                        className="mt-1 block w-full rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 px-3 py-2 text-sm focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide">详细注意事项/备注</label>
                      <textarea
                        value={editingItem.notes || ""}
                        onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
                        rows={2}
                        className="mt-1 block w-full rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 px-3 py-2 text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* 4. Relations Form fields */}
                {activeTab === "relations" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide">计划 A ID</label>
                      <input
                        type="text"
                        value={editingItem.planA}
                        onChange={(e) => setEditingItem({ ...editingItem, planA: e.target.value })}
                        placeholder="如 chatgpt_plus"
                        className="mt-1 block w-full rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 px-3 py-2 text-sm focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide">计划 B ID</label>
                      <input
                        type="text"
                        value={editingItem.planB}
                        onChange={(e) => setEditingItem({ ...editingItem, planB: e.target.value })}
                        placeholder="如 cursor_pro"
                        className="mt-1 block w-full rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 px-3 py-2 text-sm focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide">重叠扣分 (0-100)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editingItem.overlapScore}
                        onChange={(e) => setEditingItem({ ...editingItem, overlapScore: parseInt(e.target.value) || 0 })}
                        className="mt-1 block w-full rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 px-3 py-2 text-sm focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide">互补加分 (0-100)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editingItem.complementScore}
                        onChange={(e) => setEditingItem({ ...editingItem, complementScore: parseInt(e.target.value) || 0 })}
                        className="mt-1 block w-full rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 px-3 py-2 text-sm focus:outline-none"
                        required
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide">推荐关系解释说明</label>
                      <textarea
                        value={editingItem.explanation}
                        onChange={(e) => setEditingItem({ ...editingItem, explanation: e.target.value })}
                        rows={3}
                        placeholder="阐述两款订阅组合在一起的互补表现或重复浪费原因..."
                        className="mt-1 block w-full rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 px-3 py-2 text-sm focus:outline-none"
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-zinc-855 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 text-sm font-medium transition-all"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 text-sm font-semibold shadow-md shadow-blue-600/10 transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        保存中...
                      </>
                    ) : (
                      "确认并保存"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-850 py-6 mt-10 text-center text-xs text-zinc-500">
        <p>SubPlan 管理控制台 v0.2 · 高智能模型分档在线编辑支持 · © 2026</p>
      </footer>
    </main>
  );
}
