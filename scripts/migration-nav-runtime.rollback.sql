-- Non-destructive application rollback.
-- Additive taxonomy columns/tables and hardened grants are intentionally retained:
-- older application versions tolerate them, and restoring anonymous writes would
-- reintroduce a security vulnerability.
--
-- 不 DROP consume_rate_limit：基线应用同样依赖该 RPC。
-- 回滚时用 CREATE OR REPLACE 恢复兼容实现，并保持 service_role-only EXECUTE。

BEGIN;

-- 保留 rate_limit_buckets；仅恢复与基线兼容的 consume_rate_limit 实现
CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_bucket_key TEXT,
  p_window_seconds INTEGER,
  p_max_attempts INTEGER
)
RETURNS TABLE (allowed BOOLEAN, current_count INTEGER)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  bucket_start TIMESTAMPTZ;
  consumed_count INTEGER;
BEGIN
  IF p_bucket_key IS NULL OR length(p_bucket_key) = 0 OR length(p_bucket_key) > 300 THEN
    RAISE EXCEPTION 'invalid rate-limit bucket key';
  END IF;
  IF p_window_seconds < 1 OR p_max_attempts < 1 THEN
    RAISE EXCEPTION 'rate-limit window and maximum must be positive';
  END IF;

  bucket_start := to_timestamp(
    floor(extract(epoch FROM clock_timestamp()) / p_window_seconds) * p_window_seconds
  );

  INSERT INTO public.rate_limit_buckets (
    bucket_key,
    window_start,
    current_count,
    expires_at
  )
  VALUES (
    p_bucket_key,
    bucket_start,
    1,
    bucket_start + make_interval(secs => p_window_seconds * 2)
  )
  ON CONFLICT (bucket_key, window_start)
  DO UPDATE SET current_count = rate_limit_buckets.current_count + 1
  RETURNING rate_limit_buckets.current_count INTO consumed_count;

  DELETE FROM public.rate_limit_buckets
  WHERE expires_at < clock_timestamp();

  RETURN QUERY SELECT consumed_count <= p_max_attempts, consumed_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.consume_rate_limit(TEXT, INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(TEXT, INTEGER, INTEGER)
  TO service_role;

COMMIT;

-- Intentionally retained:
--   public.nav_categories.parent_id
--   public.tags / public.nav_links_tags and their data
--   public.rate_limit_buckets and its counters
--   service_role-only write grants on navigation and attempt tables
--   public.consume_rate_limit signature (restored, not dropped)
