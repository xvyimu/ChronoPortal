"use client";

import { Loader2, LogOut } from "lucide-react";
import { useLogout } from "@/hooks/useLogout";

/** 管理后台退出按钮；loading 期间禁用，避免重复提交。 */
export default function LogoutButton() {
  const { logout, loading } = useLogout();

  return (
    <button
      onClick={logout}
      disabled={loading}
      className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-sm font-medium text-[var(--admin-muted)] transition-colors hover:bg-[var(--admin-danger-soft)] hover:text-[var(--admin-danger)] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <LogOut className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
      )}
      {loading ? "退出中..." : "退出"}
    </button>
  );
}
