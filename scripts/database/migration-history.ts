/** Read-only metadata lookup: an absent CLI ledger never means an empty application. */
export async function readMigrationHistory(client: {
  query(sql: string): Promise<{ rows: Record<string, unknown>[] }>;
}) {
  const exists = await client.query(
    "select to_regclass('supabase_migrations.schema_migrations') is not null as exists",
  );
  if (exists.rows[0]?.exists !== true) return { present: false, versions: [] as string[] };
  const result = await client.query(
    "select version from supabase_migrations.schema_migrations order by version",
  );
  const versions = result.rows.map((row) => row.version);
  if (
    !versions.every(
      (version): version is string => typeof version === "string" && /^\d+$/.test(version),
    )
  )
    throw new Error("Migration history requires review.");
  return { present: true, versions };
}
