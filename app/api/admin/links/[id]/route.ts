import { NextResponse } from "next/server";
import { withAdminIdWrite, withAdminIdDelete } from "@/lib/with-admin";
import { updateLinkSchema } from "@/lib/schemas";
import { updateLink, deleteLink } from "@/lib/repositories/admin-links";

/** 更新指定 UUID 的管理链接。 */
export const PUT = withAdminIdWrite(updateLinkSchema, async ({ parsed, id }) => {
  const link = await updateLink(id, parsed);
  return NextResponse.json({ link });
});

/** 删除指定 UUID 的管理链接。 */
export const DELETE = withAdminIdDelete(async ({ id }) => {
  await deleteLink(id);
  return NextResponse.json({ success: true });
});
