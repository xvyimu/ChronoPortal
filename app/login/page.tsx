"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, Compass, Eye, EyeOff, Loader2, LockKeyhole } from "lucide-react";

/**
 * 管理员登录页：同源 credentials 登录，统一错误文案，异常时恢复 loading 且不误跳转 /admin。
 */
export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  /** 提交密码：try/catch/finally 保证网络异常或空返回时恢复按钮并显示通用错误。 */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 统一走 NextAuth 的 /api/auth/callback/credentials 路径
      // authorize 回调内部做：IP 限流（fail-close）+ 恒定时间密码校验 + recordAttempt
      const result = await signIn("credentials", {
        password,
        redirect: false,
      });

      if (!result) {
        // 空返回视为服务不可用，避免误进入 /admin
        setError("登录服务暂不可用，请稍后重试");
        return;
      }

      if (result.error) {
        // NextAuth 不会区分错误原因，统一显示「密码错误或操作过于频繁」
        // 防止枚举攻击：不在客户端暴露是 rate-limit 还是密码错误
        setError("密码错误或操作过于频繁，请稍后再试");
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      // 网络异常等：不暴露内部细节
      setError("登录服务暂不可用，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      id="main-content"
      className="admin-shell relative flex min-h-screen items-center justify-center overflow-hidden bg-white px-4 py-12 text-[var(--admin-text)]"
    >
      <Link
        href="/"
        className="absolute left-4 top-4 z-10 flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-[var(--admin-muted)] transition-colors hover:bg-[var(--admin-surface)] hover:text-[var(--admin-text)] sm:left-6 sm:top-6"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        返回前台
      </Link>

      <section className="admin-panel relative z-10 w-full max-w-[400px] p-7 sm:p-8" aria-labelledby="login-title">
        <div className="mb-7">
          <span className="mb-5 flex h-10 w-10 items-center justify-center rounded-md bg-[var(--admin-primary)] text-white">
            <Compass className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <h1 id="login-title" className="text-2xl font-semibold leading-tight">
            登录管理后台
          </h1>
          <p className="mt-2 text-sm text-[var(--admin-muted)]">仅限管理员访问</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="admin-password" className="mb-1.5 block text-sm font-medium">
              管理员密码
            </label>
            <div className="relative">
              <LockKeyhole
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--admin-faint)]"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="输入密码"
                className="field-input pl-10 pr-11"
                autoComplete="current-password"
                autoFocus
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="admin-icon-button absolute right-1.5 top-1/2 -translate-y-1/2"
                aria-label={showPassword ? "隐藏密码" : "显示密码"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" strokeWidth={1.75} />
                ) : (
                  <Eye className="h-4 w-4" strokeWidth={1.75} />
                )}
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-md bg-[var(--admin-danger-soft)] px-3 py-2 text-sm text-[var(--admin-danger)]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-[var(--admin-primary)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--admin-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {loading ? "正在验证" : "登录"}
          </button>
        </form>
      </section>
    </main>
  );
}
