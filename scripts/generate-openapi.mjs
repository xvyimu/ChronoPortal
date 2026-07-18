#!/usr/bin/env node
/**
 * 从路由注释 + 静态表生成 OpenAPI 3.1 骨架（不启动服务）。
 * 输出：docs/openapi.json
 *
 * 用法：node scripts/generate-openapi.mjs
 */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

/** 手维护的公开/管理 API 清单 — 与 app/api 对齐，避免虚构路径 */
const paths = {
  "/api/health": {
    get: {
      summary: "深度健康检查",
      tags: ["public"],
      responses: {
        "200": { description: "healthy" },
        "503": { description: "degraded" },
      },
    },
  },
  "/api/search": {
    get: {
      summary: "全文 / 语义搜索",
      tags: ["public"],
      parameters: [
        { name: "q", in: "query", schema: { type: "string" } },
        { name: "category", in: "query", schema: { type: "string" } },
        { name: "limit", in: "query", schema: { type: "integer", maximum: 100 } },
        { name: "semantic", in: "query", schema: { type: "boolean" } },
      ],
      responses: { "200": { description: "SearchResult envelope" } },
    },
  },
  "/api/tools": {
    get: {
      summary: "Agent 友好工具列表",
      tags: ["public"],
      parameters: [
        { name: "limit", in: "query", schema: { type: "integer" } },
        { name: "category", in: "query", schema: { type: "string" } },
        { name: "search", in: "query", schema: { type: "string" } },
        { name: "ids", in: "query", schema: { type: "string" } },
      ],
      responses: { "200": { description: "tools list" } },
    },
  },
  "/api/favicon": {
    get: {
      summary: "Favicon 代理（CDN + monogram）",
      tags: ["public"],
      parameters: [{ name: "domain", in: "query", required: true, schema: { type: "string" } }],
      responses: {
        "200": { description: "image/* or image/svg+xml monogram" },
        "400": { description: "invalid domain" },
        "429": { description: "rate limited" },
      },
    },
  },
  "/api/web-vitals": {
    post: {
      summary: "Core Web Vitals → Sentry",
      tags: ["public"],
      responses: {
        "200": { description: "accepted" },
        "400": { description: "invalid metric" },
        "403": { description: "origin forbidden" },
        "429": { description: "rate limited" },
      },
    },
  },
  "/api/submit": {
    post: {
      summary: "用户提交站点",
      tags: ["public"],
      responses: { "200": { description: "queued" }, "429": { description: "rate limited" } },
    },
  },
  "/api/favorites": {
    get: { summary: "收藏列表", tags: ["user"], responses: { "200": { description: "ok" } } },
    post: { summary: "添加收藏", tags: ["user"], responses: { "200": { description: "ok" } } },
    delete: { summary: "取消收藏", tags: ["user"], responses: { "200": { description: "ok" } } },
  },
  "/api/reviews": {
    get: { summary: "评价列表", tags: ["public"], responses: { "200": { description: "ok" } } },
    post: { summary: "提交评价", tags: ["user"], responses: { "200": { description: "ok" } } },
  },
  "/api/resource-search": {
    post: {
      summary: "Resource Library 搜索（vector/hybrid/FTS）",
      tags: ["resource"],
      responses: { "200": { description: "ok" } },
    },
  },
  "/api/resource-search-status": {
    get: {
      summary: "Resource Library 向量能力状态",
      tags: ["resource"],
      responses: { "200": { description: "ok" } },
    },
  },
  "/api/admin/links": {
    get: { summary: "管理：链接列表", tags: ["admin"], responses: { "200": { description: "ok" }, "401": { description: "unauthorized" } } },
    post: { summary: "管理：创建链接", tags: ["admin"], responses: { "200": { description: "ok" }, "401": { description: "unauthorized" } } },
  },
  "/api/admin/categories": {
    get: { summary: "管理：分类列表", tags: ["admin"], responses: { "200": { description: "ok" } } },
    post: { summary: "管理：创建分类", tags: ["admin"], responses: { "200": { description: "ok" } } },
  },
};

const doc = {
  openapi: "3.1.0",
  info: {
    title: "nav-site API",
    version: "0.1.0",
    description:
      "Generated skeleton from scripts/generate-openapi.mjs. Human docs: docs/API.md. Do not invent paths not present under app/api.",
  },
  servers: [
    { url: "https://yuanjia1314.ccwu.cc", description: "production" },
    { url: "http://localhost:3264", description: "local dev" },
  ],
  tags: [
    { name: "public" },
    { name: "user" },
    { name: "admin" },
    { name: "resource" },
  ],
  paths,
};

const out = join(root, "docs", "openapi.json");
writeFileSync(out, JSON.stringify(doc, null, 2) + "\n", "utf-8");
console.log(`Wrote ${out} (${Object.keys(paths).length} paths)`);
