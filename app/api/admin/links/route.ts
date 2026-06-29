import { NextResponse } from "next/server";
import { withAdminGet, withAdminWrite } from "@/lib/with-admin";
import { createLinkSchema } from "@/lib/schemas";
import { getAllLinksForAdmin, createLink } from "@/lib/repositories";

export const GET = withAdminGet(async () => {
  const links = await getAllLinksForAdmin();
  return NextResponse.json({ links });
});

export const POST = withAdminWrite(createLinkSchema, async ({ parsed }) => {
  const link = await createLink({
    title: parsed.title,
    url: parsed.url,
    description: parsed.description || null,
    icon: parsed.icon || "🔗",
    category_id: parsed.category_id || null,
    approved: parsed.approved,
    featured: parsed.featured,
    tag_ids: parsed.tag_ids,
  });
  return NextResponse.json({ link });
});
