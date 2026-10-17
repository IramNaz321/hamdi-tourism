import { readFileSync } from "node:fs";
import { repairMetadataDifferences } from "./repair-metadata";
export async function verifyRepairPrerequisites(
  client: { query(sql: string): Promise<{ rows: Record<string, unknown>[] }> },
  stage: 7 | 8 | 9,
) {
  const sql = readFileSync(
    "supabase/proposals/hosted-repair/000-inspect-prerequisites.sql",
    "utf8",
  );
  const result = await client.query(sql);
  const actual = result.rows[0]?.repair_prerequisites;
  if (!actual || typeof actual !== "object")
    throw new Error("Read-only prerequisite metadata is unavailable.");
  const references = JSON.parse(readFileSync("supabase/repair-reference.json", "utf8")) as Record<
    string,
    Record<string, string>
  >;
  if (!references[String(stage)]) throw new Error("Reviewed prerequisite reference is missing.");
  const differences = repairMetadataDifferences(
    actual as Record<string, unknown>,
    references[String(stage)],
  );
  if (differences.length) {
    console.error("REVIEW REQUIRED: " + differences.join(", "));
    throw new Error(
      "Hosted grants, constraints, triggers or other prerequisites differ; no repair or Owner assignment permitted.",
    );
  }
}
