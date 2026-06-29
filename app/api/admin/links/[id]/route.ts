import { NextResponse } from "next/server";
import { withAdminWrite, withAdminDelete } from "@/lib/with-admin";
import { updateLinkSchema } from "@/lib/schemas";
import { updateLink, deleteLink } from "@/lib/repositories";

export const PUT = withAdminWrite(updateLinkSchema, async ({ parsed, params }) => {
  const id = params?.id;
  if (!id) {
    return NextResponse.json({ error: "缺少 id 参数" }, { status: 400 });
  }
  const link = await updateLink(id, parsed as Record<string, unknown>);
  return NextResponse.json({ link });
});

export const DELETE = withAdminDelete(async ({ params }) => {
  const id = params?.id;
  if (!id) {
    return NextResponse.json({ error: "缺少 id 参数" }, { status: 400 });
  }
  await deleteLink(id);
  return NextResponse.json({ success: true });
});
