-- Atomic server-side rate limiting for login, submit, favorites, and reviews.
-- All writes are restricted to service_role clients.

BEGIN;

CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  bucket_key TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  current_count INTEGER NOT NULL CHECK (current_count > 0),
  expires_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (bucket_key, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_buckets_expires_at
  ON public.rate_limit_buckets(expires_at);

ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_buckets FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.rate_limit_buckets FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.rate_limit_buckets TO service_role;

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.submit_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submit_attempts FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.login_attempts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.submit_attempts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.login_attempts TO service_role;
GRANT SELECT, INSERT, DELETE ON TABLE public.submit_attempts TO service_role;

-- 通过 pg_get_serial_sequence 解析真实序列名；表缺失时显式失败，不静默跳过
DO $$
DECLARE
  login_seq regclass;
  submit_seq regclass;
BEGIN
  login_seq := pg_get_serial_sequence('public.login_attempts', 'id')::regclass;
  submit_seq := pg_get_serial_sequence('public.submit_attempts', 'id')::regclass;

  IF login_seq IS NULL THEN
    RAISE EXCEPTION 'public.login_attempts.id has no serial/identity sequence';
  END IF;
  IF submit_seq IS NULL THEN
    RAISE EXCEPTION 'public.submit_attempts.id has no serial/identity sequence';
  END IF;

  EXECUTE format('REVOKE ALL ON SEQUENCE %s FROM PUBLIC, anon, authenticated', login_seq);
  EXECUTE format('REVOKE ALL ON SEQUENCE %s FROM PUBLIC, anon, authenticated', submit_seq);
  EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %s TO service_role', login_seq);
  EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %s TO service_role', submit_seq);
END $$;

DO $$
DECLARE
  policy RECORD;
BEGIN
  FOR policy IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('login_attempts', 'submit_attempts')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy.policyname, policy.tablename);
  END LOOP;
END $$;

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

COMMENT ON TABLE public.rate_limit_buckets IS 'Atomic fixed-window quota buckets for server-side rate limiting';
COMMENT ON FUNCTION public.consume_rate_limit(TEXT, INTEGER, INTEGER)
  IS 'Atomically consume one fixed-window rate-limit quota unit';

COMMIT;
