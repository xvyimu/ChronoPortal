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
        setMessage("提交成功！");
        form.reset();
      } else {
        setStatus("error");
        setMessage(result.error || "提交失败");
      }
    } catch {
      setStatus("error");
      setMessage("网络错误");
    }
  }

  if (status === "success") {
    return (
      <motion.div
        className="flex flex-col items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-8 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <span className="text-2xl">✅</span>
        <p className="text-sm text-foreground/70">{message}</p>
        <button
          onClick={() => setStatus("idle")}
          className="text-xs text-muted-foreground/50 hover:text-muted-foreground/80 underline-offset-2 underline transition-colors"
        >
          继续提交
        </button>
      </motion.div>
    );
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border border-white/[0.06] bg-white/[0.02] p-5"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div>
        <label htmlFor="title" className="mb-1 block text-xs font-medium text-foreground/60">
          站点名称 <span className="text-red-400/60">*</span>
        </label>
        <input
          id="title"
          name="title"
          required
          placeholder="ChatGPT"
          className="w-full rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm text-foreground/80 placeholder:text-muted-foreground/30 outline-none transition-colors focus:border-white/[0.12] focus:bg-white/[0.04]"
        />
      </div>

      <div>
        <label htmlFor="url" className="mb-1 block text-xs font-medium text-foreground/60">
          站点 URL <span className="text-red-400/60">*</span>
        </label>
        <input
          id="url"
          name="url"
          type="url"
          required
          placeholder="https://example.com"
          className="w-full rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm text-foreground/80 placeholder:text-muted-foreground/30 outline-none transition-colors focus:border-white/[0.12] focus:bg-white/[0.04]"
        />
      </div>

      <div>
        <label htmlFor="description" className="mb-1 block text-xs font-medium text-foreground/60">
          描述
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          placeholder="一句话介绍..."
          className="w-full rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm text-foreground/80 placeholder:text-muted-foreground/30 outline-none transition-colors focus:border-white/[0.12] focus:bg-white/[0.04] resize-none"
        />
      </div>

      <div>
        <label htmlFor="category_id" className="mb-1 block text-xs font-medium text-foreground/60">
          分类
        </label>
        <select
          id="category_id"
          name="category_id"
          className="w-full rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm text-foreground/80 outline-none transition-colors focus:border-white/[0.12] focus:bg-white/[0.04]"
        >
          <option value="">选择分类</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.icon} {cat.name}
            </option>
          ))}
        </select>
      </div>

      {status === "error" && <p className="text-xs text-red-400/70">{message}</p>}

      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full rounded-md bg-foreground/[0.08] py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-foreground/[0.12] disabled:opacity-50"
      >
        {status === "loading" ? "提交中..." : "免费提交"}
      </button>
    </motion.form>
  );
}