import { createHash } from "node:crypto";
const categories = [
  "function_fingerprints",
  "constraints",
  "indexes",
  "triggers",
  "storage_realtime_policies",
  "table_grants",
  "column_grants",
  "public_policy_modes",
  "schema_access",
  "provider_security",
  "api_role_security",
  "effective_table_grants",
  "media_bucket",
  "realtime_tables",
] as const;
function canonical(value: unknown): unknown {
  if (Array.isArray(value))
    return value
      .map(canonical)
      .sort((a, b) =>
        JSON.stringify(a) < JSON.stringify(b) ? -1 : JSON.stringify(a) > JSON.stringify(b) ? 1 : 0,
      );
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, item]) => [key, canonical(item)]),
    );
  return value;
}
/** Supabase grants its trusted server role additional rights; never relax anonymous/authenticated comparisons. */
export function repairMetadataHashes(data: Record<string, unknown>) {
  return Object.fromEntries(
    categories.map((key) => {
      if (!(key in data)) throw new Error("Repair metadata is incomplete.");
      let value = data[key];
      if (key === "function_fingerprints" && Array.isArray(value))
        value = value.map((row) => {
          if (!row || typeof row !== "object") throw new Error("Invalid function metadata.");
          const copy = { ...row };
          delete copy.service_role_execute;
          return copy;
        });
      if ((key === "table_grants" || key === "column_grants") && Array.isArray(value))
        value = value.filter(
          (row) => row && typeof row === "object" && row.role !== "service_role",
        );
      return [
        key,
        createHash("sha256")
          .update(JSON.stringify(canonical(value)))
          .digest("hex"),
      ];
    }),
  ) as Record<string, string>;
}
export function repairMetadataDifferences(
  actual: Record<string, unknown>,
  expected: Record<string, string>,
) {
  const hashes = repairMetadataHashes(actual);
  return categories.filter((key) => hashes[key] !== expected[key]);
}
