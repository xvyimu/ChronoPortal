"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";

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
      setError(data.error || "密码错误");
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="mb-6 text-center text-lg font-medium text-foreground/80">
          管理面板
        </h1>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="密码"
            className="w-full rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm text-foreground/80 placeholder:text-muted-foreground/30 outline-none transition-colors focus:border-white/[0.12] focus:bg-white/[0.04]"
            autoFocus
          />
          {error && <p className="text-xs text-red-400/70">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-foreground/[0.08] py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-foreground/[0.12] disabled:opacity-50"
          >
            {loading ? "验证中..." : "登录"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}