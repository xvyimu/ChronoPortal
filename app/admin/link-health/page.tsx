import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LinkHealthPanel } from "@/components/admin/LinkHealthPanel";
import { listOpenLinkHealthFindings } from "@/lib/repositories/link-health";

/** 管理后台 · 链接健康：服务端预取 open findings，避免首屏空表瀑布。 */
export default async function AdminLinkHealthPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/login");

  // RSC 直调 repository（ADR-009）；浏览器刷新/resolve 仍走 Route Handler。
  const result = await listOpenLinkHealthFindings();
  const unavailable =
    "unavailable" in result && result.unavailable === true;
  const findings = result.findings;
  const initialMeta = unavailable
    ? {
        openCount: 0,
        unavailable: true as const,
        detail: result.detail,
      }
    : { openCount: findings.length };

  return (
    <LinkHealthPanel initialFindings={findings} initialMeta={initialMeta} />
  );
}
