"use client";

import { Filter, Flame, Folder, Sparkles, Star, Tags } from "lucide-react";
import type { NavLink } from "@/lib/types";
import type { PopularityFilter, SearchFacets, SearchSuggestion } from "@/lib/search-experience";

interface SearchExperiencePanelProps {
  query: string;
  loading: boolean;
  suggestions: SearchSuggestion[];
  facets: SearchFacets;
  results: NavLink[];
  activeTags: string[];
  activeCategory: string;
  onSuggestion: (value: string) => void;
  onCategoryChange: (slug: string) => void;
  onToggleTag: (slug: string) => void;
  minRating: number | null;
  onMinRatingChange: (value: number | null) => void;
  popularity: PopularityFilter | null;
  onPopularityChange: (value: PopularityFilter | null) => void;
  onClearFilters: () => void;
}

function suggestionLabel(type: SearchSuggestion["type"]): string {
  switch (type) {
    case "tool":
      return "工具";
    case "category":
      return "分类";
    case "tag":
      return "标签";
    case "query":
      return "搜索";
  }
}

export function SearchExperiencePanel({
  query,
  loading,
  suggestions,
  facets,
  results,
  activeTags,
  activeCategory,
  onSuggestion,
  onCategoryChange,
  onToggleTag,
  minRating,
  onMinRatingChange,
  popularity,
  onPopularityChange,
  onClearFilters,
}: SearchExperiencePanelProps) {
  const visibleSuggestions = suggestions.slice(0, 8);
  const visibleCategories = facets.categories.slice(0, 8);
  const visibleTags = facets.tags.slice(0, 10);
  const hasFilters = activeTags.length > 0 || minRating !== null || popularity !== null || activeCategory !== "all";
  const hasFacetOptions =
    visibleCategories.length > 0 ||
    visibleTags.length > 0 ||
    facets.ratings.some((rating) => rating.count > 0) ||
    facets.popularity.some((item) => item.count > 0);

  if (!query && visibleSuggestions.length === 0 && !hasFilters && !hasFacetOptions) {
    return null;
  }

  const topExplanations = results
    .map((link) => link.searchMeta?.explanation.label)
    .filter(Boolean)
    .slice(0, 3) as string[];

  return (
    <div className="nav-glass space-y-3 rounded-2xl p-3 text-white">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-mono uppercase text-white/62">
          <Sparkles className="h-3.5 w-3.5 text-emerald-200" aria-hidden="true" />
          {query ? "搜索建议" : "热门查询"}
        </span>
        {visibleSuggestions.length > 0 ? visibleSuggestions.map((suggestion) => (
          <button
            key={`${suggestion.type}:${suggestion.value}`}
            type="button"
            onClick={() => onSuggestion(suggestion.value)}
            className="inline-flex h-7 items-center gap-1 rounded-full border border-white/12 bg-white/[0.06] px-2.5 text-xs text-white/82 transition-colors hover:border-emerald-200/45 hover:text-emerald-50"
          >
            <span className="text-white/45">{suggestionLabel(suggestion.type)}</span>
            {suggestion.label}
            {suggestion.count !== undefined && (
              <span className="tabular-nums text-white/42">{suggestion.count}</span>
            )}
          </button>
        )) : (
          <span className="text-xs text-white/55">
            {loading ? "正在分析匹配项" : "暂无建议"}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-mono uppercase text-white/62">
          <Filter className="h-3.5 w-3.5" aria-hidden="true" />
          筛选
        </span>

        {visibleCategories.map((category) => (
          <FacetButton
            key={category.value}
            active={activeCategory === category.value}
            onClick={() => onCategoryChange(activeCategory === category.value ? "all" : category.value)}
            icon={<Folder className="h-3 w-3 shrink-0" aria-hidden="true" />}
            label={category.label}
            count={category.count}
          />
        ))}

        {visibleTags.map((tag) => (
          <FacetButton
            key={tag.value}
            active={activeTags.includes(tag.value)}
            onClick={() => onToggleTag(tag.value)}
            icon={<Tags className="h-3 w-3 shrink-0" aria-hidden="true" />}
            label={tag.label}
            count={tag.count}
          />
        ))}

        {facets.ratings.filter((rating) => rating.count > 0).map((rating) => {
          const value = Number(rating.value);
          return (
            <FacetButton
              key={rating.value}
              active={minRating === value}
              onClick={() => onMinRatingChange(minRating === value ? null : value)}
              icon={<Star className="h-3 w-3" aria-hidden="true" />}
              label={rating.label}
              count={rating.count}
            />
          );
        })}

        {facets.popularity.filter((item) => item.count > 0).map((item) => {
          const value = item.value as PopularityFilter;
          return (
            <FacetButton
              key={item.value}
              active={popularity === value}
              onClick={() => onPopularityChange(popularity === value ? null : value)}
              icon={<Flame className="h-3 w-3" aria-hidden="true" />}
              label={item.label}
              count={item.count}
            />
          );
        })}

        {hasFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="h-7 rounded-full px-2.5 text-xs text-white/58 transition-colors hover:bg-white/10 hover:text-white"
          >
            清除
          </button>
        )}
      </div>

      {topExplanations.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-white/58">
          <span>排序依据</span>
          {topExplanations.map((item, index) => (
            <span key={`${item}:${index}`} className="rounded-full bg-white/10 px-2 py-0.5">
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function FacetButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-7 max-w-full items-center gap-1 rounded-full border px-2.5 text-xs transition-colors ${
        active
          ? "border-emerald-200/45 bg-emerald-200/14 text-emerald-50"
          : "border-white/12 bg-white/[0.06] text-white/76 hover:border-emerald-200/35 hover:text-white"
      }`}
      aria-pressed={active}
    >
      {icon}
      <span className="truncate">{label}</span>
      <span className="tabular-nums text-white/42">{count}</span>
    </button>
  );
}
