import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "关于",
  description: "公益API导航站 — 帮助开发者找到可用的 AI API 入口",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold text-foreground/90">关于本站</h1>

      <section className="mt-8 space-y-4 text-sm text-foreground/70 leading-relaxed">
        <p>
          公益API导航站是一个精选 AI 大模型 API 的导航平台。我们收集和整理了各类
          AI API 资源，涵盖官方原厂平台和公益中转服务，帮助开发者快速找到可用的
          AI 服务入口。
        </p>

        <h2 className="text-lg font-semibold text-foreground/80">为什么做这个站</h2>
        <p>
          AI 大模型 API 的选择越来越多，但信息分散在不同平台、不同社群中。
          开发者需要花大量时间搜索和对比。这个导航站希望把这些信息聚合起来，
          让查找和使用 API 变得更高效。
        </p>

        <h2 className="text-lg font-semibold text-foreground/80">内容来源</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>社区提交 — 用户通过提交表单推荐站点</li>
          <li>人工筛选 — 对每个收录站点进行可用性验证</li>
          <li>模型排行榜 — 聚合主流评测数据</li>
        </ul>

        <h2 className="text-lg font-semibold text-foreground/80">使用说明</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>浏览分类或使用搜索快速定位</li>
          <li>点击链接直接跳转到目标站点</li>
          <li>通过提交表单推荐新的 API 服务</li>
          <li>每日更新，确保信息新鲜度</li>
        </ul>

        <h2 className="text-lg font-semibold text-foreground/80">免责声明</h2>
        <p>
          本站仅作为信息导航，不存储、不提供任何 API 密钥或代理服务。
          所有链接指向第三方站点，使用前请自行评估其安全性和稳定性。
          如发现违规内容，请联系我们处理。
        </p>
      </section>

      <footer className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground/40">
        公益API导航站 · 始于 2026
      </footer>
    </div>
  );
}
