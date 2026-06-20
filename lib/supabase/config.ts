/**
 * 共享 Supabase 配置
 * 从环境变量中提取数据库路由逻辑，避免 client.ts / server.ts / admin.ts 重复
 */

export function getSupabaseUrl(): string {
  const isDev = process.env.NODE_ENV !== "production";
  if (isDev) {
    return (
      process.env.NEXT_PUBLIC_SUPABASE_URL_DEV ||
      process.env.NEXT_PUBLIC_SUPABASE_URL!
    );
  }
  return process.env.NEXT_PUBLIC_SUPABASE_URL!;
}

export function getSupabaseKey(): string {
  const isDev = process.env.NODE_ENV !== "production";
  if (isDev) {
    return (
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_DEV ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
}

export function getAdminSupabaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL_DEV ||
    process.env.NEXT_PUBLIC_SUPABASE_URL!
  );
}

export function getAdminSupabaseKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_DEV ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}