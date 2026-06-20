import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseUrl, getSupabaseKey } from "./config";

export function createClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabaseKey());
}