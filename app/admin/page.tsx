import { redirect } from "next/navigation";
import { AdminWorkspace } from "@/components/admin/AdminWorkspace";
import { getAdminSession } from "@/lib/auth";
import { getAdminLinksPage, getAllCategoriesForAdmin } from "@/lib/repositories";

/** 管理后台首页：预取链接分页与分类，交给 AdminWorkspace 客户端编排。 */
export default async function AdminPage() {
  const session = await getAdminSession();
  if (!session?.user || session.user.role !== "admin") redirect("/login");

  const [linksPage, categories] = await Promise.all([
    getAdminLinksPage(),
    getAllCategoriesForAdmin(),
  ]);

  return <AdminWorkspace initialPage={linksPage} initialCategories={categories} />;
}
