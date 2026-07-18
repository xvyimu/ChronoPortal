-- Roll back only the nav_categories cycle guard objects.

BEGIN;

DROP TRIGGER IF EXISTS prevent_nav_category_cycle ON public.nav_categories;
DROP FUNCTION IF EXISTS public.prevent_nav_category_cycle();
ALTER TABLE public.nav_categories
  DROP CONSTRAINT IF EXISTS nav_categories_parent_not_self;

COMMIT;
