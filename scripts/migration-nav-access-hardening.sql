-- Restrict navigation writes to trusted server-side service_role clients.
-- Public clients retain read-only access to categories and approved links.

BEGIN;

ALTER TABLE public.nav_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nav_categories FORCE ROW LEVEL SECURITY;
ALTER TABLE public.nav_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nav_links FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.nav_categories FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.nav_links FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.nav_categories TO anon, authenticated;
GRANT SELECT ON TABLE public.nav_links TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.nav_categories TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.nav_links TO service_role;

DROP POLICY IF EXISTS "Anon delete categories" ON public.nav_categories;
DROP POLICY IF EXISTS "Anon insert categories" ON public.nav_categories;
DROP POLICY IF EXISTS "Anon update categories" ON public.nav_categories;
DROP POLICY IF EXISTS "Public read categories" ON public.nav_categories;

CREATE POLICY "Public read categories"
  ON public.nav_categories
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Anon delete links" ON public.nav_links;
DROP POLICY IF EXISTS "Anon insert links" ON public.nav_links;
DROP POLICY IF EXISTS "Anon update links" ON public.nav_links;
DROP POLICY IF EXISTS "Public read approved links" ON public.nav_links;

CREATE POLICY "Public read approved links"
  ON public.nav_links
  FOR SELECT
  TO anon, authenticated
  USING (approved = true);

COMMIT;
