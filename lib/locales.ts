import type { CapabilityKey } from "./types";

export type Locale = "zh" | "en";

export const CAPABILITY_LABELS_EN: Record<CapabilityKey | string, string> = {
  frontend: "Frontend Dev",
  backend: "Backend Dev",
  agentCoding: "Agent Coding",
  debugging: "Debugging",
  codeReview: "Code Review",
  chineseWriting: "Chinese Writing",
  englishWriting: "English Writing",
  research: "Research",
  chat: "General Chat",
  imageGeneration: "Image Gen",
  multimodal: "Multimodal",
  ecosystem: "Ecosystem/Plugins",
  mobileExperience: "Mobile Experience",
  ideIntegration: "IDE Integration",
};

export const CAPABILITY_LABELS_ZH: Record<CapabilityKey | string, string> = {
  frontend: "前端开发",
  backend: "后端开发",
  agentCoding: "Agent 编程",
  debugging: "Debug 排错",
  codeReview: "代码审查",
  chineseWriting: "中文写作",
  englishWriting: "英文写作",
  research: "深度研究",
  chat: "通用聊天",
  imageGeneration: "生图",
  multimodal: "多模态",
  ecosystem: "生态/插件",
  mobileExperience: "移动端适配体验",
  ideIntegration: "IDE 编辑器集成",
};

export const USE_CASES_EN: Record<string, string> = {
  backend_main_frontend_light: "Mainly Backend",
  frontend_main_backend_light: "Mainly Frontend",
  fullstack_backend_focus: "Full-Stack (Backend Focus)",
  agent_coding: "Agent Programming",
  ai_beginner_general: "Daily General / AI Beginner",
  research_writing: "Research & Writing",
  none: "None",
};

export const USE_CASES_ZH: Record<string, string> = {
  backend_main_frontend_light: "后端开发为主",
  frontend_main_backend_light: "前端开发为主",
  fullstack_backend_focus: "全栈开发（后端偏重）",
  agent_coding: "Agent 编程",
  ai_beginner_general: "日常通用/AI 入门",
  research_writing: "研究与写作",
  none: "无",
};

export const dict = {
  zh: {
    title: "SubPlan",
    subtitle: "根据您的预算、月度用量和具体技能倾向，利用额度分配算法为您量身匹配最适合的 AI 服务组合。",
    previewTag: "✨ SubPlan v0.2 预览版",
    footer1: "v0.1 仅收录和计算稳定官方渠道（官方订阅、API 计费、以及优质稳定聚合平台）。",
    footer2: "缓存命中率默认按 95% 进行用量折合计算，实际消耗会因上下文深度与使用场景而异。数据来源为社区观测统计与 AI 估算，不承诺 100% 准确。缓存折算比例根据高智能（S/A/B/C/D）档位动态调配。",
    adminLink: "⚙️ 数据管理后台",
    
    // Form Labels
    budget: "月预算（人民币 / 元）",
    budgetTolerance: "预算宽松度",
    toleranceStrict: "严格不超预算",
    toleranceNormal: "默认略超预算（15%）",
    toleranceFlexible: "明显更好可超一点（25%）",
    
    monthlyUsage: "月度用量需求（MTokens 等效额度/月）",
    dontKnowUsage: "📊 不知道用量？点击估算",
    usageHint: "用量估算默认按 95% 缓存命中率计算。推荐引擎会在额度分配中智能匹配。",
    
    highIntelRatio: "高智能模型需求比例 (核心复杂任务)",
    intelLow: "低 (20%)",
    intelLowDesc: "轻度智能/润色",
    intelMedium: "中 (50%)",
    intelMediumDesc: "代码/问答混合",
    intelHigh: "高 (80%)",
    intelHighDesc: "复杂推理/开发",
    intelExtreme: "极高 (95%)",
    intelExtremeDesc: "深度智能依赖",
    
    primaryUse: "主要用途",
    secondaryUse: "次要用途",
    region: "所在地区",
    regionCN: "🇨🇳 中国 (CN)",
    regionUS: "🇺🇸 美国 (US)",
    regionJP: "🇯🇵 日本 (JP)",
    regionGlobal: "🌐 全球 (GLOBAL)",
    
    acceptApi: "接受 API 计费计价方式",
    foreignCard: "持有支持境外支付的外币卡",
    
    existingSubs: "已有订阅",
    existingSubsHint: "选择你已经在付费或稳定使用的计划，推荐结果会标记“已拥有/建议新增”。",
    selectedCount: "已选 {count}",
    
    addons: "附加能力需求",
    submitBtn: "📊 分析并生成订阅推荐组合",
    
    // Estimator Modal
    estTitle: "📊 AI 用量估算模型",
    estDevTime: "1. 每日使用 AI 辅助开发时长",
    estTurns: "2. 每日对话与问答频次",
    estMultipliers: "加成调节因子",
    estMultiFile: "使用 Multi-file Agent 自动改项目",
    estMultiFileDesc: "多文件分析与大规模修改 (x1.8)",
    estLargeContext: "经常上传大文件 / 长代码库",
    estLargeContextDesc: "经常引入大量上下文进行推理 (x1.5)",
    estDebug: "多轮交互排错与复杂排查",
    estDebugDesc: "高频次且长反馈的连续排错工作流 (x1.3)",
    estResultLabel: "预计等效用量需求",
    estResultUnit: " MTokens / 月",
    estCacheAssumption: "按 95% 缓存计算",
    cancel: "取消",
    apply: "应用估算用量",
    
    // Result Page
    reenter: "← 重新输入需求",
    engineFinished: "推荐引擎计算完成",
    resultTitle: "SubPlan 智能订阅组合推荐",
    evalParams: "输入评估参数",
    paramBudget: "月预算",
    paramUsage: "月用量需求",
    paramIntel: "高智能比例",
    paramRegion: "使用地区",
    paramPayment: "支付与接口",
    paramApiOk: "✅ 接受 API",
    paramApiNo: "❌ 仅限订阅",
    paramCardOk: "✅ 有外币卡",
    paramCardNo: "❌ 无外币卡",
    paramWeights: "需求归一化权重",
    
    noResultTitle: "⚠️ 未找到同时符合预算及高智能额度覆盖的组合",
    noResultDesc: "推荐引擎要求**总额度覆盖率**与**高智能有效覆盖率**均不低于 90%。您可能开启了较高的“高智能需求比例”，而当前预算购买不到足够的高智能产品。建议您**提高月预算**，或在首页选择较低的“高智能比例”（例如“中”或“低”）后再试。",
    
    bestPick: "最优推荐方案",
    highQuotaPick: "量大管饱备选",
    highPerfPick: "高性能强力组合",
    chineseFriendlyPick: "高额度中文友好备选",
    otherCandidates: "其它候选订阅组合",
    
    bestBadge: "最推荐",
    highQuotaBadge: "量大",
    highPerfBadge: "高性能",
    chineseFriendlyBadge: "高额度",
    
    planStateOwned: "已拥有",
    planStateUpgrade: "建议升级",
    planStateNew: "建议新增",
    planStateUpgradeFrom: "自 {from}",
    
    monthUnit: " /月",
    ownedHeader: "已有 {owned} · 新增 {new}",
    metricsCapability: "能力匹配度",
    metricsAlgScore: "算法综合得分",
    metricsQuotaCoverage: "总额度覆盖率",
    metricsIntelCoverage: "高智能覆盖率",
    
    coverageSufficient: "充足",
    coverageTight: "偏紧",
    coverageInsufficient: "不足",
    
    budgetWithin: "预算内",
    budgetSlightlyOver: "略超预算",
    budgetOver: "超出预算",
    
    allocHeader: "能力承担与额度匹配",
    allocScore: "能力分",
    allocPlan: "主要承担计划",
    allocDone: "分配完成",
    
    logicHeader: "推荐决策依据",
    cautionHeader: "⚠️ 注意事项",
  },
  en: {
    title: "SubPlan",
    subtitle: "Tailor the best AI subscription mix for you based on budget, monthly usage, and skill preferences using our quota allocation algorithm.",
    previewTag: "✨ SubPlan v0.2 Preview",
    footer1: "v0.1 only includes and calculates stable official channels (official subscriptions, API billing, and high-quality aggregation platforms).",
    footer2: "The cache hit rate defaults to 95% for workload conversion. Actual consumption varies by context depth and usage scenarios. Data sources are from community statistics and AI estimation, not guaranteed to be 100% accurate. Cache conversion factors are dynamically allocated based on S/A/B/C/D model tiers.",
    adminLink: "⚙️ Admin Dashboard",
    
    // Form Labels
    budget: "Monthly Budget (CNY)",
    budgetTolerance: "Budget Tolerance",
    toleranceStrict: "Strict (No Overrun)",
    toleranceNormal: "Normal (15% Overrun)",
    toleranceFlexible: "Flexible (25% Overrun)",
    
    monthlyUsage: "Monthly Usage (MTokens Equivalent/mo)",
    dontKnowUsage: "📊 Don't know usage? Estimate",
    usageHint: "Usage estimate assumes 95% cache hit. The recommendation engine matches intelligently.",
    
    highIntelRatio: "High Intelligence Model Ratio (Core Complex Tasks)",
    intelLow: "Low (20%)",
    intelLowDesc: "Light editing",
    intelMedium: "Medium (50%)",
    intelMediumDesc: "Code & Chat",
    intelHigh: "High (80%)",
    intelHighDesc: "Reasoning & Dev",
    intelExtreme: "Extreme (95%)",
    intelExtremeDesc: "Heavy dependence",
    
    primaryUse: "Primary Use Case",
    secondaryUse: "Secondary Use Case",
    region: "Region",
    regionCN: "🇨🇳 China (CN)",
    regionUS: "🇺🇸 United States (US)",
    regionJP: "🇯🇵 Japan (JP)",
    regionGlobal: "🌐 Global (GLOBAL)",
    
    acceptApi: "Accept API Billing Pricing",
    foreignCard: "Hold Foreign Currency Card (for international payment)",
    
    existingSubs: "Existing Subscriptions",
    existingSubsHint: "Select plans you are already paying for or using stably. Results will show 'Owned / Recommend New'.",
    selectedCount: "Selected {count}",
    
    addons: "Add-on Capabilities",
    submitBtn: "📊 Analyze & Generate Subscription Recommendations",
    
    // Estimator Modal
    estTitle: "📊 AI Usage Estimation Model",
    estDevTime: "1. Daily AI-Assisted Dev Time",
    estTurns: "2. Daily Chat/Q&A Turns",
    estMultipliers: "Adjustment Multipliers",
    estMultiFile: "Use Multi-file Agent",
    estMultiFileDesc: "Multi-file analysis & edits (x1.8)",
    estLargeContext: "Upload large files / codebases",
    estLargeContextDesc: "Load large context for inference (x1.5)",
    estDebug: "Multi-turn debugging",
    estDebugDesc: "High-frequency debugging loops (x1.3)",
    estResultLabel: "Estimated Equivalent Usage",
    estResultUnit: " MTokens / mo",
    estCacheAssumption: "Based on 95% cache",
    cancel: "Cancel",
    apply: "Apply Estimate",
    
    // Result Page
    reenter: "← Re-enter Requirements",
    engineFinished: "Recommendation Finished",
    resultTitle: "SubPlan AI Subscription Recommendations",
    evalParams: "Input Evaluation Parameters",
    paramBudget: "Monthly Budget",
    paramUsage: "Monthly Usage",
    paramIntel: "High Intel Ratio",
    paramRegion: "Region",
    paramPayment: "Payment & API",
    paramApiOk: "✅ Accept API",
    paramApiNo: "❌ Subs Only",
    paramCardOk: "✅ Has Card",
    paramCardNo: "❌ No Card",
    paramWeights: "Normalized Needs Weight",
    
    noResultTitle: "⚠️ No subscription mix matches both budget and high intelligence coverage",
    noResultDesc: "The engine requires that both total quota coverage and high-intelligence effective coverage are no less than 90%. You may have set a high \"High Intelligence Model Ratio\", while the current budget is insufficient. Try increasing the budget or lowering the high intelligence ratio on the home page.",
    
    bestPick: "Best Recommended Option",
    highQuotaPick: "High-Quota Alternative",
    highPerfPick: "High-Performance Mix",
    chineseFriendlyPick: "High-Quota Chinese-Friendly Alternative",
    otherCandidates: "Other Candidate Subscription Mixes",
    
    bestBadge: "Best Pick",
    highQuotaBadge: "High Quota",
    highPerfBadge: "High Perf",
    chineseFriendlyBadge: "High Quota",
    
    planStateOwned: "Owned",
    planStateUpgrade: "Upgrade",
    planStateNew: "New",
    planStateUpgradeFrom: "from {from}",
    
    monthUnit: " /mo",
    ownedHeader: "Owned {owned} · New {new}",
    metricsCapability: "Capability Match",
    metricsAlgScore: "Algorithmic Score",
    metricsQuotaCoverage: "Total Quota Coverage",
    metricsIntelCoverage: "High Intel Coverage",
    
    coverageSufficient: "Sufficient",
    coverageTight: "Tight",
    coverageInsufficient: "Insufficient",
    
    budgetWithin: "Within Budget",
    budgetSlightlyOver: "Slightly Over",
    budgetOver: "Over Budget",
    
    allocHeader: "Capability & Quota Allocation",
    allocScore: "Cap Score",
    allocPlan: "Primary Plan",
    allocDone: "Allocated",
    
    logicHeader: "Recommendation Logic",
    cautionHeader: "⚠️ Cautions",
  },
};

/**
 * Safely translate capability labels.
 */
export function getCapabilityLabel(key: string, lang: Locale): string {
  const map = lang === "en" ? CAPABILITY_LABELS_EN : CAPABILITY_LABELS_ZH;
  return map[key] ?? key;
}

/**
 * Safely translate use case labels.
 */
export function getUseCaseLabel(key: string, lang: Locale): string {
  const map = lang === "en" ? USE_CASES_EN : USE_CASES_ZH;
  return map[key] ?? key;
}

/**
 * Safely translate reasons dynamically generated in scoring.ts.
 */
export function translateReason(reason: string, lang: Locale): string {
  if (lang !== "en") return reason;

  // 1. 在核心需求「...」上，... 能力较强。
  const matchCore = reason.match(/^在核心需求「(.+?)」上，(.+?) 能力较强。$/);
  if (matchCore) {
    const capZh = matchCore[1];
    const planName = matchCore[2];
    // Find capability key from label
    const capKey = Object.keys(CAPABILITY_LABELS_ZH).find(
      (k) => CAPABILITY_LABELS_ZH[k] === capZh
    ) ?? capZh;
    const capEn = CAPABILITY_LABELS_EN[capKey] ?? capZh;
    return `In core need "${capEn}", ${planName} is relatively strong.`;
  }

  // 2. 核心复杂任务中约 ...% 需要高智能模型，该组合已分配约 ... MTokens 高智能额度，主要由 ... 承担。
  const matchQuota = reason.match(
    /^核心复杂任务中约 (\d+)% 需要高智能模型，该组合已分配约 ([\d\.]+) MTokens 高智能额度，主要由 (.+?) 承担。$/
  );
  if (matchQuota) {
    const percent = matchQuota[1];
    const mtokens = matchQuota[2];
    const provider = matchQuota[3];
    return `About ${percent}% of core complex tasks require high-intelligence models. This mix allocates about ${mtokens} MTokens of high-intelligence quota, mainly supported by ${provider}.`;
  }

  // 3. 组合共 ... 个订阅，覆盖不同使用场景。
  const matchCount = reason.match(/^组合共 (\d+) 个订阅，覆盖不同使用场景。$/);
  if (matchCount) {
    const count = matchCount[1];
    return `This mix contains ${count} subscriptions, covering different usage scenarios.`;
  }

  // 4. 订阅之间互补性较好，重复支出较少。
  if (reason === "订阅之间互补性较好，重复支出较少。") {
    return "Good complementarity between subscriptions, minimizing redundant spending.";
  }

  // 5. 用量来源为社区统计与 AI 估算，不承诺 100% 准确。
  if (reason === "用量来源为社区统计与 AI 估算，不承诺 100% 准确。") {
    return "Usage sources are from community statistics and AI estimation, not guaranteed to be 100% accurate.";
  }

  return reason;
}

/**
 * Safely translate cautions dynamically generated in scoring.ts.
 */
export function translateCaution(caution: string, lang: Locale): string {
  if (lang !== "en") return caution;

  if (caution === "该组合总月成本略超预算，但性价比更高。") {
    return "The total monthly cost is slightly over budget, but offers better value.";
  }
  if (caution === "额度刚好覆盖你的用量，建议留一些余量。") {
    return "Quota barely covers your usage; it is recommended to leave some margin.";
  }
  if (caution === "总额度充足，但复杂 Agent/后端任务的高智能额度偏紧。") {
    return "Total quota is sufficient, but high-intelligence quota for complex Agent/Backend tasks is tight.";
  }
  if (caution === "部分订阅为美元定价，需确认支付方式。") {
    return "Some subscriptions are priced in USD; please verify your payment method.";
  }

  return caution;
}
