import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-background/70 backdrop-blur-sm">
      <div className="mx-auto flex h-12 max-w-4xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 text-sm font-medium tracking-tight text-foreground/80">
          公益API导航
        </Link>
        <nav className="flex items-center gap-1">
          <Link
            href="/submit"
            className="inline-flex h-7 items-center justify-center rounded px-2.5 text-xs text-muted-foreground/70 transition-colors hover:text-foreground"
          >
            提交
          </Link>
          <Link
            href="/admin"
            className="inline-flex h-7 items-center justify-center rounded px-2.5 text-xs text-muted-foreground/70 transition-colors hover:text-foreground"
          >
            管理
          </Link>
        </nav>
      </div>
    </header>
  );
}
