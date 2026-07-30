import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex-1 min-h-screen bg-stone-50 flex flex-col items-center justify-center px-4 text-center">
      <p className="text-6xl font-black tracking-tight text-neutral-900 tnum">404</p>
      <p className="mt-3 text-sm font-medium text-stone-500">
        页面不存在 / Page not found
      </p>
      <Link
        href="/"
        className="mt-6 rounded-xl bg-neutral-900 hover:bg-neutral-800 px-5 py-3 text-sm font-bold text-white shadow transition-all active:scale-[0.99]"
      >
        返回首页 / Back to home
      </Link>
    </main>
  );
}
