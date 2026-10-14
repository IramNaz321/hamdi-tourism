import { test } from "node:test";
import assert from "node:assert/strict";
import { readMigrationHistory } from "../scripts/database/migration-history";
test("missing migration ledger never triggers a query against the missing relation", async () => {
  const statements: string[] = [];
  const result = await readMigrationHistory({
    query: async (sql) => {
      statements.push(sql);
      if (statements.length > 1) throw new Error("42P01: missing table");
      return { rows: [{ exists: false }] };
    },
  });
  assert.deepEqual(result, { present: false, versions: [] });
  assert.equal(statements.length, 1);
  assert.match(statements[0], /to_regclass/);
});
test("existing migration ledger is read without creating schema or changing data", async () => {
  const statements: string[] = [];
  const result = await readMigrationHistory({
    query: async (sql) => {
      statements.push(sql);
      return statements.length === 1
        ? { rows: [{ exists: true }] }
        : { rows: [{ version: "202610120001" }] };
    },
  });
  assert.deepEqual(result, { present: true, versions: ["202610120001"] });
  assert.ok(statements.every((sql) => sql.startsWith("select ")));
});
