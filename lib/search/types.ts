import type { NavLink } from "@/lib/types";
import type Fuse from "fuse.js";
import type {
  SearchFacets,
  SearchFilters,
  SearchSuggestion,
} from "@/lib/search-experience";

/**
 * 搜索模块的共享类型定义
 *
 * 该文件不放任何运行时逻辑，只导出类型，
 * 便于 params/fuse/semantic/merge 各模块互相引用而不产生循环依赖。
 */

export interface SearchResult {
  id: string;
  title: string;
  url: string;
  description: string | null;
  icon: string | null;
  category_name: string | undefined;
  category_slug: string | undefined;
  featured: boolean;
  paid: boolean;
  click_count: number;
  /** Fuse.js score: 0 = perfect, 1 = no match */
  score?: number;
  /** pgvector similarity: 1 = perfect, 0 = no match */
  similarity?: number;
  /** Result source */
  source: "fuse" | "semantic";
  tags?: NavLink["tags"];
  review_count?: number;
  avg_rating?: number;
  searchMeta?: NavLink["searchMeta"];
}

export interface SearchParams {
  q: string;
  category?: string;
  limit: number;
  semantic: boolean;
  filters: SearchFilters;
}

export type SearchMode = "fuse" | "semantic";

export type SemanticFallbackReason =
  | "short_query"
  | "embedding_unavailable"
  | "semantic_empty"
  | "semantic_timeout"
  | null;

export interface SearchSuccessBody {
  results: NavLink[];
  total: number;
  query: string;
  mode: SearchMode;
  facets: SearchFacets;
  suggestions: SearchSuggestion[];
  recommendations: NavLink[];
  expandedTerms: string[];
  appliedSynonyms: string[];
  fallbackReason?: SemanticFallbackReason;
}

export interface SearchErrorBody {
  error: string;
  results: [];
  total: 0;
}

export type SearchApiBody = SearchSuccessBody | SearchErrorBody;

export interface SearchResponseModel {
  status: number;
  headers: Record<string, string>;
  body: SearchApiBody;
}

/** 用于 fuse.search() 的结果项类型（与 Fuse.js 内部类型对齐） */
export type FuseResultItem = {
  item: NavLink;
  score?: number;
};

/** pgvector search_links_semantic RPC 返回的行结构 */
export interface SemanticRow {
  id: string;
  title: string;
  url: string;
  description: string | null;
  icon: string | null;
  category_name: string | null;
  category_slug: string | null;
  similarity: number;
  featured: boolean;
  paid: boolean;
  click_count: number;
}

/** 用于 fuse 模块间的缓存结构 */
export interface FuseCache {
  fuse: Fuse<NavLink>;
  links: NavLink[];
  timestamp: number;
}
