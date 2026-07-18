"use client";

import { useEffect, useState } from "react";
import type { NavLink } from "@/lib/types";
import type {
  PopularityFilter,
  SearchFacets,
  SearchSuggestion,
} from "@/lib/search-experience";
import { buildSearchFacets, buildSearchSuggestions } from "@/lib/search-experience";
import { searchApiSuccessSchema } from "@/lib/search/response-schema";

const EMPTY_SEARCH_FACETS: SearchFacets = {
  categories: [],
  tags: [],
  ratings: [],
  popularity: [],
};

export interface ServerSearchParams {
  rawSearch: string;
  semanticSearch: boolean;
  activeCategory: string;
  activeTags: string[];
  minRatingFilter: number | null;
  popularityFilter: PopularityFilter | null;
  links: NavLink[];
  setSearch: (v: string) => void;
}

export interface ServerSearchState {
  serverResults: NavLink[];
  searchLoading: boolean;
  searchFacets: SearchFacets;
  searchSuggestions: SearchSuggestion[];
  zeroResultRecommendations: NavLink[];
  setServerResults: (v: NavLink[]) => void;
}

export function useServerSearch(params: ServerSearchParams): ServerSearchState {
  const {
    rawSearch,
    semanticSearch,
    activeCategory,
    activeTags,
    minRatingFilter,
    popularityFilter,
    links,
    setSearch,
  } = params;

  const [serverResults, setServerResults] = useState<NavLink[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchFacets, setSearchFacets] = useState<SearchFacets>(EMPTY_SEARCH_FACETS);
  const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([]);
  const [zeroResultRecommendations, setZeroResultRecommendations] = useState<NavLink[]>([]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const q = rawSearch.trim();
    if (q) return;

    const localFacets = buildSearchFacets(links, {
      category: activeCategory,
      tagSlugs: activeTags,
      minRating: minRatingFilter,
      popularity: popularityFilter,
    });
    setSearch("");
    setServerResults([]);
    setSearchLoading(false);
    setSearchFacets(localFacets);
    setSearchSuggestions(buildSearchSuggestions("", links, localFacets));
    setZeroResultRecommendations([]);
  }, [rawSearch, activeCategory, activeTags, minRatingFilter, popularityFilter, links, setSearch]);

  useEffect(() => {
    const q = rawSearch.trim();
    if (!q) return;

    setSearchLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearch(q);
      try {
        const sp = new URLSearchParams({ q });
        if (semanticSearch) sp.set("semantic", "true");
        if (activeCategory !== "all") sp.set("category", activeCategory);
        if (activeTags.length > 0) sp.set("tag", activeTags.join(","));
        if (minRatingFilter !== null) sp.set("minRating", String(minRatingFilter));
        if (popularityFilter) sp.set("popularity", popularityFilter);
        const res = await fetch(`/api/search?${sp}`, { signal: controller.signal });
        if (!res.ok) {
          setServerResults([]);
          setSearchFacets(EMPTY_SEARCH_FACETS);
          setSearchSuggestions([]);
          setZeroResultRecommendations([]);
        } else {
          const data = searchApiSuccessSchema.parse(await res.json());
          setServerResults(data.results);
          setSearchFacets(data.facets);
          setSearchSuggestions(data.suggestions);
          setZeroResultRecommendations(data.recommendations);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setServerResults([]);
        setSearchFacets(EMPTY_SEARCH_FACETS);
        setSearchSuggestions([]);
        setZeroResultRecommendations([]);
      }
      setSearchLoading(false);
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [rawSearch, activeCategory, semanticSearch, activeTags, minRatingFilter, popularityFilter, setSearch]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return {
    serverResults,
    searchLoading,
    searchFacets,
    searchSuggestions,
    zeroResultRecommendations,
    setServerResults,
  };
}
