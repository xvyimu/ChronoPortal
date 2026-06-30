#!/usr/bin/env node
/**
 * Bundle 体积摘要提取脚本
 *
 * 从 .next/analyze/ 目录的 HTML 报告中提取 chunk 清单，
 * 输出 JSON 摘要用于后续 PR 对比与基线追踪。
 *
 * 用法：
 *   pnpm analyze              # 先跑 analyzer 生成 HTML 报告
 *   node scripts/extract-bundle-stats.mjs  # 提取并写入 docs/perf/
 *
 * 详见 docs/superpowers/specs/2026-06-29-performance-optimization-design.md §3.1 管线 A
 */

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const ANALYZE_DIR = ".next/analyze";
const PERF_DIR = "docs/perf";

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * 从 HTML 报告中提取 chunk 信息。
 * bundle-analyzer 的 HTML 是 webpack-bundle-analyzer 生成，
 * 数据嵌入在 <script> 标签的 `window.chartData = [...]` 中（注意是数组）。
 *
 * 不能用非贪婪正则——chartData 内部嵌套对象含大量 `}`，
 * `\{[\s\S]*?\}` 会在第一个闭括号处提前截断。
 * 改用括号配平扫描，从 `=` 后的第一个 `[` 或 `{` 起逐字符计数深度，
 * 同时跳过字符串字面量（避免字符串里的括号干扰深度计数）。
 */
function extractChunksFromHtml(html) {
  // 注意：必须匹配“赋值”形态 `window.chartData =`，
  // 因为 HTML 中还存在消费它的代码（如 `setChart(window.chartData)`），
  // 裸字符串 indexOf 会命中错误位置。
  const assignRe = /window\.chartData\s*=\s*[[{]/;
  const assignMatch = assignRe.exec(html);
  if (!assignMatch) return null;

  // JSON 起始为匹配串的最后一个字符（[ 或 {）
  const start = assignMatch.index + assignMatch[0].length - 1;

  const open = html[start];
  const close = open === "[" ? "]" : "}";
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < html.length; i += 1) {
    const ch = html[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === open) {
      depth += 1;
    } else if (ch === close) {
      depth -= 1;
      if (depth === 0) {
        const jsonText = html.slice(start, i + 1);
        try {
          return JSON.parse(jsonText);
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/** 取叶子节点真实体积：优先 gzip，回退 parsed，再回退 stat。 */
function nodeSize(node) {
  return node.gzipSize ?? node.parsedSize ?? node.statSize ?? node.size ?? 0;
}

/** 节点可读名：webpack-analyzer 用 `label`（顶层 chunk）或 `path`（模块叶子）。 */
function nodeName(node) {
  return node.label ?? node.path ?? node.name ?? "(unknown)";
}

/**
 * 递归遍历 chartData 树，收集所有叶子节点（真实模块）的 chunk 信息。
 * webpack-bundle-analyzer 用 `groups` 作为子节点字段（非 `children`）。
 */
function walkTree(node, parentPath = "", acc = []) {
  if (!node) return acc;
  const name = nodeName(node);
  const currentPath = parentPath ? `${parentPath}/${name}` : name;
  const children = node.groups ?? node.children;
  if (children && children.length > 0) {
    for (const child of children) {
      walkTree(child, currentPath, acc);
    }
  } else {
    const size = nodeSize(node);
    acc.push({ path: currentPath, size, sizeFormatted: formatBytes(size) });
  }
  return acc;
}

/**
 * 从叶子路径提取 node_modules 包名（含 scope 与 pnpm 虚拟目录）。
 * 返回 null 表示非第三方模块（项目自身代码）。
 */
function packageOf(path) {
  // pnpm: node_modules/.pnpm/foo@1.2.3/node_modules/foo/...
  // 取最后一个 node_modules/ 之后的包名
  const idx = path.lastIndexOf("node_modules/");
  if (idx === -1) return null;
  const rest = path.slice(idx + "node_modules/".length);
  const parts = rest.split("/");
  if (parts[0].startsWith("@") && parts.length > 1) {
    return `${parts[0]}/${parts[1]}`;
  }
  return parts[0];
}

async function main() {
  if (!existsSync(ANALYZE_DIR)) {
    console.error(`✗ 未找到 ${ANALYZE_DIR}，请先运行 \`pnpm analyze\``);
    process.exit(1);
  }

  const files = await readdir(ANALYZE_DIR);
  const htmlFiles = files.filter((f) => f.endsWith(".html"));

  if (htmlFiles.length === 0) {
    console.error(`✗ ${ANALYZE_DIR} 中没有 HTML 报告`);
    process.exit(1);
  }

  console.log(`发现 ${htmlFiles.length} 个 bundle 报告：`);

  const summary = {
    timestamp: new Date().toISOString(),
    reports: [],
  };

  for (const file of htmlFiles) {
    const filePath = join(ANALYZE_DIR, file);
    const html = await readFile(filePath, "utf-8");
    const chartData = extractChunksFromHtml(html);

    if (!chartData) {
      console.log(`  ⚠ ${file} — 无法解析 chartData，跳过`);
      continue;
    }

    // chartData 可能是数组或单个对象
    const trees = Array.isArray(chartData) ? chartData : [chartData];

    let totalSize = 0;
    let initialSize = 0; // 首屏 first-load JS（isInitialByEntrypoint 非空的 chunk）
    const chunks = [];
    const packageSizes = new Map(); // 包名 → 累计体积

    for (const tree of trees) {
      const chunkSize = nodeSize(tree);
      totalSize += chunkSize;

      // 顶层 chunk 是否进入首屏：isInitialByEntrypoint 含至少一个 entry
      const initialMap = tree.isInitialByEntrypoint ?? {};
      const isInitial = Object.values(initialMap).some(Boolean);
      if (isInitial) initialSize += chunkSize;

      chunks.push({
        path: nodeName(tree),
        size: chunkSize,
        sizeFormatted: formatBytes(chunkSize),
        initial: isInitial,
      });

      // 模块级聚合到包名
      for (const leaf of walkTree(tree)) {
        const pkg = packageOf(leaf.path);
        const key = pkg ?? "(app code)";
        packageSizes.set(key, (packageSizes.get(key) ?? 0) + leaf.size);
      }
    }

    chunks.sort((a, b) => b.size - a.size);
    const topChunks = chunks.slice(0, 20);

    const topPackages = [...packageSizes.entries()]
      .map(([name, size]) => ({ name, size, sizeFormatted: formatBytes(size) }))
      .sort((a, b) => b.size - a.size)
      .slice(0, 15);

    console.log(
      `  ✓ ${file} — 总计 ${formatBytes(totalSize)}` +
        (initialSize > 0 ? `, 首屏 ${formatBytes(initialSize)}` : "") +
        `, ${chunks.length} chunks`
    );

    summary.reports.push({
      file,
      totalSize,
      totalSizeFormatted: formatBytes(totalSize),
      initialSize,
      initialSizeFormatted: formatBytes(initialSize),
      chunkCount: chunks.length,
      topChunks,
      topPackages,
    });
  }

  // 写入 docs/perf/
  if (!existsSync(PERF_DIR)) {
    await mkdir(PERF_DIR, { recursive: true });
  }

  const date = new Date().toISOString().slice(0, 10);
  const outputPath = join(PERF_DIR, `baseline-bundle-${date}.json`);
  await writeFile(outputPath, JSON.stringify(summary, null, 2), "utf-8");

  console.log(`\n✓ 摘要已写入 ${outputPath}`);
  console.log(`  提示：将该文件提交到 git 以建立基线，后续 PR 可对比差异`);
}

main().catch((err) => {
  console.error("✗ 提取失败:", err);
  process.exit(1);
});
