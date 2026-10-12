"use client";
import { createBrowserClient } from "@supabase/ssr";
import { publicSupabaseConfig } from "./config";
let client: ReturnType<typeof createBrowserClient> | undefined;
export function browserClient() {
  if (!client) {
    const config = publicSupabaseConfig(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    );
    if (!config) throw new Error("Supabase public configuration is missing or invalid.");
    client = createBrowserClient(config.url, config.key);
  }
  return client;
}
