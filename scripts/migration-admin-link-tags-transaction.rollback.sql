-- Roll back only the admin link/tag transaction RPCs.

BEGIN;

DROP FUNCTION IF EXISTS public.update_nav_link_with_tags(UUID, JSONB, UUID[]);
DROP FUNCTION IF EXISTS public.create_nav_link_with_tags(
  TEXT, TEXT, TEXT, TEXT, UUID, BOOLEAN, BOOLEAN, UUID[]
);

COMMIT;
