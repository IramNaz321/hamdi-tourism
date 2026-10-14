/** Receives only disposable-DB metadata filenames from repair-rehearsal.sh. Never connects to Supabase. */
import { readFileSync, writeFileSync } from "node:fs";
import { repairMetadataHashes } from "../database/repair-metadata";
const files = process.argv.slice(2, 5);
if (files.length !== 3) throw new Error("Three disposable-stage metadata files required.");
const actual = Object.fromEntries(
  files.map((file, index) => [
    String(index + 7),
    repairMetadataHashes(JSON.parse(readFileSync(file, "utf8"))),
  ]),
);
if (process.argv[5] === "true") {
  writeFileSync("supabase/repair-reference.json", JSON.stringify(actual, null, 2) + "\n");
  console.log("Prepared local-only repair prerequisite hashes.");
} else {
  const expected = JSON.parse(readFileSync("supabase/repair-reference.json", "utf8"));
  if (JSON.stringify(actual) !== JSON.stringify(expected))
    throw new Error(
      "Local repair reference changed; review SQL/permission drift before refreshing.",
    );
  console.log("PASS: local prerequisite references match all reviewed stages.");
}
