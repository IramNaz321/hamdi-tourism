import { test } from "node:test";
import assert from "node:assert/strict";
import { compareCatalog, projectRef, verifiedDatabaseUrl } from "../scripts/database/common";
test("database project guard rejects another project, URI overrides and insecure routing", () => {
  const saved = process.env.SUPABASE_DB_URL;
  try {
    for (const value of [
      "postgresql://user:local-test@db.other.supabase.co/postgres",
      `postgresql://user:local-test@db.${projectRef}.supabase.co/other`,
      `postgresql://user:local-test@db.${projectRef}.supabase.co/postgres?sslmode=disable&host=other`,
    ]) {
      process.env.SUPABASE_DB_URL = value;
      assert.throws(() => verifiedDatabaseUrl());
    }
    process.env.SUPABASE_DB_URL = `postgresql://postgres:local-test@db.${projectRef}.supabase.co:5432/postgres`;
    assert.ok(verifiedDatabaseUrl());
    process.env.SUPABASE_DB_URL = `postgresql://postgres.${projectRef}:local-test@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`;
    assert.ok(verifiedDatabaseUrl());
  } finally {
    if (saved === undefined) delete process.env.SUPABASE_DB_URL;
    else process.env.SUPABASE_DB_URL = saved;
  }
});
test("catalog comparison detects missing objects, policy broadening and altered definitions", () => {
  const expected = {
    "table:bookings": { rls: true, columns: [] },
    "policy:public.bookings.read": { using: "organization_id=membership" },
    "function:public.dashboard()": { public_execute: false },
  };
  assert.deepEqual(compareCatalog(expected, structuredClone(expected)), []);
  assert.ok(compareCatalog(expected, { "table:bookings": { rls: false, columns: [] } }).length);
  assert.deepEqual(
    compareCatalog(expected, { ...expected, "policy:public.bookings.open": { using: "true" } }),
    ["policy:public.bookings.open"],
  );
  assert.deepEqual(
    compareCatalog(expected, {
      ...expected,
      "function:public.dashboard()": { public_execute: true },
    }),
    ["function:public.dashboard()"],
  );
});
