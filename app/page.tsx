import RecommendForm from "@/components/RecommendForm";

const SHOW_ADMIN_ENTRY = process.env.NEXT_PUBLIC_ENABLE_ADMIN === "1";

export default function Home() {
  return (
    <main className="flex-1 min-h-screen bg-zinc-50 flex flex-col relative overflow-hidden">
      {/* Decorative ambient blobs */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-tr from-blue-200/20 to-indigo-300/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-12 left-1/4 w-[600px] h-[600px] bg-gradient-to-tr from-purple-200/10 to-blue-200/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navbar */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <span className="h-7 w-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/25">
            荐
          </span>
          <span className="font-bold text-zinc-950 tracking-tight text-sm sm:text-base">
            SubPlan
          </span>
        </div>
        {SHOW_ADMIN_ENTRY && (
          <a
            href="/admin"
            className="rounded-xl border border-zinc-200 bg-white/70 backdrop-blur-md px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-900 hover:border-zinc-300 hover:shadow-sm transition-all"
          >
            ⚙️ 数据管理后台
          </a>
        )}
      </div>

      {/* Main Form content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-2xl text-center space-y-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
            ✨ SubPlan v0.2 预览版
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl bg-gradient-to-r from-zinc-900 via-zinc-800 to-blue-900 bg-clip-text text-transparent leading-[1.15]">
            SubPlan
          </h1>
          <p className="max-w-md mx-auto text-base sm:text-lg text-zinc-500 font-medium">
            根据您的预算、月度用量和具体技能倾向，利用额度分配算法为您量身匹配最适合的 AI 服务组合。
          </p>
        </div>

        <div className="mt-10 w-full flex justify-center">
          <RecommendForm />
        </div>

        {/* Footer caveats */}
        <div className="mt-12 max-w-xl text-center text-xs text-zinc-400 font-medium leading-relaxed">
          <p>
            v0.1 仅收录和计算稳定官方渠道（官方订阅、API 计费、以及优质稳定聚合平台）。
          </p>
          <p className="mt-1">
            缓存命中率默认按 95% 进行用量折合计算，实际消耗会因上下文深度与使用场景而异。
          </p>
        </div>
      </div>
    </main>
  );
}
