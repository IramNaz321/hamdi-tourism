import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
export function isConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return !!url && !!key && !url.includes("your-project") && !key.includes("your-publishable-key");
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
