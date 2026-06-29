import { NextResponse } from "next/server";
import { withAdminGet, withAdminWrite } from "@/lib/with-admin";
import { createCategorySchema } from "@/lib/schemas";
import { getAllCategoriesForAdmin, createCategory } from "@/lib/repositories";

export const GET = withAdminGet(async () => {
  const categories = await getAllCategoriesForAdmin();
  return NextResponse.json({ categories });
});

export const POST = withAdminWrite(createCategorySchema, async ({ parsed }) => {
  const category = await createCategory({
    name: parsed.name,
    slug: parsed.slug,
    description: parsed.description || null,
    icon: parsed.icon || "📁",
    sort_order: parsed.sort_order,
    parent_id: parsed.parent_id ?? null,
  });
  return NextResponse.json({ category });
});
