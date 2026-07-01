import RecommendForm from "@/components/RecommendForm";
import LanguageToggle from "@/components/LanguageToggle";
import { dict, type Locale } from "@/lib/locales";

const SHOW_ADMIN_ENTRY = process.env.NEXT_PUBLIC_ENABLE_ADMIN === "1";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const resolvedParams = await searchParams;
  const lang: Locale = resolvedParams.lang === "en" ? "en" : "zh";
  const t = dict[lang];

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
        
        <div className="flex items-center gap-3">
          <LanguageToggle />
          {SHOW_ADMIN_ENTRY && (
            <a
              href={`/admin${lang === "en" ? "?lang=en" : ""}`}
              className="rounded-xl border border-zinc-200 bg-white/70 backdrop-blur-md px-4 py-2 text-xs font-semibold text-zinc-650 hover:text-zinc-900 hover:border-zinc-300 hover:shadow-sm transition-all"
            >
              {t.adminLink}
            </a>
          )}
        </div>
      </div>

      {/* Main Form content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-2xl text-center space-y-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
            {t.previewTag}
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl bg-gradient-to-r from-zinc-900 via-zinc-800 to-blue-900 bg-clip-text text-transparent leading-[1.15]">
            SubPlan
          </h1>
          <p className="max-w-md mx-auto text-base sm:text-lg text-zinc-500 font-medium">
            {t.subtitle}
          </p>
        </div>

        <div className="mt-10 w-full flex justify-center">
          <RecommendForm lang={lang} />
        </div>

        {/* Footer caveats */}
        <div className="mt-12 max-w-xl text-center text-xs text-zinc-400 font-medium leading-relaxed">
          <p>
            {t.footer1}
          </p>
          <p className="mt-1">
            {t.footer2}
          </p>
        </div>
      </div>
    </main>
  );
}
