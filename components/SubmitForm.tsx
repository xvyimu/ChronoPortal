"use client";

import { useState } from "react";
import { type Category } from "@/lib/types";
import { motion } from "motion/react";

export function SubmitForm({ categories }: { categories: Category[] }) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");

    const form = e.currentTarget;
    const data = {
      title: (form.elements.namedItem("title") as HTMLInputElement).value,
      url: (form.elements.namedItem("url") as HTMLInputElement).value,
      description: (form.elements.namedItem("description") as HTMLTextAreaElement).value,
      category_id: (form.elements.namedItem("category_id") as HTMLSelectElement).value,
    };

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (res.ok) {
        setStatus("success");
        setMessage("提交成功！审核通过后将展示在导航中。");
        form.reset();
      } else {
        setStatus("error");
        setMessage(result.error || "提交失败，请重试");
      }
    } catch {
      setStatus("error");
      setMessage("网络错误，请重试");
    }
  }

  if (status === "success") {
    return (
      <motion.div
        className="flex flex-col items-center gap-4 glass-card rounded-xl p-8 text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <span className="text-4xl">✅</span>
        <p className="text-lg font-medium text-foreground">{message}</p>
        <button
          onClick={() => setStatus("idle")}
          className="text-sm text-muted-foreground/60 hover:text-foreground underline-offset-2 hover:underline transition-colors"
        >
          继续提交
        </button>
      </motion.div>
    );
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="space-y-5 glass-card rounded-xl p-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <div>
        <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-foreground/80">
          站点名称 <span className="text-red-400">*</span>
        </label>
        <input
          id="title"
          name="title"
          required
          placeholder="例如：ChatGPT"
          className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/30 outline-none transition-all duration-200 focus:border-primary/30 focus:bg-white/[0.06]"
        />
      </div>

      <div>
        <label htmlFor="url" className="mb-1.5 block text-sm font-medium text-foreground/80">
          站点 URL <span className="text-red-400">*</span>
        </label>
        <input
          id="url"
          name="url"
          type="url"
          required
          placeholder="https://example.com"
          className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/30 outline-none transition-all duration-200 focus:border-primary/30 focus:bg-white/[0.06]"
        />
      </div>

      <div>
        <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-foreground/80">
          简短描述
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          placeholder="一句话介绍这个站点..."
          className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/30 outline-none transition-all duration-200 focus:border-primary/30 focus:bg-white/[0.06] resize-none"
        />
      </div>

      <div>
        <label htmlFor="category_id" className="mb-1.5 block text-sm font-medium text-foreground/80">
          分类
        </label>
        <select
          id="category_id"
          name="category_id"
          className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-foreground outline-none transition-all duration-200 focus:border-primary/30 focus:bg-white/[0.06]"
        >
          <option value="">选择分类</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.icon} {cat.name}
            </option>
          ))}
        </select>
      </div>

      {status === "error" && (
        <p className="text-sm text-red-400">{message}</p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={status === "loading"}
          className="flex-1 rounded-lg bg-gradient-to-r from-primary to-accent/80 px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all duration-200 hover:shadow-[0_0_24px_oklch(0.72_0.15_220/30%)] disabled:opacity-50 active:scale-[0.98]"
        >
          {status === "loading" ? "提交中..." : "免费提交"}
        </button>
        <button
          type="button"
          disabled
          title="付费优选即将上线"
          className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-muted-foreground/40 cursor-not-allowed"
        >
          💎 付费优选（即将上线）
        </button>
      </div>
    </motion.form>
  );
}