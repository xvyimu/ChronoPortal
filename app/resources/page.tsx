import { ResourcesClient } from "./_components/ResourcesClient";

// 资源库浏览页 — 完全客户端渲染
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function ResourcesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-foreground mb-6">资源库</h1>
      <ResourcesClient />
    </div>
  );
}
