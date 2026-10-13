import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicSupabaseConfig } from "./config";
import { isServerSupabaseKey } from "./key-validation";
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!isServerSupabaseKey(key))
    throw new Error("This operation is not configured. Contact your account owner.");
  const config = publicSupabaseConfig(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  if (!config) throw new Error("Supabase public configuration is missing or invalid.");
  return createClient(config.url, key!.trim(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
