import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getAdminSupabaseUrl, getAdminSupabaseKey } from "./config";

export async function createAdminClient() {
  const cookieStore = await cookies();

  return createServerClient(getAdminSupabaseUrl(), getAdminSupabaseKey(), {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {}
      },
    },
  });
}