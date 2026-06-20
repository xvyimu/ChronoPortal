import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-white/5 bg-gradient-to-b from-transparent to-black/30">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
          <p>
            © 2026{" "}
            <Link href="https://yuanjia1314.ccwu.cc" className="text-primary/80 hover:text-primary transition-colors">
              公益API导航站
            </Link>
            {" · "}收录公益AI中转站，助你实现Token自由
          </p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground/60">
            <Link href="https://halo.oneln.org/" target="_blank" className="hover:text-primary transition-colors">
              ✦ oneLN
            </Link>
            <span className="text-border">|</span>
            <span className="inline-flex items-center gap-1">
              <span className="text-amber-400/70">★</span>
              <span className="bg-gradient-to-r from-amber-300/80 to-amber-500/80 bg-clip-text text-transparent">
                本站满天星
              </span>
              <span className="text-amber-400/70">★</span>
            </span>
            <span className="text-border">|</span>
            <Link href="/submit" className="hover:text-primary transition-colors">
              提交站点
            </Link>
            <span className="text-border">|</span>
            <Link href="/admin" className="hover:text-primary transition-colors">
              管理
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
