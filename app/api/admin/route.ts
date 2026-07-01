import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

type JsonObject = Record<string, unknown>;

function isAdminApiEnabled(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.ENABLE_ADMIN_API === "1";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

async function readJson<T extends JsonObject>(filename: string): Promise<T> {
  const filepath = path.join(DATA_DIR, filename);
  const content = await fs.readFile(filepath, "utf-8");
  return JSON.parse(content) as T;
}

async function writeJson(filename: string, data: JsonObject) {
  const filepath = path.join(DATA_DIR, filename);
  await fs.writeFile(filepath, JSON.stringify(data, null, 2), "utf-8");
}

export async function GET() {
  if (!isAdminApiEnabled()) {
    return NextResponse.json({ error: "Admin API is disabled in production." }, { status: 404 });
  }

  try {
    const plansFile = await readJson<{ plans?: unknown[] }>("plans.json");
    const apiOptionsFile = await readJson<{ apiOptions?: unknown[] }>("api-options.json");
    const scoresFile = await readJson<{ planCapabilityScores?: unknown[] }>("scores.json");
    const quotasFile = await readJson<{ quotas?: unknown[] }>("quotas.json");
    const relationsFile = await readJson<{ planRelations?: unknown[] }>("relations.json");
    const modelTiersFile = await readJson<{ tiers?: unknown[] }>("model-tiers.json");

    return NextResponse.json({
      plans: plansFile.plans || [],
      apiOptions: apiOptionsFile.apiOptions || [],
      scores: scoresFile.planCapabilityScores || [],
      quotas: quotasFile.quotas || [],
      relations: relationsFile.planRelations || [],
      modelTiers: modelTiersFile.tiers || [],
    });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isAdminApiEnabled()) {
    return NextResponse.json({ error: "Admin API is disabled in production." }, { status: 404 });
  }

  try {
    const body = (await request.json()) as { type?: string; data?: unknown[] };
    const { type, data } = body;

    const today = new Date().toISOString().split("T")[0];

    if (type === "plans") {
      const plansFile = await readJson<{ plans?: unknown[]; lastUpdatedAt?: string }>("plans.json");
      plansFile.plans = data;
      plansFile.lastUpdatedAt = today;
      await writeJson("plans.json", plansFile);
    } else if (type === "apiOptions") {
      const apiOptionsFile = await readJson<{ apiOptions?: unknown[]; lastUpdatedAt?: string }>("api-options.json");
      apiOptionsFile.apiOptions = data;
      apiOptionsFile.lastUpdatedAt = today;
      await writeJson("api-options.json", apiOptionsFile);
    } else if (type === "scores") {
      const scoresFile = await readJson<{ planCapabilityScores?: unknown[]; lastUpdatedAt?: string }>("scores.json");
      scoresFile.planCapabilityScores = data;
      scoresFile.lastUpdatedAt = today;
      await writeJson("scores.json", scoresFile);
    } else if (type === "quotas") {
      const quotasFile = await readJson<{ quotas?: unknown[]; lastUpdatedAt?: string }>("quotas.json");
      quotasFile.quotas = data;
      quotasFile.lastUpdatedAt = today;
      await writeJson("quotas.json", quotasFile);
    } else if (type === "relations") {
      const relationsFile = await readJson<{ planRelations?: unknown[]; lastUpdatedAt?: string }>("relations.json");
      relationsFile.planRelations = data;
      relationsFile.lastUpdatedAt = today;
      await writeJson("relations.json", relationsFile);
    } else if (type === "modelTiers") {
      const modelTiersFile = await readJson<{ tiers?: unknown[]; lastUpdatedAt?: string }>("model-tiers.json");
      modelTiersFile.tiers = data;
      modelTiersFile.lastUpdatedAt = today;
      await writeJson("model-tiers.json", modelTiersFile);
    } else {
      return NextResponse.json({ error: "Invalid data type" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
