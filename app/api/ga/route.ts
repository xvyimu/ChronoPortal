import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * External GA bootstrap (no inline script).
 * Query: ?id=G-XXXX — only G- / UA- / AW- / GT- prefixes accepted.
 *
 * Served as application/javascript so CSP script-src 'self' covers it.
 */
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id")?.trim() || "";
  if (!/^(G|UA|AW|GT)-[A-Z0-9-]+$/i.test(id)) {
    return new NextResponse("// invalid measurement id\n", {
      status: 400,
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  const body = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config',${JSON.stringify(id)},{anonymize_ip:true});\n`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
