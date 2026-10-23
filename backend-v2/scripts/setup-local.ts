import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import { uaePlaces } from "../src/uae-places.ts";
const root = resolve(import.meta.dirname, "..");
function cli(args: string[]) {
  try {
    return execFileSync(resolve(root, "node_modules/.bin/supabase"), args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    throw new Error(
      "The local Supabase command failed. Check Docker health and retry. No credentials were logged.",
    );
  }
}
const raw = cli(["status", "--workdir", root, "-o", "json"]);
let status = JSON.parse(raw);
if (status.data) status = status.data;
if (!status.API_URL || !status.DB_URL || !status.SERVICE_ROLE_KEY)
  throw new Error("Local Supabase status is incomplete. Start the Hamdi stack first.");
const file = resolve(root, ".env.local");
const previous = existsSync(file) ? readFileSync(file, "utf8") : "";
const retained = previous
  .split("\n")
  .filter((l) => /^(GOOGLE_MAPS_|APP_ORIGIN|LOCAL_TEST_MODE|OWNER_EMAIL)/.test(l));
writeFileSync(
  file,
  [
    `SUPABASE_URL=${status.API_URL}`,
    `SUPABASE_ANON_KEY=${status.ANON_KEY}`,
    `SUPABASE_SERVICE_ROLE_KEY=${status.SERVICE_ROLE_KEY}`,
    `DATABASE_URL=${status.DB_URL}`,
    "PORT=4180",
    "LOCAL_TEST_MODE=true",
    "APP_ORIGIN=http://localhost:4173",
    ...retained,
  ].join("\n") + "\n",
  { mode: 0o600 },
);
const pool = new pg.Pool({ connectionString: status.DB_URL });
cli(["migration", "up", "--db-url", status.DB_URL + "?connect_timeout=30", "--workdir", root]);
for (const l of uaePlaces) {
  await pool.query(
    "insert into hamdi.places(id,data,country_code,source) values($1,$2,'AE','catalog') on conflict(id) do update set data=excluded.data",
    [l.id, l],
  );
}
const admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const ownerEmail =
  retained.find((l) => l.startsWith("OWNER_EMAIL="))?.split("=")[1] ?? "owner@hamdi.local";
const existing = await pool.query("select role from hamdi.profiles where email=$1", [ownerEmail]);
if (existing.rows[0] && existing.rows[0].role !== "owner")
  throw new Error(
    "The configured Owner email already belongs to a different role. Use a dedicated Owner email.",
  );
if (!existing.rowCount) {
  const { data, error } = await admin.auth.admin.createUser({
    email: ownerEmail,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error("Could not create local Owner identity.");
  await pool.query(
    "insert into hamdi.profiles(user_id,email,name,role) values($1,$2,'Hamdi Owner','owner')",
    [data.user.id, ownerEmail],
  );
}
const frontendEnv = resolve(root, "../frontend-v2/.env.local");
const frontendPrevious = existsSync(frontendEnv) ? readFileSync(frontendEnv, "utf8") : "";
const frontendLines = frontendPrevious
  .split("\n")
  .filter((l) => l && !l.startsWith("VITE_DATA_SOURCE="));
writeFileSync(frontendEnv, [...frontendLines, "VITE_DATA_SOURCE=api"].join("\n") + "\n", {
  mode: 0o600,
});
await pool.end();
console.log(
  "Hamdi local schema and catalogue ready. Owner sign-in: " +
    ownerEmail +
    ". One-time codes are delivered to the local inbox at http://127.0.0.1:57524. No credentials were printed.",
);
