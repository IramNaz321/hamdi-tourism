import { test } from "node:test";
import assert from "node:assert/strict";
import { publicSupabaseConfig } from "../src/lib/supabase/config";
const url = "https://hzcupgjphowrzvrdffrf.supabase.co";
const jwt = (role: string) =>
  `header.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.signature`;
test("accepts public publishable and legacy anonymous keys", () => {
  assert.equal(publicSupabaseConfig(url, "sb_publishable_test")?.url, url);
  assert.equal(publicSupabaseConfig(url, jwt("anon"))?.url, url);
});
test("rejects elevated credentials in public configuration", () => {
  for (const key of [
    "sb_secret_test",
    jwt("service_role"),
    jwt("authenticated"),
    "invalid",
    "your-publishable-key",
  ])
    assert.equal(publicSupabaseConfig(url, key), null);
});
test("rejects missing, malformed and insecure remote URLs", () => {
  for (const value of [
    undefined,
    "invalid",
    "http://remote.example",
    "https://user:password@example.com",
    `${url}/path`,
    `${url}?token=anything`,
    `${url}#fragment`,
  ])
    assert.equal(publicSupabaseConfig(value, "sb_publishable_test"), null);
  assert.equal(publicSupabaseConfig(url, undefined), null);
  assert.ok(publicSupabaseConfig("http://127.0.0.1:54321", jwt("anon")));
});
