-- Atomically persist admin link fields and tag associations.
-- Apply only after migration-tags.sql has created public.tags and public.nav_links_tags.

BEGIN;

CREATE OR REPLACE FUNCTION public.create_nav_link_with_tags(
  p_title TEXT,
  p_url TEXT,
  p_description TEXT,
  p_icon TEXT,
  p_category_id UUID,
  p_approved BOOLEAN,
  p_featured BOOLEAN,
  p_tag_ids UUID[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_link_id UUID;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM unnest(COALESCE(p_tag_ids, ARRAY[]::UUID[])) AS requested(tag_id)
    LEFT JOIN public.tags AS tag ON tag.id = requested.tag_id
    WHERE tag.id IS NULL
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23503',
      MESSAGE = 'One or more tag IDs do not exist';
  END IF;

  INSERT INTO public.nav_links (
    title,
    url,
    description,
    icon,
    category_id,
    approved,
    featured
  )
  VALUES (
    p_title,
    p_url,
    p_description,
    p_icon,
    p_category_id,
    p_approved,
    p_featured
  )
  RETURNING id INTO v_link_id;

  INSERT INTO public.nav_links_tags (link_id, tag_id)
  SELECT v_link_id, requested.tag_id
  FROM (
    SELECT DISTINCT tag_id
    FROM unnest(COALESCE(p_tag_ids, ARRAY[]::UUID[])) AS tags(tag_id)
  ) AS requested;

  RETURN v_link_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_nav_link_with_tags(
  p_link_id UUID,
  p_patch JSONB,
  p_tag_ids UUID[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_affected INTEGER;
BEGIN
  IF p_patch IS NULL OR jsonb_typeof(p_patch) <> 'object' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Link patch must be a JSON object';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_object_keys(p_patch) AS keys(field_name)
    WHERE field_name NOT IN (
      'title',
      'url',
      'description',
      'icon',
      'category_id',
      'approved',
      'featured'
    )
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Link patch contains unsupported fields';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(COALESCE(p_tag_ids, ARRAY[]::UUID[])) AS requested(tag_id)
    LEFT JOIN public.tags AS tag ON tag.id = requested.tag_id
    WHERE tag.id IS NULL
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23503',
      MESSAGE = 'One or more tag IDs do not exist';
  END IF;

  UPDATE public.nav_links
  SET
    title = CASE WHEN p_patch ? 'title' THEN p_patch ->> 'title' ELSE title END,
    url = CASE WHEN p_patch ? 'url' THEN p_patch ->> 'url' ELSE url END,
    description = CASE
      WHEN p_patch ? 'description' THEN p_patch ->> 'description'
      ELSE description
    END,
    icon = CASE WHEN p_patch ? 'icon' THEN p_patch ->> 'icon' ELSE icon END,
    category_id = CASE
      WHEN p_patch ? 'category_id' THEN (p_patch ->> 'category_id')::UUID
      ELSE category_id
    END,
    approved = CASE
      WHEN p_patch ? 'approved' THEN (p_patch ->> 'approved')::BOOLEAN
      ELSE approved
    END,
    featured = CASE
      WHEN p_patch ? 'featured' THEN (p_patch ->> 'featured')::BOOLEAN
      ELSE featured
    END
  WHERE id = p_link_id;

  GET DIAGNOSTICS v_affected = ROW_COUNT;
  IF v_affected <> 1 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'Link does not exist';
  END IF;

  DELETE FROM public.nav_links_tags
  WHERE link_id = p_link_id;

  INSERT INTO public.nav_links_tags (link_id, tag_id)
  SELECT p_link_id, requested.tag_id
  FROM (
    SELECT DISTINCT tag_id
    FROM unnest(COALESCE(p_tag_ids, ARRAY[]::UUID[])) AS tags(tag_id)
  ) AS requested;

  RETURN p_link_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_nav_link_with_tags(
  TEXT, TEXT, TEXT, TEXT, UUID, BOOLEAN, BOOLEAN, UUID[]
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_nav_link_with_tags(
  UUID, JSONB, UUID[]
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_nav_link_with_tags(
  TEXT, TEXT, TEXT, TEXT, UUID, BOOLEAN, BOOLEAN, UUID[]
) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_nav_link_with_tags(
  UUID, JSONB, UUID[]
) TO service_role;

COMMENT ON FUNCTION public.create_nav_link_with_tags(
  TEXT, TEXT, TEXT, TEXT, UUID, BOOLEAN, BOOLEAN, UUID[]
) IS 'Creates an admin link and its tag associations in one transaction';
COMMENT ON FUNCTION public.update_nav_link_with_tags(
  UUID, JSONB, UUID[]
) IS 'Updates allowlisted admin link fields and replaces tag associations atomically';

COMMIT;
