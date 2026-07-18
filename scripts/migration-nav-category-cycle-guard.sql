-- Reject self-references and ancestor loops in nav_categories.
-- Apply only after reviewing the preflight failure for existing bad data.

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    WITH RECURSIVE ancestry AS (
      SELECT
        id,
        parent_id,
        ARRAY[id] AS path
      FROM public.nav_categories

      UNION ALL

      SELECT
        parent.id,
        parent.parent_id,
        ancestry.path || parent.id
      FROM public.nav_categories AS parent
      JOIN ancestry ON parent.id = ancestry.parent_id
      WHERE NOT parent.id = ANY(ancestry.path)
    )
    SELECT 1
    FROM ancestry
    WHERE parent_id = ANY(path)
  ) THEN
    RAISE EXCEPTION 'Category hierarchy contains a cycle; repair data before applying this migration';
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'nav_categories_parent_not_self'
      AND conrelid = 'public.nav_categories'::regclass
  ) THEN
    ALTER TABLE public.nav_categories
      ADD CONSTRAINT nav_categories_parent_not_self
      CHECK (parent_id IS NULL OR parent_id <> id) NOT VALID;

    ALTER TABLE public.nav_categories
      VALIDATE CONSTRAINT nav_categories_parent_not_self;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_nav_category_cycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Serialize parent updates so two concurrent writes cannot form a cycle.
  PERFORM pg_advisory_xact_lock(672241);

  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.parent_id = NEW.id THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Category cannot be its own parent';
  END IF;

  IF EXISTS (
    WITH RECURSIVE ancestors AS (
      SELECT
        id,
        parent_id,
        ARRAY[id] AS path
      FROM public.nav_categories
      WHERE id = NEW.parent_id

      UNION ALL

      SELECT
        parent.id,
        parent.parent_id,
        ancestors.path || parent.id
      FROM public.nav_categories AS parent
      JOIN ancestors ON parent.id = ancestors.parent_id
      WHERE NOT parent.id = ANY(ancestors.path)
    )
    SELECT 1
    FROM ancestors
    WHERE id = NEW.id
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Category parent would create an ancestor cycle';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_nav_category_cycle ON public.nav_categories;
CREATE TRIGGER prevent_nav_category_cycle
  BEFORE INSERT OR UPDATE OF parent_id ON public.nav_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_nav_category_cycle();

REVOKE ALL ON FUNCTION public.prevent_nav_category_cycle() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_nav_category_cycle() TO service_role;

COMMENT ON FUNCTION public.prevent_nav_category_cycle() IS
  'Rejects category self-references and ancestor loops; serializes parent writes';

COMMIT;
