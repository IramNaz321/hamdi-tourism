import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicSupabaseConfig } from "./config";
export function isConfigured() {
  return !!publicSupabaseConfig(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
export async function createClient() {
  if (!isConfigured()) throw new Error("Supabase configuration is missing.");
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (items) => {
          try {
            items.forEach(({ name, value, options }) => store.set(name, value, options));
          } catch {
            /* Server components cannot set cookies; proxy refreshes sessions. */
          }
        },
      },
    },
  );
}
