import { NextResponse } from "next/server";
import { recommend } from "@/lib/recommend";
import type { HighIntelligenceRatioPreset, RecommendResponse, UserInput } from "@/lib/types";

type RecommendRequest = {
  budgetCny?: number;
  budgetTolerance?: "strict" | "normal" | "flexible";
  monthlyDemandMTokens?: number;
  primaryUseCase?: string;
  secondaryUseCase?: string;
  region?: UserInput["region"];
  acceptsApiBilling?: boolean;
  hasForeignCard?: boolean;
  existingPlanIds?: string[];
  addOns?: string[];
  highIntelligenceRatioPreset?: string;
};

function normalizeTolerance(value: RecommendRequest["budgetTolerance"]): UserInput["budgetTolerance"] {
  if (value === "strict") return 0;
  if (value === "flexible") return 0.25;
  return 0.15;
}

function normalizeHighIntelligenceRatioPreset(value: string | undefined): HighIntelligenceRatioPreset {
  if (value === "low" || value === "medium" || value === "high" || value === "extreme") {
    return value;
  }
  return "medium";
}

function normalizeRequest(body: RecommendRequest): UserInput {
  return {
    budgetCny: Math.max(0, Number(body.budgetCny) || 0),
    budgetTolerance: normalizeTolerance(body.budgetTolerance),
    monthlyDemandMTokens: Math.max(1, Number(body.monthlyDemandMTokens) || 1),
    primaryUseCase: body.primaryUseCase || "backend_main_frontend_light",
    secondaryUseCase: body.secondaryUseCase || "none",
    region: body.region || "CN",
    acceptsApiBilling: Boolean(body.acceptsApiBilling),
    hasForeignCard: Boolean(body.hasForeignCard),
    existingPlanIds: Array.isArray(body.existingPlanIds) ? body.existingPlanIds : [],
    addOns: Array.isArray(body.addOns) ? body.addOns : [],
    highIntelligenceRatioPreset: normalizeHighIntelligenceRatioPreset(
      body.highIntelligenceRatioPreset
    ),
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RecommendRequest;
    const input = normalizeRequest(body);
    const results = recommend(input);

    const response: RecommendResponse = {
      results,
      dataVersion: "v0.2.1",
      assumptions: [
        "用量按 MTokens-equivalent 估算，不代表官方固定 token 上限。",
        "缓存命中率默认按 95% 的 Agent/重复项目工作流口径处理。",
        "高智能覆盖率按订阅计划内模型画像估算，不再由整套餐总额度直接折算。",
        "API 只在用户接受 API 计费时作为补位项参与组合。",
        "已有订阅会参与能力和额度分配，但仍计入组合月成本展示。",
      ],
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "推荐计算失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
