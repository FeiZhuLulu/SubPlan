"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function LanguageToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentLang = searchParams.get("lang");
  const isEn = currentLang === "en";

  const handleToggle = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (isEn) {
      params.delete("lang");
    } else {
      params.set("lang", "en");
    }
    const query = params.toString();
    const newUrl = query ? `${pathname}?${query}` : pathname;
    router.push(newUrl);
  };

  return (
    <button
      onClick={handleToggle}
      className="rounded-xl border border-stone-200 bg-white/80 hover:bg-stone-50 px-3.5 py-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 hover:border-stone-300 hover:shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
    >
      <span>{isEn ? "🇨🇳 中文" : "🇺🇸 English"}</span>
    </button>
  );
}
