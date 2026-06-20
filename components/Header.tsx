import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-background/70 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/50">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="group flex items-center gap-2 font-semibold text-lg tracking-tight">
          <span className="inline-block transition-transform duration-300 group-hover:scale-110">🌐</span>
          <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_100%] animate-[shimmer_4s_ease-in-out_infinite]">
            公益API导航
          </span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link
            href="/submit"
            className="inline-flex items-center justify-center rounded-xl bg-primary/20 border border-primary/20 px-4 py-1.5 text-sm font-medium text-primary transition-all duration-200 hover:bg-primary/30 hover:border-primary/30 hover:shadow-[0_0_20px_oklch(0.72_0.15_220/25%)] active:scale-[0.97]"
          >
            提交站点
          </Link>
        </nav>
      </div>
    </header>
  );
}
