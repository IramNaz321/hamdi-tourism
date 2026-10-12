import "server-only";
import { createClient } from "@supabase/supabase-js";
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || key.includes("your-server-only"))
    throw new Error("This operation is not configured. Contact your account owner.");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
