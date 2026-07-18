import { z } from "zod";

const searchMatchFieldSchema = z.enum(["title", "description", "category", "tag", "url"]);

const tagSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  created_at: z.string(),
});

const searchMetaSchema = z.object({
  query: z.string(),
  expandedTerms: z.array(z.string()),
  source: z.enum(["fuse", "semantic", "hybrid"]),
  score: z.number().optional(),
  similarity: z.number().optional(),
  highlights: z.array(z.object({
    field: searchMatchFieldSchema,
    label: z.string(),
    value: z.string(),
  })),
  explanation: z.object({
    label: z.string(),
    reason: z.string(),
    matchedFields: z.array(searchMatchFieldSchema),
  }),
});

/** 搜索结果中的导航链接字段契约（含可选 searchMeta）。 */
export const searchNavLinkSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().url(),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  category_id: z.string().nullable().default(null),
  approved: z.boolean().default(true),
  paid: z.boolean(),
  featured: z.boolean(),
  click_count: z.number(),
  created_at: z.string().default(""),
  updated_at: z.string().nullable().optional(),
  slug: z.string().nullable().optional(),
  review_count: z.number().optional(),
  avg_rating: z.number().optional(),
  score: z.number().optional(),
  similarity: z.number().optional(),
  category_name: z.string().optional(),
  category_slug: z.string().optional(),
  tags: z.array(tagSchema).optional(),
  searchMeta: searchMetaSchema.optional(),
});

const facetOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
  count: z.number(),
  active: z.boolean().optional(),
});

const facetsSchema = z.object({
  categories: z.array(facetOptionSchema),
  tags: z.array(facetOptionSchema),
  ratings: z.array(facetOptionSchema),
  popularity: z.array(facetOptionSchema),
});

const suggestionSchema = z.object({
  value: z.string(),
  label: z.string(),
  type: z.enum(["query", "tool", "category", "tag"]),
  count: z.number().optional(),
});

/** 前台搜索 API 成功响应 envelope 校验（防契约漂移）。 */
export const searchApiSuccessSchema = z.object({
  results: z.array(searchNavLinkSchema),
  total: z.number().int().nonnegative(),
  query: z.string(),
  mode: z.enum(["fuse", "semantic"]),
  facets: facetsSchema,
  suggestions: z.array(suggestionSchema),
  recommendations: z.array(searchNavLinkSchema),
  expandedTerms: z.array(z.string()),
  appliedSynonyms: z.array(z.string()),
  fallbackReason: z.enum(["short_query", "embedding_unavailable", "semantic_empty"]).nullable().optional(),
});

export type SearchApiSuccess = z.infer<typeof searchApiSuccessSchema>;
