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
    <main className="flex-1 min-h-screen bg-stone-50 flex flex-col relative overflow-hidden">
      {/* Top Navbar */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <span className="h-7 w-7 rounded bg-neutral-900 flex items-center justify-center font-bold text-white text-xs">
            荐
          </span>
          <span className="font-bold text-neutral-900 tracking-tight text-sm sm:text-base">
            SubPlan
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <LanguageToggle />
          {SHOW_ADMIN_ENTRY && (
            <a
              href={`/admin${lang === "en" ? "?lang=en" : ""}`}
              className="rounded-xl border border-stone-200 bg-white/80 px-4 py-2 text-xs font-semibold text-neutral-700 hover:text-neutral-900 hover:border-stone-350 transition-all"
            >
              {t.adminLink}
            </a>
          )}
        </div>
      </div>

      {/* Main Form content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-2xl text-center space-y-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 border border-neutral-200 px-3 py-1 text-xs font-semibold text-neutral-700">
            {t.previewTag}
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight text-neutral-900 sm:text-5xl leading-[1.15]">
            SubPlan
          </h1>
          <p className="max-w-md mx-auto text-base sm:text-lg text-stone-500 font-medium leading-relaxed">
            {t.subtitle}
          </p>
        </div>

        <div className="mt-10 w-full flex justify-center">
          <RecommendForm lang={lang} />
        </div>

        {/* Footer caveats */}
        <div className="mt-12 max-w-xl text-center text-xs text-stone-400 font-medium leading-relaxed">
          <p>
            {t.footer1}
          </p>
          <p className="mt-1 text-stone-350">
            {t.footer2}
          </p>
        </div>
      </div>
    </main>
  );
}
