"use client";

import { useEffect, useRef } from "react";
import { ExternalLink, Globe, Heart, Sparkles, Star, Tags, X } from "lucide-react";
import { useFavoritesContext } from "@/components/FavoritesProvider";
import { extractDomain, isSafeUrl } from "@/lib/utils";
import type { NavLink } from "@/lib/types";

interface ToolQuickViewProps {
  link: NavLink | null;
  onClose: () => void;
}

export function ToolQuickView({ link, onClose }: ToolQuickViewProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const { isFavorite, toggleFavorite } = useFavoritesContext();

  useEffect(() => {
    if (!link) return;

    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [link, onClose]);

  if (!link) return null;

  const domain = extractDomain(link.url);
  const safeUrl = isSafeUrl(link.url) ? link.url : "#";
  const favorite = isFavorite(link.id);
  const rating = typeof link.avg_rating === "number" ? link.avg_rating.toFixed(1) : null;
  const tags = link.tags ?? [];

  const handleOpen = () => {
    navigator.sendBeacon(
      "/api/click",
      new Blob([JSON.stringify({ url: link.url })], { type: "application/json" }),
    );
  };

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-labelledby="tool-quick-view-title">
      <button
        type="button"
        className="absolute inset-0 h-full w-full cursor-default bg-black/58 backdrop-blur-sm"
        aria-label="关闭工具预览"
        onClick={onClose}
      />
      <aside className="nav-quick-view absolute inset-x-3 bottom-3 max-h-[86svh] overflow-y-auto rounded-3xl border border-white/14 bg-[#08110f]/94 p-4 text-white shadow-[0_30px_100px_rgba(0,0,0,0.48)] backdrop-blur-2xl md:inset-y-4 md:left-auto md:right-4 md:w-[430px] md:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="mb-2 flex items-center gap-2 text-xs font-mono uppercase text-white/52">
              <Globe className="h-3.5 w-3.5" aria-hidden="true" />
              {domain || "external tool"}
            </p>
            <h2 id="tool-quick-view-title" className="text-2xl font-semibold leading-tight text-white">
              {link.title}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/8 text-white/58 transition hover:bg-white/12 hover:text-white"
            aria-label="关闭工具预览"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {link.description && (
          <p className="mt-5 text-sm leading-6 text-white/72">
            {link.description}
          </p>
        )}

        <div className="mt-5 grid grid-cols-3 gap-3">
          <Fact label="category" value={link.category_name || "未分类"} />
          <Fact label="clicks" value={String(link.click_count ?? 0)} />
          <Fact label="rating" value={rating ? `${rating}/5` : "暂无"} />
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.045] p-3">
          <div className="text-xs font-mono uppercase text-white/42">why it is here</div>
          <p className="mt-2 text-sm leading-6 text-white/68">
            {link.featured
              ? "This tool is marked as curated and appears in the priority discovery set."
              : "This tool is part of the approved atlas and can be opened directly from the card or this preview."}
          </p>
          <div className="mt-3 truncate rounded-full bg-white/8 px-3 py-2 font-mono text-xs text-white/48">
            {safeUrl}
          </div>
        </div>

        {link.searchMeta && (
          <div className="mt-5 rounded-2xl border border-emerald-200/14 bg-emerald-200/[0.06] p-3">
            <div className="flex items-center gap-2 text-xs font-mono uppercase text-emerald-100">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              匹配解释
            </div>
            <p className="mt-2 text-sm leading-6 text-white/72">
              {link.searchMeta.explanation.reason}
            </p>
            {link.searchMeta.highlights.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {link.searchMeta.highlights.slice(0, 4).map((highlight) => (
                  <span key={`${highlight.field}:${highlight.value}`} className="rounded-full bg-white/10 px-2 py-1 text-xs text-white/64">
                    {highlight.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {tags.length > 0 && (
          <div className="mt-5">
            <div className="mb-2 flex items-center gap-2 text-xs font-mono uppercase text-white/52">
              <Tags className="h-3.5 w-3.5" aria-hidden="true" />
              tags
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.slice(0, 10).map((tag) => (
                <span key={tag.id} className="rounded-full border border-white/12 bg-white/[0.06] px-2.5 py-1 text-xs text-white/68">
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <a
            href={safeUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleOpen}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-white text-sm font-semibold text-[#07100f] transition hover:bg-emerald-50"
          >
            打开网站
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
          <button
            type="button"
            onClick={() => toggleFavorite(link.id)}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-white/14 bg-white/8 text-sm font-semibold text-white transition hover:bg-white/12"
            aria-pressed={favorite}
          >
            <Heart className={`h-4 w-4 ${favorite ? "fill-emerald-200 text-emerald-200" : ""}`} aria-hidden="true" />
            {favorite ? "已收藏" : "收藏"}
          </button>
        </div>
      </aside>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
      <div className="flex items-center gap-1.5 text-lg font-semibold text-white">
        {label === "rating" && <Star className="h-4 w-4 text-amber-200" aria-hidden="true" />}
        <span className="truncate">{value}</span>
      </div>
      <div className="mt-1 text-[10px] font-mono uppercase text-white/42">{label}</div>
    </div>
  );
}
