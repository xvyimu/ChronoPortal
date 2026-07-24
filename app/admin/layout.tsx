import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, Compass } from "lucide-react";
import { getAdminSession } from "@/lib/auth";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminQueryProvider } from "@/components/admin/AdminQueryProvider";
import LogoutButton from "@/components/admin/LogoutButton";

/**
 * 管理后台布局：鉴权二次校验 + 侧栏/移动顶栏 + 唯一 main landmark（id=main-content）。
 * AppChrome 在 /admin 下不包 main，避免嵌套 landmark。
 * session 经 getAdminSession（React.cache）与 page 同请求去重。
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();
  const role = session?.user?.role;

  // 纵深防御：middleware 已拦截，此处二次确认 role
  if (!session?.user || role !== "admin") {
    redirect("/login");
  }

  return (
    <div className="admin-shell min-h-screen bg-[var(--admin-canvas)] text-[var(--admin-text)]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-[var(--admin-border)] bg-white md:flex">
        <div className="flex h-18 items-center gap-3 border-b border-[var(--admin-border)] px-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--admin-primary)] text-white">
            <Compass className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">导航站管理</p>
            <p className="text-xs text-[var(--admin-muted)]">内容与分类工作台</p>
          </div>
        </div>

        <div className="flex-1 px-3 py-5">
          <AdminNav />
        </div>

        <div className="space-y-1 border-t border-[var(--admin-border)] p-3">
          <Link
            href="/"
            className="flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-[var(--admin-muted)] transition-colors hover:bg-[var(--admin-surface)] hover:text-[var(--admin-text)]"
          >
            <ArrowUpRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            返回前台
          </Link>
          <LogoutButton />
        </div>
      </aside>

      <div className="min-h-screen md:pl-60">
        <header className="sticky top-0 z-20 border-b border-[var(--admin-border)] bg-white/95 px-4 backdrop-blur md:hidden">
          <div className="flex h-14 items-center justify-between gap-3">
            <Link href="/admin" className="flex items-center gap-2 text-sm font-semibold">
              <Compass className="h-5 w-5 text-[var(--admin-primary)]" strokeWidth={1.75} />
              导航站管理
            </Link>
            <Link
              href="/"
              aria-label="返回前台"
              className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--admin-muted)] hover:bg-[var(--admin-surface)] hover:text-[var(--admin-text)]"
            >
              <ArrowUpRight className="h-4 w-4" strokeWidth={1.75} />
            </Link>
          </div>
          <div className="pb-2">
            <AdminNav compact />
          </div>
        </header>

        <AdminQueryProvider>
          <main
            id="main-content"
            className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
          >
            {children}
          </main>
        </AdminQueryProvider>
      </div>
    </div>
  );
}
