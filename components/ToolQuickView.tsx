"use client";

import { useRef } from "react";
import { ExternalLink, Globe, Heart, Sparkles, Star, Tags, X } from "lucide-react";
import { useFavoritesContext } from "@/components/FavoritesProvider";
import { extractDomain, isSafeUrl } from "@/lib/utils";
import { useDialogFocus } from "@/lib/use-dialog-focus";
import { trackClick } from "@/lib/track-click";
import type { NavLink } from "@/lib/types";

interface ToolQuickViewProps {
  link: NavLink | null;
  onClose: () => void;
}

export function ToolQuickView({ link, onClose }: ToolQuickViewProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const { isFavorite, toggleFavorite } = useFavoritesContext();

  // 焦点陷阱 + Escape 关闭 + 焦点恢复（抽到 lib/use-dialog-focus.ts）
  useDialogFocus({
    open: link !== null,
    onClose,
    dialogRef,
    closeRef,
  });

  if (!link) return null;

  const domain = extractDomain(link.url);
  const safeUrl = isSafeUrl(link.url) ? link.url : "#";
  const favorite = isFavorite(link.id);
  const rating = typeof link.avg_rating === "number" ? link.avg_rating : null;
  const tags = link.tags ?? [];

  /** 显示满 5 颗星，filled 为实际分数近似 */
  const stars = rating !== null
    ? Array.from({ length: 5 }, (_, i) => {
        const threshold = i + 0.5;
        if (rating >= threshold + 0.5) return "full";
        if (rating >= threshold) return "half";
        return "empty";
      })
    : null;

  const handleOpen = () => {
    trackClick(link.url);
  };

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-labelledby="tool-quick-view-title" aria-describedby="tool-quick-view-desc">
      <button
        type="button"
        className="absolute inset-0 h-full w-full cursor-default bg-black/58 backdrop-blur-sm"
        aria-label="关闭工具预览"
        onClick={onClose}
      />
      <aside ref={dialogRef} id="tool-quick-view-desc" className="nav-quick-view absolute inset-x-3 bottom-3 max-h-[86svh] overflow-y-auto rounded-3xl border border-[var(--paper-line)] bg-[var(--paper-surface)]/96 p-4 text-[var(--paper-ink)] shadow-[0_30px_90px_rgba(61,74,90,0.24)] backdrop-blur-2xl md:inset-y-4 md:left-auto md:right-4 md:w-[430px] md:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="mb-2 flex items-center gap-2 text-xs font-mono uppercase text-[var(--paper-muted)]">
              <Globe className="h-3.5 w-3.5" aria-hidden="true" />
              {domain || "external tool"}
            </p>
            <h2 id="tool-quick-view-title" className="text-2xl font-semibold leading-tight text-[var(--paper-ink)]">
              {link.title}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--paper-line)] bg-[var(--paper-surface-soft)] text-[var(--paper-muted)] transition hover:bg-[var(--paper-accent-soft)] hover:text-[var(--paper-accent)]"
            aria-label="关闭工具预览"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {link.description && (
          <p className="mt-5 text-sm leading-6 text-[var(--paper-muted)]">
            {link.description}
          </p>
        )}

        <div className="mt-5 grid grid-cols-3 gap-3">
          <Fact label="分类" value={link.category_name || "未分类"} />
          <Fact label="点击量" value={String(link.click_count ?? 0)} />
          <Fact label="评分" value={rating !== null ? `${rating.toFixed(1)}/5` : "暂无"} stars={stars} rating={rating} />
        </div>

        <div className="mt-5 rounded-2xl border border-[var(--paper-line)] bg-[var(--paper-surface-soft)] p-3">
          <div className="text-xs font-mono uppercase text-[var(--paper-faint)]">收录说明</div>
          <p className="mt-2 text-sm leading-6 text-[var(--paper-muted)]">
            {link.featured
              ? "该工具被标记为精选收录，出现在优先发现集中。"
              : "该工具已通过审核纳入导航图谱，可直接从卡片或此预览打开访问。"}
          </p>
          <div className="mt-3 truncate rounded-full bg-[var(--paper-surface)] px-3 py-2 font-mono text-xs text-[var(--paper-muted)]">
            {safeUrl}
          </div>
        </div>

        {link.searchMeta && (
          <div className="mt-5 rounded-2xl border border-[var(--paper-line)] bg-[var(--paper-accent-soft)] p-3">
            <div className="flex items-center gap-2 text-xs font-mono uppercase text-[var(--paper-accent)]">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              匹配解释
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--paper-muted)]">
              {link.searchMeta.explanation.reason}
            </p>
            {link.searchMeta.highlights.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {link.searchMeta.highlights.slice(0, 4).map((highlight) => (
                  <span key={`${highlight.field}:${highlight.value}`} className="rounded-full bg-[var(--paper-surface)] px-2 py-1 text-xs text-[var(--paper-accent)]">
                    {highlight.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {tags.length > 0 && (
          <div className="mt-5" aria-labelledby="tool-quick-view-tags">
            <h3 id="tool-quick-view-tags" className="mb-2 flex items-center gap-2 text-xs font-mono uppercase text-[var(--paper-muted)]">
              <Tags className="h-3.5 w-3.5" aria-hidden="true" />
              标签
            </h3>
            <ul className="flex flex-wrap gap-2" role="list">
              {tags.slice(0, 10).map((tag) => (
                <li key={tag.id} className="rounded-full border border-[var(--paper-line)] bg-[var(--paper-surface-soft)] px-2.5 py-1 text-xs text-[var(--paper-muted)]">
                  {tag.name}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <a
            href={safeUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleOpen}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[var(--paper-accent)] text-sm font-semibold text-[var(--paper-surface)] transition hover:bg-[#4f739e]"
          >
            打开网站
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
          <button
            type="button"
            onClick={() => toggleFavorite(link.id)}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-[var(--paper-line)] bg-[var(--paper-surface-soft)] text-sm font-semibold text-[var(--paper-ink)] transition hover:border-[var(--paper-accent)] hover:text-[var(--paper-accent)]"
            aria-pressed={favorite}
          >
            <Heart className={`h-4 w-4 ${favorite ? "fill-[var(--paper-accent)] text-[var(--paper-accent)]" : ""}`} aria-hidden="true" />
            {favorite ? "已收藏" : "收藏"}
          </button>
        </div>
      </aside>
    </div>
  );
}

function Fact({ label, value, stars, rating }: { label: string; value: string; stars?: ("full" | "half" | "empty")[] | null; rating?: number | null }) {
  return (
    <dl className="rounded-2xl border border-[var(--paper-line)] bg-[var(--paper-surface-soft)] p-3">
      <div className="flex items-center gap-1.5 text-lg font-semibold text-[var(--paper-ink)]">
        {label === "评分" && stars ? (
          <span className="flex gap-0.5 text-[#b58157]" aria-label={`评分 ${rating?.toFixed(1) || "暂无"} 分`}>
            {stars.map((star, i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${star === "full" ? "fill-current text-[#b58157]" : star === "half" ? "fill-current text-[#b58157] opacity-50" : "text-[var(--paper-faint)]"}`}
                aria-hidden="true"
              />
            ))}
          </span>
        ) : (
          <dt className="truncate">{value}</dt>
        )}
      </div>
      <dd className="mt-1 text-[10px] font-mono uppercase text-[var(--paper-faint)]">{label}</dd>
    </dl>
  );
}
