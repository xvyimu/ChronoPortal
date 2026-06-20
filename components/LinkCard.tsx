"use client";

import { type NavLink } from "@/lib/types";
import { motion } from "motion/react";
import { fadeInUp } from "@/lib/animations";

export function LinkCard({ link, index = 0 }: { link: NavLink; index?: number }) {
  let domain = "";
  try {
    domain = new URL(link.url).hostname.replace(/^www\./, "");
  } catch {}

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="show"
      transition={{ delay: index * 0.02 }}
      className="group"
    >
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-full flex-col justify-between bg-background p-4 transition-colors duration-200 hover:bg-white/[0.03]"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/[0.04] text-sm">
            {link.icon || "🔗"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium text-foreground/85 group-hover:text-foreground">
                {link.title}
              </span>
              {link.featured && (
                <span className="shrink-0 inline-flex items-center rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-normal text-primary">
                  推荐
                </span>
              )}
            </div>
            {link.description && (
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground/60">
                {link.description}
              </p>
            )}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="font-mono text-[10px] text-muted-foreground/35">
            {domain}
          </span>
          <span className="text-[10px] text-muted-foreground/25">·</span>
          <span className="text-[10px] text-muted-foreground/35">
            {link.category_name || "未分类"}
          </span>
        </div>
      </a>
    </motion.div>
  );
}