"use client";

import { type NavLink } from "@/lib/types";
import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { fadeInUp } from "@/lib/animations";

export function LinkCard({ link, index = 0 }: { link: NavLink; index?: number }) {
  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: index * 0.03 }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
    >
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group block"
      >
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-start gap-3">
            {/* 图标 */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 via-accent/10 to-primary/5 text-xl shadow-inner ring-1 ring-white/5">
              {link.icon || "🔗"}
            </div>

            {/* 内容 */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="truncate font-semibold text-foreground group-hover:text-primary transition-colors duration-200">
                  {link.title}
                  {link.featured && (
                    <Badge
                      variant="outline"
                      className="ml-1.5 border-amber-500/30 bg-amber-500/10 text-[10px] px-1.5 py-0 text-amber-400 font-normal align-middle"
                    >
                      推荐
                    </Badge>
                  )}
                </h3>
              </div>
              {link.description && (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground/80 leading-relaxed">
                  {link.description}
                </p>
              )}
              <div className="mt-2 flex items-center gap-2">
                <span className="rounded-md bg-primary/8 px-2 py-0.5 text-[10px] text-primary/60 ring-1 ring-primary/10">
                  {link.category_name || "未分类"}
                </span>
              </div>
            </div>

            {/* 箭头指示 */}
            <div className="shrink-0 self-center text-muted-foreground/30 transition-all duration-200 group-hover:text-primary/60 group-hover:translate-x-0.5">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12L10 8L5 4" />
              </svg>
            </div>
          </div>
        </div>
      </a>
    </motion.div>
  );
}