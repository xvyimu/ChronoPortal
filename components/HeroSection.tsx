"use client";

import { motion } from "motion/react";

export function HeroSection() {
  return (
    <motion.div
      className="mb-12 text-center"
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* 装饰光晕 */}
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[300px] w-[600px] -translate-x-1/2 bg-gradient-to-b from-primary/5 via-accent/5 to-transparent blur-[100px]" />

      {/* 标题 */}
      <motion.h1
        className="text-4xl font-bold tracking-tight sm:text-5xl bg-gradient-to-b from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      >
        🌐 公益API导航站
      </motion.h1>

      {/* 描述 */}
      <motion.p
        className="mt-3 text-muted-foreground/70 max-w-xl mx-auto leading-relaxed"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      >
        收录公益、免费、可白嫖的 AI 大模型 API 中转站，助你实现 Token 自由
      </motion.p>

      {/* 统计装饰 */}
      <motion.div
        className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.35 }}
      >
        <span className="flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400/50" />
          持续更新
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/50" />
          公益优先
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent/50" />
          完全免费
        </span>
      </motion.div>
    </motion.div>
  );
}
