import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-white/[0.06]">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground/40">
          <p>
            © 2026 公益API导航站 · 收录公益AI中转站
          </p>
          <div className="flex items-center gap-3 text-muted-foreground/30">
            <Link href="/submit" className="hover:text-muted-foreground/60 transition-colors">
              提交
            </Link>
            <span>·</span>
            <Link href="/admin" className="hover:text-muted-foreground/60 transition-colors">
              管理
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}