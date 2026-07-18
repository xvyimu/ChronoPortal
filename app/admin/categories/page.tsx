import { redirect } from "next/navigation";
import { CategoryManager } from "@/components/admin/CategoryManager";
import { auth } from "@/lib/auth";
import { getAllCategoriesForAdmin } from "@/lib/repositories";

/** 管理后台分类页：服务端预取全部分类后交给 CategoryManager。 */
export default async function AdminCategoriesPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/login");

  const categories = await getAllCategoriesForAdmin();
  return <CategoryManager initialCategories={categories} />;
}
