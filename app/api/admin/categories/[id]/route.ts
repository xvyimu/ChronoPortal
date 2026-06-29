import { NextResponse } from "next/server";
import { withAdminWrite, withAdminDelete } from "@/lib/with-admin";
import { updateCategorySchema } from "@/lib/schemas";
import { updateCategory, deleteCategory } from "@/lib/repositories";

export const PUT = withAdminWrite(updateCategorySchema, async ({ parsed, params }) => {
  const id = params?.id;
  if (!id) {
    return NextResponse.json({ error: "缺少 id 参数" }, { status: 400 });
  }
  const category = await updateCategory(id, parsed);
  return NextResponse.json({ category });
});

export const DELETE = withAdminDelete(async ({ params }) => {
  const id = params?.id;
  if (!id) {
    return NextResponse.json({ error: "缺少 id 参数" }, { status: 400 });
  }
  await deleteCategory(id);
  return NextResponse.json({ success: true });
});
