import { NextResponse } from "next/server";
import { withAdminGet, withAdminWrite } from "@/lib/with-admin";
import { createTagSchema } from "@/lib/schemas";
import { getAllTagsForAdmin, createTag } from "@/lib/repositories";

export const GET = withAdminGet(async () => {
  const tags = await getAllTagsForAdmin();
  return NextResponse.json({ tags });
});

export const POST = withAdminWrite(createTagSchema, async ({ parsed }) => {
  const tag = await createTag(parsed);
  return NextResponse.json({ tag });
});
