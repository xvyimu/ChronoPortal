export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  created_at: string;
}

export interface NavLink {
  id: string;
  title: string;
  url: string;
  description: string | null;
  icon: string | null;
  category_id: string | null;
  approved: boolean;
  paid: boolean;
  featured: boolean;
  click_count: number;
  created_at: string;
  // Joined field
  category_name?: string;
  category_slug?: string;
}

export interface NavLinkWithCategory extends NavLink {
  nav_categories: {
    name: string;
    slug: string;
  } | null;
}
