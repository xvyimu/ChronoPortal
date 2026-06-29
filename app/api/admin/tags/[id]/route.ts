import { NextResponse } from "next/server";
import { withAdminWrite, withAdminDelete } from "@/lib/with-admin";
import { updateTagSchema } from "@/lib/schemas";
import { updateTag, deleteTag } from "@/lib/repositories";

export const PUT = withAdminWrite(updateTagSchema, async ({ parsed, params }) => {
  const id = params?.id;
  if (!id) {
    return NextResponse.json({ error: "缺少 id 参数" }, { status: 400 });
  }

  // 过滤掉 undefined 字段，避免覆盖为 null
  const updateInput: { name?: string; slug?: string } = {};
  if (parsed.name !== undefined) updateInput.name = parsed.name;
  if (parsed.slug !== undefined) updateInput.slug = parsed.slug;

  if (Object.keys(updateInput).length === 0) {
    return NextResponse.json({ error: "未提供任何可更新字段" }, { status: 400 });
  }

  const tag = await updateTag(id, updateInput);
  return NextResponse.json({ tag });
});

export const DELETE = withAdminDelete(async ({ params }) => {
  const id = params?.id;
  if (!id) {
    return NextResponse.json({ error: "缺少 id 参数" }, { status: 400 });
  }
  await deleteTag(id);
  return NextResponse.json({ success: true });
});
