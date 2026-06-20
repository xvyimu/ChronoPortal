"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push("/admin");
    } else {
      const data = await res.json();
      setError(data.error || "登录失败");
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-sky-950 via-slate-900 to-slate-950">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
        <h1 className="mb-6 text-center text-2xl font-bold text-white">
          🔐 管理面板
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="输入管理员密码"
            className="w-full rounded-lg border border-white/10 bg-white/10 px-4 py-2.5 text-white placeholder-white/40 outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
            autoFocus
          />
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-sky-500 px-4 py-2.5 font-medium text-white transition hover:bg-sky-400 disabled:opacity-50"
          >
            {loading ? "验证中..." : "登 录"}
          </button>
        </form>
      </div>
    </div>
  );
}