# 满意度优先推荐算法 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** 将当前“按套餐逐项贪心 + 固定加分”的推荐器升级为可解释、可校验、以稳健满足用户任务为第一目标的全局推荐算法，同时保持现有 recommend(input): ScoredCombo[] 接口和结果页兼容。

**Architecture:** 先把 JSON 数据加载、校验和索引收拢为可注入的数据快照，再将地区/互斥/价格/需求/额度分配/排序拆成独立模块。每个候选组合用 YALPS 求解连续额度分配：依次最大化高智能覆盖、总覆盖和质量，最后最小化实际 API 花费；排序层再做稳健满意度、Pareto 过滤和确定性排序。旧的 lib/scoring.ts 在对照测试通过前保留为回滚参考，公开入口切换到新编排器后再移除死代码。

**Tech Stack:** Next.js 16、React 19、TypeScript strict、Node test runner、tsx、YALPS 0.6.4（带 TypeScript 声明的轻量 LP/MIP 求解器）、现有 JSON 数据文件。

---

## 文件边界与责任

- 修改 package.json、package-lock.json：加入 yalps、tsx 和测试/数据校验脚本。
- 创建 tests/recommendation/：使用 node:test 的单元、性质、黄金场景和性能测试；测试通过 createRecommendationDataSnapshot 注入小型 fixture，不依赖线上数据。
- 修改 lib/types.ts：补充互斥组、额度池、策略、稳健指标和迁移兼容字段，保留旧字段。
- 创建 data/recommendation-policy.json、data/model-calibration.json：所有产品加成、地区展示规则、置信度系数和专家锚点集中配置。
- 创建 scripts/migrate-recommendation-data.ts：以 --check/--write 两阶段迁移 plans.json 与 model-access-profiles.json，默认只输出报告。
- 创建 scripts/validate-recommendation-data.ts：加载真实数据并输出结构化错误/警告，遇到固定套餐硬错误时退出码 1。
- 创建 lib/recommendation/data-snapshot.ts：服务端按修改时间缓存，一次读取并解析每个 JSON，生成所有索引和数据版本。
- 创建 lib/recommendation/validation.ts：纯函数校验原始数据、API 价格别名、评分/额度边界和额度池唯一性。
- 创建 lib/recommendation/eligibility.ts：地区、角色、免费套餐、API 开关、已有订阅替换和 exclusiveGroup。
- 创建 lib/recommendation/pricing.ts：地区价格优先级、官网原币汇率换算、API 价格归一化和实际花费。
- 创建 lib/recommendation/demand.ts：需求权重、高智能需求拆分和 mobileExperience/ideIntegration 偏好。
- 创建 lib/recommendation/allocation.ts：从模型访问画像生成 YALPS 模型，执行四阶段词典序求解并还原 allocationDetails。
- 创建 lib/recommendation/candidates.ts：确定性生成 1–3 个固定套餐基底，挂接可用 API，去除不产生边际贡献的新增套餐。
- 创建 lib/recommendation/ranking.ts：稳健分、覆盖可靠性、满意度、展示层、Pareto 和稳定排序。
- 创建 lib/recommendation/explanations.ts：推荐理由、缺口、置信度、美元/日元换算和速度附注。
- 修改 lib/data.ts、lib/budget.ts、lib/quota.ts、lib/normalize.ts：保留客户端安全的兼容导出；新推荐引擎直接使用服务端快照，客户端模块不得静态导入 node:fs、node:crypto 或 data-snapshot。
- 修改 lib/recommend.ts：保持公开入口，编排新模块并保留旧字段映射。
- 修改 app/api/recommend/route.ts、app/result/page.tsx、components/ComboCard.tsx、components/AllResults.tsx：展示新增指标/说明，删除页面侧预算利用率排序，保留现有参数和字段读取。
- 修改 app/api/admin/route.ts：写入数据后调用快照失效函数。
- 创建 tests/recommendation/golden-scenarios.json：至少 30 个版本化输入场景及允许的候选/禁止项断言。

### Task 1: 建立可重复的测试入口

**Files:**
- Modify: package.json scripts and devDependencies
- Modify: package-lock.json (由 npm install 更新)
- Create: tests/recommendation/test-helpers.ts
- Create: tests/recommendation/harness.test.ts

- [ ] Step 1: 先写会失败的测试

在 tests/recommendation/harness.test.ts 写入：

    import test from "node:test";
    import assert from "node:assert/strict";
    import { makeFixtureRawData } from "./test-helpers";

    test("fixture data is available to the TypeScript test runner", () => {
      const raw = makeFixtureRawData();
      assert.equal(raw.plans[0]?.provider, "Fixture");
      assert.equal(raw.quotas[0]?.estimatedTextWorkloadCapacityMTokens, 120);
      assert.equal(raw.scores[0]?.planId, "fixture_plus");
    });

- [ ] Step 2: 运行测试确认失败

    npx --no-install tsx --test tests/recommendation/harness.test.ts

预期：FAIL，test-helpers.ts 尚不存在。

- [ ] Step 3: 加入测试脚本和最小 fixture helper

在 package.json 增加：

    "test": "tsx --test tests",
    "test:recommendation": "tsx --test tests/recommendation",
    "validate:data": "tsx scripts/validate-recommendation-data.ts",
    "migrate:data": "tsx scripts/migrate-recommendation-data.ts --check"

执行：

    npm install -D tsx@4.23.1
    npm install yalps@0.6.4

在 tests/recommendation/test-helpers.ts 先导出固定的 RawRecommendationData fixture；fixture 必须包含一个 Fixture 计划、完整的 12 个 scores 键、一个 high quota、一个 model tier、一个模型画像和一条 FX 记录。helper 的最终签名固定为：

    export type FixtureRawData = {
      plans: Plan[];
      scores: CapabilityScoreRecord[];
      quotas: Quota[];
    };
    export function makeFixtureRawData(): FixtureRawData;
    export function makeInput(overrides?: Partial<UserInput>): UserInput;

makeInput 的基线值固定为 budgetCny 300、monthlyDemandMTokens 100、primaryUseCase "agent_coding"、secondaryUseCase "none"、region "CN"、acceptsApiBilling false、hasForeignCard false、highIntelligenceRatioPreset "medium"。

- [ ] Step 4: 运行测试确认 harness 通过

    npx --no-install tsx --test --test-reporter=spec tests/recommendation/harness.test.ts

预期：PASS，1 test passed；makeFixtureSnapshot 在 Task 3 建立 snapshot 后加入 helper。

- [ ] Step 5: 提交

    git add package.json package-lock.json tests/recommendation
    git commit -m "test: add recommendation test harness"

### Task 2: 固化类型、策略数据与专家校准契约

**Files:**
- Modify: lib/types.ts
- Create: data/recommendation-policy.json
- Create: data/model-calibration.json
- Create: lib/recommendation/policy.ts
- Create: tests/recommendation/policy.test.ts

- [ ] Step 1: 先写失败的类型/配置行为测试

    test("confidence shrink is monotonic and bounded", () => {
      assert.deepEqual(
        ["high", "medium", "low"].map((level) => getScoreConfidenceFactor(level as "high" | "medium" | "low")),
        [1, 0.95, 0.85],
      );
      assert.deepEqual(
        ["high", "medium", "low"].map((level) => getQuotaConfidenceFactor(level as "high" | "medium" | "low")),
        [1, 0.9, 0.75],
      );
    });

    test("high-intelligence table is shared by every plan", () => {
      assert.equal(getHighTierFactor("medium", "S"), 1);
      assert.equal(getHighTierFactor("medium", "A"), 0.75);
      assert.equal(getHighTierFactor("extreme", "A"), 0.15);
      assert.equal(getHighTierFactor("high", "B"), 0);
    });

    test("web bonus is capped and speed never contributes", () => {
      assert.equal(getWebValueBonus(["chatgpt_plus", "chatgpt_pro_20x"], "extreme"), 3.5);
      assert.equal(getWebValueBonus(["supergrok"], "medium"), 0);
    });

- [ ] Step 2: 运行失败测试

    npx --no-install tsx --test tests/recommendation/policy.test.ts

预期：FAIL，policy 模块和新类型尚不存在。

- [ ] Step 3: 修改类型并写入配置

在 lib/types.ts 增加以下契约（旧字段不删除）：

    export type Confidence = "high" | "medium" | "low";
    export type PresentationTier = "normal" | "deprioritized";
    export type QuotaConfidence = Confidence | "not_applicable";
    export type QuotaPool = {
      quotaPoolId: string;
      capacityMTokens: number;
      confidence: Confidence;
      source: string;
    };
    export type RecommendationPolicy = {
      schemaVersion: string;
      confidenceFactors: {
        score: Record<Confidence, number>;
        quota: Record<Confidence, number>;
      };
      webValueSignals: Array<{ planId: string; baseBonus: number; extremeTaskBonus?: number; label: string; confidence: Confidence; evidence: string }>;
      regionPresentationRules: Array<{ region: UserInput["region"]; provider?: string; planId?: string; tier: PresentationTier; explanation: string }>;
      speedLabels: Array<{ planId?: string; modelId?: string; label: string; evidence: string }>;
      apiTokenMix: { inputCacheMiss: number; inputCacheHit: number; output: number };
    };
    export type ModelCalibration = {
      capability: CapabilityKey;
      orderedModelIds: string[];
      evidenceType: "expert_experience" | "community_consensus";
      confidence: Confidence;
      notes: string;
    };
    export type ModelBenchmark = {
      modelId: string;
      label: string;
      derivedCapabilityScores: Partial<Record<CapabilityKey | "frontendFromArena", number | null>>;
      coverage: { confidence: Confidence | "none" };
    };
    export type ArenaWebdevScores = {
      boards: { frontendCodeArena: { rows: Array<{ rank: number; modelId: string; score: number; winRate: number }> } };
    };
    export type CommunityUsageReports = {
      reports: Record<string, Array<{ source?: string; claim: string; asOf: string; metric: Record<string, unknown> | null; notes?: string }>>;
    };

在 Plan 中增加 exclusiveGroup?: string；在 Plan.pricesPerMToken 中保留 inputCacheHit/inputCacheMiss/output 并加入 input?: number、cacheHit?: number。ModelAccessModel 增加 quotaPoolId?: string、workloadMultiplier?: number，ModelAccessProfile 增加 quotaPools?: QuotaPool[]。AllocationDetail 增加可选的 modelId、modelLabel、quotaPoolId、layer。PlanInCombo 增加可选的 originalAmount、originalCurrency、fxRateToCny、actualApiSpendCny。ScoredCombo 增加可选的 robustTotalCoverage、robustHighCoverage、coverageReliabilityScore、qualityScore、webValueBonus、featurePreferenceBonus、presentationTier、dataConfidence、speedNotes、shortfall、recommendationCategory、comboId、algorithmVersion、dataVersion；保留旧的 capabilityScore、adjustment、finalScore、reasons、cautions。

创建 data/recommendation-policy.json，实际值固定为：

    {
      "schemaVersion": "recommendation-policy-1",
      "confidenceFactors": {
        "score": { "high": 1, "medium": 0.95, "low": 0.85 },
        "quota": { "high": 1, "medium": 0.9, "low": 0.75 }
      },
      "webValueSignals": [
        { "planId": "chatgpt_plus", "baseBonus": 2, "label": "GPT 网页版额度通常不易触顶", "confidence": "high", "evidence": "user_experience_2026-08" },
        { "planId": "chatgpt_pro_5x", "baseBonus": 2, "extremeTaskBonus": 1.5, "label": "GPT Pro 网页版与 GPT-5.6 Pro 高难度访问", "confidence": "high", "evidence": "user_experience_2026-08" },
        { "planId": "chatgpt_pro_20x", "baseBonus": 2, "extremeTaskBonus": 1.5, "label": "GPT Pro 网页版与 GPT-5.6 Pro 高难度访问", "confidence": "high", "evidence": "user_experience_2026-08" }
      ],
      "regionPresentationRules": [
        { "region": "CN", "provider": "Anthropic", "tier": "deprioritized", "explanation": "Claude 对中国用户可用性不稳定，放入降级展示层" }
      ],
      "speedLabels": [
        { "modelId": "grok-4.5", "label": "响应速度较快（仅附加说明）", "evidence": "user_experience_2026-08" }
      ],
      "apiTokenMix": { "inputCacheMiss": 0.035, "inputCacheHit": 0.665, "output": 0.30 }
    }

创建 data/model-calibration.json，至少写入 agentCoding、backend、frontend 三条记录；前两条的 orderedModelIds 为 gpt-5.6-sol、kimi-k3、gpt-5.5、grok-4.5、glm-5.2、kimi-k2.7-code；frontend 记录以 arena-webdev-scores 的模型 ID 为准并标记 community_consensus。

lib/recommendation/policy.ts 导出 getScoreConfidenceFactor、getQuotaConfidenceFactor、getHighTierFactor、getWebValueBonus、getPolicyPresentationTier、getSpeedNotes。高智能表固定为 low: S1/A1/B.7/C.3/D0、medium: S1/A.75/B.25/C0/D0、high: S1/A.4/其余0、extreme: S1/A.15/其余0。getWebValueBonus 对组合信号求和后 Math.min(sum, 3.5)，speedLabels 不进入该函数。

- [ ] Step 4: 运行测试确认通过

    npx --no-install tsx --test tests/recommendation/policy.test.ts

预期：PASS，3 tests passed。

- [ ] Step 5: 提交

    git add lib/types.ts data/recommendation-policy.json data/model-calibration.json lib/recommendation/policy.ts tests/recommendation/policy.test.ts
    git commit -m "feat: add recommendation policy and calibration contracts"

### Task 3: 实现一次加载、校验和索引的数据快照

**Files:**
- Create: lib/recommendation/validation.ts
- Create: lib/recommendation/data-snapshot.ts
- Modify: lib/data.ts
- Create: tests/recommendation/data-snapshot.test.ts
- Create: scripts/validate-recommendation-data.ts

- [ ] Step 1: 写失败测试

    test("snapshot indexes every source and exposes one data version", () => {
      const snapshot = makeFixtureSnapshot();
      assert.equal(snapshot.planById.size, 1);
      assert.equal(snapshot.scoreByPlanId.get("fixture_plus")?.planId, "fixture_plus");
      assert.equal(snapshot.accessProfileByPlanId.get("fixture_plus")?.planId, "fixture_plus");
      assert.match(snapshot.dataVersion, /^recommendation-/);
    });

    test("invalid API aliases are diagnosed and excluded, fixed-plan errors fail", () => {
      const raw = makeFixtureRawData();
      raw.apiOptions.push({ ...raw.apiOptions[0], id: "bad_api", pricesPerMToken: { input: Number.NaN, output: 1 } });
      raw.plans[0] = { ...raw.plans[0], id: "bad_fixed", originalPrice: Number.POSITIVE_INFINITY };
      const report = validateRecommendationData(raw);
      assert.ok(report.errors.some((item) => item.planId === "bad_fixed"));
      assert.ok(report.excludedApiPlanIds.includes("bad_api"));
    });

    test("same raw object is parsed once per file", () => {
      const reads: string[] = [];
      const snapshot = loadRecommendationDataSnapshot({
        readJson: (filename) => { reads.push(filename); return makeFixtureRawFile(filename); },
        fileSignature: () => "fixture-signature",
      });
      assert.ok(snapshot);
      assert.equal(new Set(reads).size, reads.length);
    });

- [ ] Step 2: 运行失败测试

    npx --no-install tsx --test tests/recommendation/data-snapshot.test.ts

预期：FAIL，snapshot 和 validation 导出不存在。

- [ ] Step 3: 实现验证契约

lib/recommendation/validation.ts 导出：

    export type ValidationDiagnostic = { severity: "error" | "warning"; code: string; message: string; planId?: string; field?: string };
    export type ValidationReport = { errors: ValidationDiagnostic[]; warnings: ValidationDiagnostic[]; excludedApiPlanIds: string[] };

validateRecommendationData 必须检查：各文件 ID 唯一；启用固定套餐有 score、quota 和 model-tier 或非空 model-access；套餐 score 和模型 derivedCapabilityScores 的非空值有限且在 0..100；额度和价格有限且非负；启用 API 的归一化三价格都存在；exclusiveGroup 只引用同一 plans 集合中的主订阅；Arena 行 modelId 唯一且 score 有限。API 价格无效时加入 excludedApiPlanIds 和 error，但不让其它固定套餐消失。函数不得修改输入。

- [ ] Step 4: 实现 snapshot 与兼容 data getter

lib/recommendation/data-snapshot.ts 定义：

    export type RawRecommendationData = {
      plans: Plan[]; apiOptions: Plan[]; scores: CapabilityScoreRecord[]; quotas: Quota[];
      relations: PlanRelation[]; presets: Presets; fxRates: FxRate[];
      modelTiers: ModelTierRecord[]; accessProfiles: ModelAccessProfile[];
      regionalPriceApps: RegionalPriceApp[]; modelBenchmarks: ModelBenchmark[];
      arenaWebdevScores: ArenaWebdevScores; communityUsageReports: CommunityUsageReports;
      policy: RecommendationPolicy; calibrations: ModelCalibration[];
    };
    export type RecommendationDataSnapshot = RawRecommendationData & {
      allPlans: Plan[]; planById: Map<string, Plan>; scoreByPlanId: Map<string, CapabilityScoreRecord>;
      quotaByPlanId: Map<string, Quota>; tierByPlanId: Map<string, ModelTierRecord>;
      accessProfileByPlanId: Map<string, ModelAccessProfile>; relationsByPair: Map<string, PlanRelation>;
      modelBenchmarkById: Map<string, ModelBenchmark>;
      regionalPriceByPlanAndRegion: Map<string, number>; policyByPlanAndRegion: Map<string, PresentationTier>;
      diagnostics: ValidationReport; dataVersion: string;
    };

createRecommendationDataSnapshot(raw, version?) 先校验，再过滤 excludedApiPlanIds，按 ID 建 Map；regional price key 固定为 planId:region，relation key 固定为排序后的 planA/planB。dataVersion 为 recommendation- 加所有源文件版本字符串的 SHA-256 前 12 位；fixture 使用 recommendation-fixture。

loadRecommendationDataSnapshot(options?) 维护 module-level { signature, snapshot }；signature 是 plans、api-options、scores、quotas、relations、presets、fx-rates、model-tiers、model-access-profiles、regional-prices、model-benchmarks、arena-webdev-scores、community-usage-reports、recommendation-policy、model-calibration 共 15 个 JSON 文件的 mtimeMs 拼接。signature 未变时返回同一对象；改变时每个文件只调用一次 readJson。浏览器/构建时使用静态 import fallback。导出 invalidateRecommendationDataSnapshot()。Task 3 同时把 FixtureRawData 扩展成完整 RawRecommendationData，把 makeFixtureSnapshot 加入 test-helpers.ts，并由 createRecommendationDataSnapshot(makeFixtureRawData(), "fixture") 构造。

lib/data.ts 仍被 "use client" 的 RecommendForm 引用，因此不得导入 data-snapshot。删除它的逐 getter 服务端 readFileSync 路径，改用静态 JSON 建立 module-level Map；保留 getAllPlans、getCapabilityScore、getQuota、getModelTier、getModelAccessProfile、getRegionalMonthlyPriceCny、presets、fxRates、defaultCacheHitRate、budgetToleranceDefault。服务端推荐只访问 loadRecommendationDataSnapshot，不再调用这些兼容 getter。data-snapshot 的 node 文件/哈希能力通过服务端动态 require 隔离，createRecommendationDataSnapshot 保持纯函数以便测试。

- [ ] Step 5: 写校验脚本并运行

scripts/validate-recommendation-data.ts 输出：

    {
      "dataVersion": snapshot.dataVersion,
      "errors": snapshot.diagnostics.errors,
      "warnings": snapshot.diagnostics.warnings,
      "excludedApiPlanIds": snapshot.diagnostics.excludedApiPlanIds
    }

errors.length > 0 时 process.exitCode = 1；仅 warning 时退出 0。

    npm run validate:data
    npx --no-install tsx --test tests/recommendation/data-snapshot.test.ts

预期：fixture 测试 PASS；真实数据报告具体 planId，不输出 NaN。

- [ ] Step 6: 提交

    git add lib/recommendation/validation.ts lib/recommendation/data-snapshot.ts lib/data.ts scripts/validate-recommendation-data.ts tests/recommendation/data-snapshot.test.ts
    git commit -m "feat: cache and validate recommendation data snapshots"

### Task 4: 迁移互斥组和额度池数据

**Files:**
- Create: scripts/migrate-recommendation-data.ts
- Modify: data/plans.json
- Modify: data/model-access-profiles.json
- Modify: data/api-options.json
- Modify: data/community-usage-reports.json
- Create: tests/recommendation/migration.test.ts

- [ ] Step 1: 写迁移行为的失败测试

    test("provider primary tiers receive one explicit exclusive group", () => {
      const plans = migrateExclusiveGroups([
        { id: "plus", provider: "OpenAI", recommendationRole: "primary_subscription", region: "GLOBAL" },
        { id: "pro", provider: "OpenAI", recommendationRole: "primary_subscription", region: "GLOBAL" },
        { id: "api", provider: "OpenAI", recommendationRole: "supplementary_api", region: "GLOBAL" },
      ] as Plan[]);
      assert.equal(plans[0].exclusiveGroup, "chatgpt_membership");
      assert.equal(plans[1].exclusiveGroup, "chatgpt_membership");
      assert.equal(plans[2].exclusiveGroup, undefined);
    });

    test("shared Kimi/Claude wallets become one physical pool", () => {
      const profile = migrateAccessProfile({
        planId: "fixture",
        models: [
          { modelId: "kimi-k3", label: "K3", quotaMTokens: 100, tierByCapability: { backend: "S" } },
          { modelId: "kimi-k2.7-code", label: "K2.7", quotaMTokens: 100, tierByCapability: { backend: "A" } },
        ],
      } as ModelAccessProfile, { planQuota: 100 });
      assert.equal(profile.quotaPools?.length, 1);
      assert.equal(profile.models[0].quotaPoolId, profile.models[1].quotaPoolId);
      assert.equal(profile.quotaPools?.[0].capacityMTokens, 100);
    });

- [ ] Step 2: 运行失败测试

    npx --no-install tsx --test tests/recommendation/migration.test.ts

预期：FAIL，迁移函数不存在。

- [ ] Step 3: 实现确定性迁移

scripts/migrate-recommendation-data.ts 导出 migrateExclusiveGroups、migrateAccessProfile、migrateAllData。exclusiveGroup 仅赋给 recommendationRole 为 primary_subscription 的套餐。显式映射固定为 OpenAI→chatgpt_membership、Kimi/Moonshot→kimi_membership、Google→google_ai_membership、xAI→supergrok_membership、Anthropic→claude_membership、Cursor→cursor_membership，其余 provider 使用小写安全名 + "_membership"；API、local_option、team_plan、bundle role 不赋组。migrateAccessProfile 使用明确共享模型集合：

    const sharedWalletModelIds = new Set([
      "kimi-k3", "kimi-k2.7-code", "claude-opus-5", "claude-opus-4.8",
      "claude-fable-5", "claude-sonnet-5"
    ]);

同一 profile 中命中集合的模型使用 ${planId}:shared 池；Cursor 的 gpt-opus-cursor-pool 和 composer-2.5 分别使用 ${planId}:premium、${planId}:standard；其它带 quotaMTokens 的模型各自使用 ${planId}:${modelId} 池；只有 quotaShare 的旧画像使用一个 ${planId}:default 池，容量取 quotas.json 套餐额度。旧 quotaMTokens/quotaShare 保留作迁移审计字段，但运行时只读取 quotaPools、quotaPoolId、workloadMultiplier。

每个池的 capacityMTokens 只计算一次；共享池容量取套餐 quota 的非负值，缺省时取共享模型 quotaMTokens 的最大值而非求和。缺失画像的固定套餐创建 ${planId}:default 池，容量取 quotas.json。

脚本默认 --check：打印变更摘要和 validation report，不写文件；仅 --write 时写回上述四个 JSON，并在写入前用 path.resolve 验证目标是当前仓库 data 目录下的精确文件。

迁移同时检查启用 API：三个 canonical 价格无法得到有限非负值时，将 enabledForRecommendation 改为 false，并在 notes 追加“Disabled by recommendation validation: missing finite per-token prices.”；当前 openrouter_api 因没有具体模型价格按此规则停用，GLM 的 input/cacheHit/output 由导入层别名兼容，不改动原始证据字段。community-usage-reports.json 的 reports.kimi_allegretto_cn 新增高可信记录：source="local_ccusage_user_2026-08"、asOf="2026-08"、claim 写明 K3-256k 的本地 ccusage 观测，metric 为 { unit:"workload_mtokens", observedWeekly:294, cacheHitRate:0.982, annualizedMonthly:1274 }；notes 明确缓存 workload tokens 不等于同量新生成 token，运行时额度仍以 quotas.json 和 quota pool 为准。

- [ ] Step 4: 运行迁移测试和 dry-run

    npx --no-install tsx --test tests/recommendation/migration.test.ts
    npm run migrate:data

预期：测试 PASS；dry-run 列出新增字段数量，文件内容不改变。

- [ ] Step 5: 写入并校验数据

    npx --no-install tsx scripts/migrate-recommendation-data.ts --write
    npm run validate:data

预期：所有启用主订阅都有 exclusiveGroup；同钱包模型池容量不重复；无定价 API 被显式停用；Kimi 199 观测只作为交叉校验；validation 无 error。

- [ ] Step 6: 提交

    git add scripts/migrate-recommendation-data.ts data/plans.json data/model-access-profiles.json data/api-options.json data/community-usage-reports.json tests/recommendation/migration.test.ts
    git commit -m "data: add explicit membership groups and quota pools"

### Task 5: 地区资格、价格回退和 API 价格归一化

**Files:**
- Create: lib/recommendation/eligibility.ts
- Create: lib/recommendation/pricing.ts
- Modify: lib/budget.ts
- Create: tests/recommendation/eligibility-pricing.test.ts

- [ ] Step 1: 写失败的资格和价格测试

    test("CN accepts GLOBAL USD plans and GLOBAL accepts only GLOBAL", () => {
      const plans = [
        plan({ id: "cn", region: "CN" }),
        plan({ id: "global", region: "GLOBAL", originalPrice: 20, originalCurrency: "USD" }),
        plan({ id: "us", region: "US" }),
      ];
      assert.deepEqual(filterEligiblePlans(plans, makeInput({ region: "CN" })).map((p) => p.id), ["cn", "global"]);
      assert.deepEqual(filterEligiblePlans(plans, makeInput({ region: "GLOBAL" })).map((p) => p.id), ["global"]);
    });

    test("foreign card is accepted but has no ranking effect", () => {
      const a = makeInput({ hasForeignCard: false });
      const b = makeInput({ hasForeignCard: true });
      assert.deepEqual(filterEligiblePlans([plan({ id: "global", region: "GLOBAL" })], a), filterEligiblePlans([plan({ id: "global", region: "GLOBAL" })], b));
    });

    test("API aliases normalize to finite canonical prices", () => {
      assert.deepEqual(normalizeApiPrices({ input: 8, cacheHit: 2, output: 28 }), {
        inputCacheMiss: 8, inputCacheHit: 2, output: 28,
      });
      assert.equal(normalizeApiPrices({ input: Number.NaN, output: 1 }), null);
    });

    test("missing regional price falls back to official USD times FX", () => {
      const result = resolvePlanPrice(plan({ id: "global", region: "GLOBAL", originalPrice: 20, originalCurrency: "USD" }), "CN", makeFixtureSnapshot());
      assert.equal(result?.priceSource, "official");
      assert.equal(result?.priceCny, 144);
      assert.equal(result?.originalAmount, 20);
      assert.equal(result?.originalCurrency, "USD");
    });

- [ ] Step 2: 运行失败测试

    npx --no-install tsx --test tests/recommendation/eligibility-pricing.test.ts

预期：FAIL，eligibility/pricing 模块不存在。

- [ ] Step 3: 实现 eligibility

导出：

    export function isRegionEligible(planRegion: string, userRegion: UserInput["region"]): boolean;
    export function filterEligiblePlans(plans: Plan[], input: UserInput, snapshot?: RecommendationDataSnapshot): Plan[];
    export function canAddPlan(combo: Plan[], candidate: Plan, input: UserInput): boolean;
    export function resolvePresentationTier(plans: Plan[], region: UserInput["region"], snapshot: RecommendationDataSnapshot): PresentationTier;

地区矩阵固定为 CN→CN/GLOBAL、US→US/GLOBAL、JP→JP/GLOBAL、GLOBAL→GLOBAL。过滤顺序固定为 enabled、地区、免费新主订阅、API acceptsApiBilling、数据诊断排除 API；hasForeignCard 只作为输入兼容字段读取，不能参与任何分支。canAddPlan 按 exclusiveGroup 检查同组主订阅最多一个；已有同组低档计划时，候选升级替换旧计划并设置 isUpgrade/upgradeDeltaCny，不把两个档位放入 combo。

- [ ] Step 4: 实现 pricing

导出：

    export type ResolvedPrice = {
      priceCny: number;
      priceSource: "official" | "regional_app_store";
      originalAmount: number;
      originalCurrency: string;
      fxRateToCny: number;
    };
    export function resolvePlanPrice(plan: Plan, region: string, snapshot: RecommendationDataSnapshot): ResolvedPrice | null;
    export function normalizeApiPrices(raw: Plan["pricesPerMToken"]): { inputCacheMiss: number; inputCacheHit: number; output: number } | null;
    export function apiUnitCostCny(plan: Plan, snapshot: RecommendationDataSnapshot): number | null;
    export function actualApiSpendCny(plan: Plan, workloadMTokens: number, snapshot: RecommendationDataSnapshot): number;

固定套餐先查 regional-price 的 region+planId 月价；缺失时用 fixedMonthlyPrice 或 originalPrice 乘 FX；原价缺失/非有限/负数返回 null。CN 没有人民币官网价时也使用 GLOBAL 的 USD 原价换算。API canonical 字段按 inputCacheMiss/input、inputCacheHit/cacheHit、output 的顺序取值，任何字段非有限或负数返回 null。unit cost 使用 policy.apiTokenMix 与 cacheHitRateAssumption 计算；workload=0 时 actualApiSpendCny=0，否则 actualApiSpendCny = rawSpend + max(rawSpend*percentage, minimumFee)，最后统一换算 CNY。

- [ ] Step 5: 运行测试和兼容预算函数

lib/budget.ts 被客户端 ComboCard 引用，因此不导入 pricing 或 data-snapshot。保留 formatPriceCny、classifyBudgetStatus 和旧 resolveMonthlyPrice/getMonthlyPriceCny 的客户端安全实现；为 MonthlyPrice 增加可选原币字段。新推荐引擎只调用 recommendation/pricing.ts 的 resolvePlanPrice，测试同时断言客户端 budget 模块的 import 不触发 node 内置模块。

    npx --no-install tsx --test tests/recommendation/eligibility-pricing.test.ts
    npx eslint lib/recommendation/eligibility.ts lib/recommendation/pricing.ts

预期：四个价格/资格测试 PASS；lint 无 error。

- [ ] Step 6: 提交

    git add lib/recommendation/eligibility.ts lib/recommendation/pricing.ts lib/budget.ts tests/recommendation/eligibility-pricing.test.ts
    git commit -m "feat: enforce region eligibility and normalize pricing"

### Task 6: 需求构建与稳健评分

**Files:**
- Create: lib/recommendation/demand.ts
- Modify: lib/normalize.ts
- Create: tests/recommendation/demand-score.test.ts

- [ ] Step 1: 写失败测试

    test("mobile and IDE are feature preferences, not token capabilities", () => {
      const demand = buildDemand(makeInput({ addOns: ["mobileExperience", "ideIntegration"] }), makeFixtureSnapshot());
      assert.equal(demand.weights.mobileExperience, undefined);
      assert.equal(demand.featurePreferences.mobileExperience, true);
      assert.equal(demand.featurePreferences.ideIntegration, true);
      assert.equal(demand.featurePreferenceCap, 1);
    });

    test("confidence shrink keeps 50 fixed and shrinks low-confidence extremes", () => {
      assert.equal(robustScore(50, "low"), 50);
      assert.equal(robustScore(100, "low"), 92.5);
      assert.equal(robustScore(0, "medium"), 2.5);
    });

- [ ] Step 2: 运行失败测试

    npx --no-install tsx --test tests/recommendation/demand-score.test.ts

预期：FAIL，demand 模块不存在。

- [ ] Step 3: 实现 demand

导出：

    export type DemandPlan = {
      weights: NeedWeights;
      totalDemandMTokens: number;
      highDemandMTokens: number;
      generalDemandMTokens: number;
      featurePreferences: { mobileExperience: boolean; ideIntegration: boolean };
      featurePreferenceCap: number;
    };
    export function normalizeCapabilityWeights(weights: Partial<Record<CapabilityKey, number>>): NeedWeights;
    export function buildDemandFromPresets(input: UserInput, presets: Presets): DemandPlan;
    export function buildDemand(input: UserInput, snapshot: RecommendationDataSnapshot): DemandPlan;
    export function robustScore(rawScore: number, confidence: Confidence): number;
    export function robustQuota(rawQuota: number, confidence: QuotaConfidence): number;

buildDemand 保留主用途 0.7、有效次用途 0.3、addOn 配置加权后归一化；只把 CapabilityKey 写入 weights。monthlyDemandMTokens 小于 0 按 0；为保持现有输入语义，high ratio 使用 low=.2、medium=.5、high=.8、extreme=.95，highDemand=total*ratio，generalDemand=total-highDemand。robustScore 使用 50 + (raw-50)*factor 并 clamp 0..100；not_applicable 的 API quota 不收缩。

- [ ] Step 4: 更新 normalize 兼容层

normalizeCapabilityWeights 和 buildDemandFromPresets 不读取文件；buildDemand 只把 snapshot.presets 传给纯函数。让 lib/normalize.ts 的 buildNeedWeights(input) 调用 buildDemandFromPresets(input, presets).weights；保留 normalizeWeights 和 formatWeights 的公开签名，使客户端/结果页和旧测试继续编译。移除对 mobileExperience/ideIntegration 的 CapabilityKey 强制转换，且 normalize.ts 与 demand.ts 不形成循环依赖。

- [ ] Step 5: 运行测试

    npx --no-install tsx --test tests/recommendation/demand-score.test.ts
    npx eslint lib/recommendation/demand.ts lib/normalize.ts

预期：PASS；add-on 不会凭空产生一个能力需求。

- [ ] Step 6: 提交

    git add lib/recommendation/demand.ts lib/normalize.ts tests/recommendation/demand-score.test.ts
    git commit -m "feat: build demand and robust confidence metrics"

### Task 7: 实现额度池与高智能需求的全局分配

**Files:**
- Create: lib/recommendation/allocation.ts
- Create: tests/recommendation/allocation.test.ts

- [ ] Step 1: 先写三个可验证的失败测试

    test("shared pool is counted once", () => {
      const result = allocateDemand(makeComboWithSharedKimiPool(), makeDemand({ total: 150, high: 0 }), makeFixtureSnapshot());
      assert.ok(result.totalAllocated <= 100 + 1e-6);
      assert.equal(result.poolUsage["kimi:shared"] <= 100, true);
    });

    test("lexicographic objective fills high demand before general quality", () => {
      const result = allocateDemand(makeComboWithHighAndGeneralModels(), makeDemand({ total: 100, high: 50 }), makeFixtureSnapshot());
      assert.ok(result.highAllocated >= 49.999);
      assert.ok(result.generalAllocated <= 50.001);
      assert.equal(result.highestOwnerModelId, "gpt-5.6-sol");
    });

    test("quality denominator includes unallocated demand", () => {
      const result = allocateDemand(makeComboWithQuota(10), makeDemand({ total: 100, high: 0 }), makeFixtureSnapshot());
      assert.equal(result.qualityScore, 9);
      assert.equal(result.totalCoverage, 0.1);
    });

- [ ] Step 2: 运行失败测试

    npx --no-install tsx --test tests/recommendation/allocation.test.ts

预期：FAIL，allocation 模块和 fixture builders 尚不存在。

- [ ] Step 3: 定义 YALPS 模型和四阶段接口

lib/recommendation/allocation.ts 导出：

    export type AllocationResult = {
      allocationDetails: AllocationDetail[];
      totalAllocated: number;
      highAllocated: number;
      generalAllocated: number;
      totalCoverage: number;
      highCoverage: number;
      qualityScore: number;
      poolUsage: Record<string, number>;
      apiSpendCny: number;
      diagnostics: string[];
    };
    export function allocateDemand(combo: Combo, demand: DemandPlan, snapshot: RecommendationDataSnapshot): AllocationResult;

每个可访问 model/capability/layer 生成一个连续变量 x，变量系数为：对应 demand 节点 1、quotaPool 1/(workloadMultiplier * (layer === high ? highTierFactor : 1))、quality 阶段为 robustScore；需求节点容量已经等于 totalDemand*capabilityWeight，因此 quality 不再重复乘权重。模型质量优先取 modelBenchmarkById[modelId].derivedCapabilityScores[capability]，frontend 优先取 frontendFromArena；缺失时才回退套餐 scoreRecord。置信度优先取模型 benchmark coverage，none 时回退套餐 scoreConfidence。每个 quotaPool 只有一个 max=robustQuota(capacity, confidence) 约束，故共享模型不会重复计量。没有模型画像时从 model-tier 生成一个 ${planId}:default 虚拟模型，不能再使用旧的第二套 fallback 系数。

YALPS 模型固定使用方向、目标、constraints、variables、integers 五个字段，依次运行：

    1. objective=highAllocated，记录最优 high；
    2. 加入 highAllocated >= optimum - 1e-7，objective=totalAllocated，记录最优 total；
    3. 加入 highAllocated >= highOpt-1e-7、totalAllocated >= totalOpt-1e-7，objective=quality，记录最优 quality；
    4. 加入前三个约束，direction="minimize"，objective="spend"，得到最低实际 API 花费。

YALPS 返回 variables 数组按变量 ID 排序还原；每个数量四舍五入到 1e-6，负值视为 0。status 不是 optimal 时返回全零 AllocationResult 和 diagnostics["allocation_infeasible"]。

- [ ] Step 4: 加入 API 连续预算变量

API model 变量继续连接 demand 节点，但无固定 quotaPool；每个 API 额外建立整数 useApi 变量（范围 0..1）和连续 feeApi 变量，并加入：

    workload - maxApiWorkload * useApi <= 0
    feeApi - percentage * rawUnitCostCny * workload >= 0
    feeApi - minimumFeeCny * useApi >= 0
    rawUnitCostCny * workload + feeApi <= remainingBudgetCny

maxApiWorkload 为需求目标（总覆盖最多 1.25、高智能最多 1.10）与剩余预算两者的较小值。第四阶段最小化 rawSpend+feeApi，使 feeApi 精确等于百分比费用和最低费用的较大者，也保证不因剩余预算自动购买额度。多个 API 共用同一预算约束，并有 sum(useApi) <= 3 - 新增固定套餐数 的约束，求解器联合选择高智能适配和每元有效额度。

- [ ] Step 5: 运行测试

    npx --no-install tsx --test tests/recommendation/allocation.test.ts

makeComboWithQuota(10) 的 fixture 能力分固定为 90，因此 10/100 的覆盖对应 qualityScore=9。预期：PASS；共享池总消耗不超过一次容量，高智能覆盖先于普通覆盖，额度不足时 qualityScore 按总需求归一化。

- [ ] Step 6: 提交

    git add lib/recommendation/allocation.ts tests/recommendation/allocation.test.ts
    git commit -m "feat: optimize shared quota with lexicographic allocation"

### Task 8: 候选组合、升级替换和 API 补位

**Files:**
- Create: lib/recommendation/candidates.ts
- Create: tests/recommendation/candidates.test.ts

- [ ] Step 1: 写失败测试

    test("one exclusive membership tier per combo", () => {
      const results = recommendWithSnapshot(makeInput({ budgetCny: 200 }), makeFixtureSnapshotWithPlusAndPro());
      for (const result of results) {
        const groups = result.combo.plans.filter((p) => p.exclusiveGroup).map((p) => p.exclusiveGroup);
        assert.equal(new Set(groups).size, groups.length);
      }
    });

    test("existing low tier is replaced by upgrade, never stacked", () => {
      const results = recommendWithSnapshot(makeInput({ existingPlanIds: ["fixture_plus"] }), makeFixtureSnapshotWithPlusAndPro());
      assert.ok(results.some((r) => r.combo.plans.some((p) => p.isUpgrade)));
      assert.ok(results.every((r) => r.combo.plans.filter((p) => p.exclusiveGroup === "fixture_membership").length <= 1));
    });

    test("API is selected only for a measurable deficit", () => {
      const noDeficit = recommendWithSnapshot(makeInput({ acceptsApiBilling: true, monthlyDemandMTokens: 10 }), makeFixtureSnapshot());
      assert.equal(noDeficit[0]?.combo.plans.some((p) => p.recommendationRole === "supplementary_api"), false);
      const deficit = recommendWithSnapshot(makeInput({ acceptsApiBilling: true, monthlyDemandMTokens: 10000, budgetCny: 500 }), makeFixtureSnapshot());
      assert.ok(deficit[0]?.combo.plans.some((p) => p.recommendationRole === "supplementary_api") || deficit[0]?.shortfall);
    });

- [ ] Step 2: 运行失败测试

    npx --no-install tsx --test tests/recommendation/candidates.test.ts

预期：FAIL，candidates orchestrator 尚不存在。

- [ ] Step 3: 实现确定性基底枚举

导出：

    export function generateFixedCandidates(plans: PlanInCombo[], input: UserInput): PlanInCombo[][];
    export function attachApiAllocations(base: Combo, eligibleApis: PlanInCombo[], demand: DemandPlan, snapshot: RecommendationDataSnapshot): Combo;

固定套餐先按 id 排序；已有计划作为不计购买数的基底，再枚举 0、1、2、3 个新增购买，每次加入调用 canAddPlan；新增固定套餐与实际启用 API 的总数不超过 3。组合 key 是排序后的计划 ID。升级候选替换同 exclusiveGroup 的旧计划，并把 upgradeDeltaCny 计入 newPriceCny。固定成本超过 budgetCny*(1+tolerance) 的组合保留为 fallback 但不进入 normal tier。免费主订阅只有在 existingPlanIds 中才允许作为已有方案。

API 不参与固定组合笛卡尔积：将所有 eligible API 作为 allocation 的可选变量，求解后只把 allocatedMTokens > 1e-6 的 API 添加到 combo；API 只承担总需求缺口或高智能缺口，并将 actualApiSpendCny 写入 totalPriceCny。新增套餐有效贡献按 12%/10 个百分点/1.5 分三条规则判定，API 采用至少 5 MTokens 且至少 5% 需求的门槛；不满足则移除。

- [ ] Step 4: 写独立的最小编排函数

在 candidates.test.ts 使用 recommendWithSnapshot(input, snapshot)；lib/recommend.ts 暂时导出该测试入口，公开 recommend(input) 只是调用 loadRecommendationDataSnapshot 后转发。编排顺序固定为 buildDemand → filterEligiblePlans → generateFixedCandidates → resolve prices → allocateDemand → attach API → 生成 ScoredCombo。

- [ ] Step 5: 运行测试

    npx --no-install tsx --test tests/recommendation/candidates.test.ts

预期：PASS；开启 API 不会把预算花完，关闭 API 的结果不含 supplementary_api。

- [ ] Step 6: 提交

    git add lib/recommendation/candidates.ts tests/recommendation/candidates.test.ts lib/recommend.ts
    git commit -m "feat: generate eligible combos and demand-driven API top-ups"

### Task 9: 稳健满意度、Pareto 过滤与确定性排序

**Files:**
- Create: lib/recommendation/ranking.ts
- Create: tests/recommendation/ranking.test.ts

- [ ] Step 1: 写失败的排序性质测试

    test("web bonus cannot rescue a hard coverage failure", () => {
      const weak = scoreCandidate(makeCandidate({ robustTotalCoverage: 0.8, robustHighCoverage: 0.8, webValueBonus: 3.5 }));
      assert.equal(weak.presentationClass, "fallback");
    });

    test("dominated result is removed", () => {
      const a = scoreCandidate(makeCandidate({ comboId: "cheap", price: 100, robustTotalCoverage: 1.1, robustHighCoverage: 1, satisfaction: 90 }));
      const b = scoreCandidate(makeCandidate({ comboId: "dominated", price: 200, robustTotalCoverage: 1, robustHighCoverage: 0.95, satisfaction: 90 }));
      assert.deepEqual(filterPareto([a, b]).map((item) => item.comboId), ["cheap"]);
    });

    test("speed label changes explanation only", () => {
      const fast = scoreCandidate(makeCandidate({ comboId: "fast", speedNotes: ["响应速度较快（仅附加说明）"] }));
      const plain = scoreCandidate(makeCandidate({ comboId: "plain", speedNotes: [] }));
      assert.equal(fast.finalScore, plain.finalScore);
    });

- [ ] Step 2: 运行失败测试

    npx --no-install tsx --test tests/recommendation/ranking.test.ts

预期：FAIL，ranking 模块不存在。

- [ ] Step 3: 实现指标和排序键

导出：

    export function coverageReliabilityScore(total: number, high: number): number;
    export function computeSatisfaction(input: { qualityScore: number; totalCoverage: number; highCoverage: number; webValueBonus: number; featurePreferenceBonus: number }): number;
    export function isParetoDominated(candidate: ScoredCombo, other: ScoredCombo): boolean;
    export function filterPareto(results: ScoredCombo[]): ScoredCombo[];
    export function rankResults(results: ScoredCombo[]): ScoredCombo[];

总覆盖线性映射：0..0.9 映射 0..75，0.9..1.1 映射 75..100；高智能覆盖线性映射：0..0.9 映射 0..75，0.9..1.0 映射 75..100。两者按 40%/60% 合成，排序比较分别在 1.25/1.10 截断。computeSatisfaction 严格使用 quality*0.78 + reliability*0.22 + web + feature，不读取预算利用率、不读取速度、不添加固定互补分。normal 可行要求 robustTotalCoverage >= .9 且 robustHighCoverage >= .9；满意余量奖励只在 coverage cap 内生效。

featurePreferenceBonus 仅对 normal 可行候选计算：mobileExperience 且任一套餐有 mobile_app 加 0.5，ideIntegration 且任一套餐有 ide/ide_plugin 加 0.5，总上限 1.0。dataConfidence 取所有产生有效分配的套餐的 score/quota 置信度中最低一级，未贡献套餐不降低它；比较顺序 high、medium、low。

Pareto 比较价格、满意度、min(total,1.25)、min(high,1.10)，四项都不差且至少一项严格更好才判支配；normal 和 deprioritized 分层分别过滤。排序键依次为可行状态、presentation tier、floor((groupBest-satisfaction)/2)、price、plan count、satisfaction、data confidence、comboId。相等时使用字符串 compare，禁止依赖原数组顺序。

rankResults 后设置 recommendationCategory：总排序第一名为 best；同一 normal 可行层中最低价且 qualityScore 不低于组内最高值 5 分的方案为 budget；robustHighCoverage 和高智能分配质量组合最高者为 high_intelligence；min(robustTotalCoverage,1.25) 最高者为 quota；deprioritized 或未入前述类别者为 other。类别只选择展示卡片，不反向改变排序。

- [ ] Step 4: 运行测试

    npx --no-install tsx --test tests/recommendation/ranking.test.ts

预期：PASS；速度不改变 finalScore，网页加成不绕过门槛，被支配组合消失。

- [ ] Step 5: 提交

    git add lib/recommendation/ranking.ts tests/recommendation/ranking.test.ts
    git commit -m "feat: rank by robust satisfaction and Pareto efficiency"

### Task 10: 结果解释和公开入口迁移

**Files:**
- Create: lib/recommendation/explanations.ts
- Modify: lib/recommend.ts
- Modify: lib/scoring.ts only for an explicit deprecated comment/export removal after switch
- Create: tests/recommendation/recommendation-api.test.ts

- [ ] Step 1: 写失败的兼容和解释测试

    test("public recommend keeps legacy fields and adds stable metadata", () => {
      const result = recommendWithSnapshot(makeInput(), makeFixtureSnapshot())[0];
      assert.ok(result);
      assert.equal(typeof result.capabilityScore, "number");
      assert.equal(typeof result.finalScore, "number");
      assert.equal(typeof result.comboId, "string");
      assert.equal(result.algorithmVersion, "satisfaction-v1");
      assert.ok(result.reasons.some((reason) => reason.includes("高智能") || reason.includes("覆盖")));
    });

    test("shortfall explains budget and confidence risk", () => {
      const result = recommendWithSnapshot(makeInput({ monthlyDemandMTokens: 10000, budgetCny: 10 }), makeFixtureSnapshot())[0];
      assert.ok(result);
      assert.ok(result.cautions.some((caution) => caution.includes("不足") || caution.includes("置信度")));
    });

- [ ] Step 2: 运行失败测试

    npx --no-install tsx --test tests/recommendation/recommendation-api.test.ts

预期：FAIL，新入口和 explanations 不存在。

- [ ] Step 3: 实现 explanations

导出：

    export function buildReasons(candidate: ScoredCombo, demand: DemandPlan): string[];
    export function buildCautions(candidate: ScoredCombo, demand: DemandPlan): string[];
    export function buildShortfall(candidate: ScoredCombo, demand: DemandPlan): { totalMTokens: number; highMTokens: number; budgetCny: number } | undefined;

理由固定按以下顺序：主要能力分配最高的套餐；承担高智能需求的模型标签；稳健总/高覆盖；新增套餐的边际贡献；GPT webValueBonus。警告固定按以下顺序：预算超限/缺口、低置信度额度、CN Anthropic 降级、原币价格和 FX、speedNotes（明确附注“只供参考，不参与排序”）。缺失信号只跳过，不抛异常。

- [ ] Step 4: 切换 lib/recommend.ts

lib/recommend.ts 保持：

    export function recommend(input: UserInput): ScoredCombo[];
    export function buildNeedWeights(input: UserInput): NeedWeights;
    export type { UserInput, ScoredCombo, CapabilityKey } from "./types";

新增内部 export recommendWithSnapshot(input, snapshot) 供测试。公开 recommend 和 buildNeedWeights 各自只加载一次 snapshot；后者返回 buildDemand(input, snapshot).weights。recommend 构建候选、分配、评分、解释、rankResults，并在正常结果为空时返回按覆盖接近度排序的前三个 fallback。删除旧的 computeBudgetUtilizationAdjustment、computeComboAdjustment 固定互补分调用；lib/scoring.ts 暂时保留但不再被入口引用，在最终验证后删除或改为 @deprecated re-export。

- [ ] Step 5: 运行兼容测试和类型检查

    npx --no-install tsx --test tests/recommendation/recommendation-api.test.ts
    npx tsc --noEmit

预期：测试 PASS；旧 capabilityScore、finalScore、reasons、cautions 仍存在，TypeScript 无 error。

- [ ] Step 6: 提交

    git add lib/recommendation/explanations.ts lib/recommend.ts tests/recommendation/recommendation-api.test.ts
    git commit -m "feat: switch public recommendations to satisfaction engine"

### Task 11: API、结果页和卡片展示迁移

**Files:**
- Modify: app/api/recommend/route.ts
- Modify: app/api/admin/route.ts
- Modify: app/result/page.tsx
- Modify: components/ComboCard.tsx
- Modify: components/AllResults.tsx
- Create: tests/recommendation/route-contract.test.ts

- [ ] Step 1: 写失败的响应契约测试

    test("recommend response exposes algorithm and data versions", async () => {
      const response = await postRecommend({ budgetCny: 300, monthlyDemandMTokens: 100, region: "CN" });
      const body = await response.json();
      assert.equal(body.version, "satisfaction-v1");
      assert.match(body.dataVersion, /^recommendation-/);
      assert.ok(Array.isArray(body.results));
    });

    test("card flag is accepted but does not alter result IDs", async () => {
      const a = await postRecommend({ ...baseRequest, hasForeignCard: false });
      const b = await postRecommend({ ...baseRequest, hasForeignCard: true });
      assert.deepEqual((await a.json()).results.map((r: ScoredCombo) => r.comboId), (await b.json()).results.map((r: ScoredCombo) => r.comboId));
    });

- [ ] Step 2: 运行失败测试

    npx --no-install tsx --test tests/recommendation/route-contract.test.ts

预期：FAIL，响应仍返回 v0.4.3 或 card 影响逻辑。

- [ ] Step 3: 修改 route

保留所有现有输入字段和 normalizeRequest；hasForeignCard 继续写入 UserInput 但不参与算法。响应固定为：

    {
      results,
      assumptions: [
        "地区按 CN/US/JP/GLOBAL 资格矩阵筛选",
        "固定套餐按地区价或官方原币汇率换算",
        "网页版加成只影响满意度，不绕过额度门槛",
        "响应速度仅作为附加说明"
      ],
      version: "satisfaction-v1",
      algorithmVersion: "satisfaction-v1",
      dataVersion: results[0]?.dataVersion ?? loadRecommendationDataSnapshot().dataVersion,
      feedbackContractVersion: "feedback-contract-v1"
    }

app/api/admin/route.ts 每次成功写 plans/scores/quotas/model-access-profiles 等文件后调用 invalidateRecommendationDataSnapshot()；失败写入不失效缓存。

- [ ] Step 4: 修改结果页

删除 budgetUtilizationScore 和 highQuotaCandidateScore 中的预算利用率项；highQuotaPick 改按 robustTotalCoverage、robustHighCoverage、qualityScore、price 选择，performancePick 只在同一可行层内按 qualityScore 选择。若 results[0] 是 fallback，页面不再显示“无结果”空白，而渲染其 cautions/shortfall。参数面板继续显示 card，但文案改为“暂不作为排序因素”。

- [ ] Step 5: 修改 ComboCard/AllResults

新增稳健总覆盖、高智能覆盖、数据置信度、实际 API 花费、原币金额/汇率和 speedNotes 的只读展示；speedNotes 旁固定渲染“仅附加说明”。使用 optional chaining 保证旧响应可渲染。不要在组件中重新计算或改变排序。

- [ ] Step 6: 运行测试和构建

    npx --no-install tsx --test tests/recommendation/route-contract.test.ts
    npm run lint
    npm run build

预期：契约测试 PASS；lint/build 成功；结果页无对旧 budget utilization 的引用。

- [ ] Step 7: 提交

    git add app/api/recommend/route.ts app/api/admin/route.ts app/result/page.tsx components/ComboCard.tsx components/AllResults.tsx tests/recommendation/route-contract.test.ts
    git commit -m "feat: expose robust recommendation explanations in UI"

### Task 12: 黄金场景与数据校准回归

**Files:**
- Create: tests/recommendation/golden-scenarios.json
- Create: tests/recommendation/golden.test.ts
- Create: tests/recommendation/calibration.test.ts
- Modify: data/scores.json only when a test exposes a verified calibration regression

- [ ] Step 1: 写入至少 30 个明确场景

golden-scenarios.json 每条记录必须包含 id、完整 input，以及 mustContainAnyTopN、mustNotContainPair、mustReturnFallback 中至少一项。第一条固定为：

    {
      "id": "cn-agent-medium",
      "input": {
        "budgetCny": 300, "monthlyDemandMTokens": 300,
        "primaryUseCase": "agent_coding", "secondaryUseCase": "none",
        "region": "CN", "acceptsApiBilling": false, "hasForeignCard": false,
        "highIntelligenceRatioPreset": "medium", "addOns": []
      },
      "mustContainAnyTopN": { "planIds": ["chatgpt_plus", "kimi_moderato_cn"], "n": 5 },
      "mustNotContainPair": [["chatgpt_plus", "chatgpt_pro_5x"]],
      "mustReturnFallback": false
    }

mustContainAnyTopN 的语义是前 n 个结果任一组合包含 planIds 中至少一个；mustNotContainPair 对所有返回组合生效；mustReturnFallback 要求首项有 shortfall。其余 29 个场景明确覆盖：CN/US/JP/GLOBAL 各 4 个、agent/backend/frontend/research/writing 各 2 个、low/medium/high/extreme 各 1 个、预算不足 3 个、API 开关 2 个、已有低档升级 2 个、mobile/IDE 各 1 个、Claude CN 降级 1 个、GPT Pro 高难度 1 个、API 补位 1 个。每个场景至少有一条禁止项或排名区间，禁止使用随机期望。

- [ ] Step 2: 写失败的黄金和锚点测试

golden.test.ts 读取 JSON，逐场景调用 recommendWithSnapshot；按上述定义断言 mustContainAnyTopN、mustNotContainPair、mustReturnFallback 和 stable comboId。calibration.test.ts 用 modelBenchmarkById 的 derivedCapabilityScores 检查 agentCoding/backend 相邻顺序差不超过 3 分反转阈值；frontend 使用 frontendFromArena，并只检查有 Arena 记录的 ID；Opus 5/4.8 必须保留两个独立 benchmark ID，校准文件不把两者硬编码为等分。

    test("budget monotonicity", () => {
      const low = rankResults(recommendWithSnapshot(makeInput({ budgetCny: 200 }), snapshot));
      const high = rankResults(recommendWithSnapshot(makeInput({ budgetCny: 400 }), snapshot));
      assert.ok((high[0]?.finalScore ?? 0) + 1e-6 >= (low[0]?.finalScore ?? 0));
    });

- [ ] Step 3: 运行并修正校准数据

    npx --no-install tsx --test tests/recommendation/golden.test.ts tests/recommendation/calibration.test.ts

若真实数据违反 GPT-5.6 Sol ≥ Kimi K3 ≥ GPT-5.5、GLM 5.2 不高于 Grok 4.5、Kimi 2.7 Code 不高于 GLM 5.2，测试输出 capability、model IDs、原始分、置信度和 scoreBasis；只在有 Arena/社区证据时修改 data/scores.json，并把证据写入 notes。Opus 5 与 Opus 4.8 始终分开校准。

同一测试读取 Kimi 199 的 ccusage 记录，断言 294*52/12 四舍五入为 1274 MTokens/月，并检查 notes 含“缓存 workload 不等于新生成 token”；它只验证 quotas.json 估算是否在合理量级，不直接覆盖 quota pool。

- [ ] Step 4: 提交

    git add tests/recommendation/golden-scenarios.json tests/recommendation/golden.test.ts tests/recommendation/calibration.test.ts data/scores.json
    git commit -m "test: lock recommendation golden scenarios and anchors"

### Task 13: 性能、全量验证和旧算法收尾

**Files:**
- Create: tests/recommendation/performance.test.ts
- Modify: lib/scoring.ts only after all new tests pass
- Modify: README.md or docs/v0.2-algorithm-design.md with migration notes

- [ ] Step 1: 写性能和读取次数失败测试

performance.test.ts 使用 fixture snapshot，先调用 5 次预热，再调用 20 次；用 performance.now() 排序耗时并取 p95。加载层使用可计数 readJson 注入，断言：

    assert.ok(p95 < 250, "warm recommendation p95 must be below 250ms");
    assert.equal(Math.max(...readCounts.values()), 1);

- [ ] Step 2: 运行性能测试确认基线

    npx --no-install tsx --test tests/recommendation/performance.test.ts

预期：新分配器接入前可能 FAIL；输出 p50、p95、candidate count、variable count。

- [ ] Step 3: 优化并验证

只允许以下优化，不改变排序语义：快照按 mtime signature 复用；plan/score/quota/profile 使用 Map；候选 ID 先排序并在生成长度 3 前排除同组；YALPS 变量只为有正权重能力和正需求层生成；解释文本在排序后生成；API 只保留有正有效单价的候选。再次运行：

    npx --no-install tsx --test tests/recommendation/performance.test.ts
    npm run validate:data
    npm run lint
    npx tsc --noEmit
    npm run build

预期：所有测试 PASS，p95 < 250ms，validate:data 无 error，lint/typecheck/build 成功。

- [ ] Step 4: 做旧算法和遗留标记清理

运行：

    rg -n "computeBudgetUtilizationAdjustment|computeComboAdjustment|estimateApiQuota" lib app tests docs/superpowers/plans/2026-08-01-satisfaction-first-recommendation.md

删除旧入口不可达的 scoring 辅助函数；若保留 lib/scoring.ts 仅保留带 @deprecated 的 re-export，不保留第二套会被调用的排序逻辑。删除结果页预算利用率排序代码。把 docs/v0.2-algorithm-design.md 增加迁移说明：旧 finalScore 仅兼容字段，新排序以 robust satisfaction 为准；记录 algorithmVersion/dataVersion/feedbackContractVersion。

- [ ] Step 5: 最终验证

    npm test
    npm run validate:data
    npm run lint
    npx tsc --noEmit
    npm run build
    git diff --check
    git status --short

预期：全部退出码 0；git diff --check 无输出；工作区只包含本计划允许的源代码、数据、测试和文档变更。运行一次 POST smoke test，确认 JSON 中 results 非空、version 为 satisfaction-v1、每个结果有稳定 comboId。

- [ ] Step 6: 提交

    git add lib app components data scripts tests package.json package-lock.json README.md docs
    git commit -m "feat: ship satisfaction-first subscription recommender"

## 计划自审清单

- 规格覆盖：地区矩阵和美元 FX 在 Task 5；互斥组/额度池在 Task 4；置信度和专家锚点在 Task 2/6/12；全局分配和 API 动态预算在 Task 7/8；满意度/Pareto/降级展示在 Task 9；解释和版本契约在 Task 10/11；反馈契约版本在 Task 11；一次读取和 p95 在 Task 3/13；30+ 黄金场景在 Task 12；迁移兼容字段在 Task 10/11。
- 清理检查：计划没有未定义的后续工作；每个实现步骤都给出明确路径、导出签名、常数、命令和预期结果。
- 类型一致性：RecommendationDataSnapshot、DemandPlan、AllocationResult、ScoredCombo 新字段在前置任务定义，后续任务只使用这些名称；公开 recommend 和 buildNeedWeights 签名不变。
- 约束复核：hasForeignCard 不参与过滤或评分；速度只进入 explanations；Claude CN 仅降级而非删除；网页加成不能绕过覆盖门槛；预算不会因剩余金额自动花完；API 价格别名不会产生 NaN。

## 执行交接

计划完成并保存到 docs/superpowers/plans/2026-08-01-satisfaction-first-recommendation.md。下一步二选一：

1. Subagent-Driven（推荐）：每个任务派一个新子代理，任务间做两阶段审查，适合这组相互独立的模块。
2. Inline Execution：在当前会话按 executing-plans 分批执行，并在每个检查点停下复核。

请回复 1 或 2。
