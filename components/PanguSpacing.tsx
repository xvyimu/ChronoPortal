"use client";

import { useEffect, useRef } from "react";

/**
 * pangu.js — 自动在中英文之间添加空格
 * 源项目: https://github.com/vinta/pangu.js
 * v7.2.1 本地依赖
 *
 * 架构说明：
 * pangu.js 的核心 API 是 `spacingPage()`，它遍历 DOM 文本节点并修改内容。
 * 这与 React 的虚拟 DOM 存在潜在冲突，但以下措施使此方案安全且高效：
 *
 * 1. 使用 requestAnimationFrame 在浏览器 paint 前执行，避免可见闪烁
 * 2. MutationObserver + 300ms debounce 处理动态渲染内容（搜索/筛选）
 * 3. pangu 仅修改文本节点（nodeValue），不改变 DOM 结构，不会破坏 React 事件绑定
 * 4. 相比渲染时处理（需包装所有文本组件），此方案零侵入性，性能开销可忽略
 *
 * 性能优化（H1 修复，2026-06-30）：
 * - 初始挂载：scope 到 #atlas 子树而非 document.body，减少遍历节点数
 * - MutationObserver：收集实际变动子树，用 spacingNode(el) 限定遍历范围，
 *   不再全量 spacingPage()，避免每次筛选/搜索后重扫 ~2000 节点
 * - performance.mark/measure 量化每次执行耗时，>50ms 时 emit console.warn
 *
 * 替代方案评估：
 * - React 文本包装组件：需重构所有展示组件，侵入性高，收益低
 * - CSS text-spacing 属性：浏览器兼容性不足（仅 Chrome 115+）
 * - 服务端渲染时处理：ISR 缓存命中率低，且 pangu 需浏览器环境
 */
export function PanguSpacing() {
  const rafId = useRef<number | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTargets = useRef<Set<Element>>(new Set());

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const { default: pangu } = await import("pangu/browser");

        /**
         * 限定 scope 的 spacingNode 替代全量 spacingPage
         *
         * @param targets - 需要遍历的子树根集合；空集表示首次全量挂载，scope 到 #atlas
         */
        function applySpacing(targets?: Set<Element>) {
          if (cancelled) return;
          const label = `pangu-spacing-${targets ? "mutation" : "init"}`;
          try {
            performance.mark(`${label}-start`);

            if (targets && targets.size > 0) {
              // 仅遍历变动的子树，不再全量重扫
              for (const el of targets) {
                pangu.spacingNode(el);
              }
            } else {
              // 首次挂载：scope 到 #atlas（主内容区），跳过 header/footer 等外围
              const atlas = document.getElementById("atlas");
              if (atlas) {
                pangu.spacingNode(atlas);
              } else {
                // fallback：#atlas 不存在时退回全量（不应发生，但防崩溃）
                pangu.spacingPage();
              }
            }

            performance.mark(`${label}-end`);
            performance.measure(label, `${label}-start`, `${label}-end`);
            const measure = performance.getEntriesByName(label).at(-1);
            if (measure && measure.duration > 50) {
              console.warn(
                `[pangu] ${label} took ${measure.duration.toFixed(1)}ms (>50ms threshold)`
              );
            }
          } catch {
            // 忽略个别节点的间距错误
          }
        }

        // 初始挂载：在 layout 阶段（浏览器 paint 之前）应用间距
        rafId.current = requestAnimationFrame(() => {
          if (!cancelled) {
            applySpacing();
          }
        });

        // 监听动态内容变化（如搜索、筛选、懒加载）
        // 收集变动子树，限定 spacingNode 作用范围
        const observer = new MutationObserver((mutations) => {
          if (cancelled) return;

          for (const m of mutations) {
            for (const node of m.addedNodes) {
              if (node instanceof Element) {
                pendingTargets.current.add(node);
              }
            }
            // removedNodes 不需要处理（pangu 修改的 textNode 会随 DOM 移除而消失）
          }

          if (debounceTimer.current) clearTimeout(debounceTimer.current);
          debounceTimer.current = setTimeout(() => {
            if (!cancelled) {
              const targets = new Set(pendingTargets.current);
              pendingTargets.current.clear();
              applySpacing(targets);
            }
          }, 300);
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true,
        });

        return () => {
          observer.disconnect();
          if (debounceTimer.current) clearTimeout(debounceTimer.current);
        };
      } catch (e) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[pangu]", e);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  return null;
}
