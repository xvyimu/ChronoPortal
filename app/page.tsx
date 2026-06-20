import { createClient } from "@/lib/supabase/server";
import { type NavLink } from "@/lib/types";
import { Navigation } from "@/components/Navigation";

export default async function Home() {
  const supabase = await createClient();

  // Fetch categories
  const { data: categoriesData } = await supabase
    .from("nav_categories")
    .select("*")
    .order("sort_order");

  // Fetch approved links with category info
  const { data: rawLinks } = await supabase
    .from("nav_links")
    .select("*, nav_categories(name, slug)")
    .eq("approved", true)
    .order("featured", { ascending: false })
    .order("paid", { ascending: false })
    .order("created_at", { ascending: false });

  const categories = categoriesData ?? [];

  // Flatten category info
  const links: NavLink[] = (rawLinks ?? []).map((l) => ({
    ...l,
    category_name: l.nav_categories?.name ?? null,
    category_slug: l.nav_categories?.slug ?? null,
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Hero */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          🧭 AI 导航站
        </h1>
        <p className="mt-2 text-muted-foreground">
          精选 AI 工具与开发者资源，助你高效工作
        </p>
      </div>

      <Navigation categories={categories} links={links} />
    </div>
  );
}
