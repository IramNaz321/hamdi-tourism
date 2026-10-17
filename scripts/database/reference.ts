/** Generate expected metadata only, inside a fresh disposable local PostgreSQL. */
import { spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
const container = `hamdi-reference-${process.pid}`;
function docker(args: string[], input?: string) {
  const result = spawnSync("docker", args, {
    input,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  if (result.status !== 0) throw new Error("Disposable reference database command failed.");
  return result.stdout;
}
async function main() {
  try {
    docker([
      "run",
      "-d",
      "--name",
      container,
      "-e",
      `POSTGRES_PASSWORD=${randomBytes(32).toString("hex")}`,
      "postgres:17-alpine",
    ]);
    let ready = false;
    for (let n = 0; n < 30; n++) {
      const result = spawnSync(
        "docker",
        ["exec", container, "pg_isready", "-h", "127.0.0.1", "-U", "postgres"],
        { stdio: "ignore" },
      );
      if (result.status === 0) {
        ready = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    if (!ready) throw new Error("Local reference database unavailable.");
    const migrations: Record<string, string> = {};
    let sql = readFileSync("supabase/tests/auth-shim.sql", "utf8");
    const base = Object.keys(
      JSON.parse(readFileSync("supabase/schema-reference.json", "utf8")).migrations,
    );
    for (const file of readdirSync("supabase/migrations")
      .filter(
        (n) =>
          n.endsWith(".sql") &&
          (process.argv.includes("--with-passenger") ||
            (process.argv.includes("--with-driver") && n.split("_")[0] <= "202610120008") ||
            base.includes(n)),
      )
      .sort()) {
      const content = readFileSync(`supabase/migrations/${file}`, "utf8");
      migrations[file] = createHash("sha256").update(content).digest("hex");
      sql += "\n" + content;
    }
    docker(["exec", "-i", container, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1"], sql);
    const catalog = JSON.parse(
      docker(
        ["exec", "-i", container, "psql", "-U", "postgres", "-t", "-A", "-v", "ON_ERROR_STOP=1"],
        readFileSync("scripts/database/catalog.sql", "utf8"),
      ),
    );
    writeFileSync(
      process.argv.includes("--with-passenger")
        ? "supabase/schema-reference-passenger.json"
        : process.argv.includes("--with-driver")
          ? "supabase/schema-reference-driver.json"
          : "supabase/schema-reference.json",
      JSON.stringify({ migrations, catalog }, null, 2) + "\n",
    );
    console.log(
      `Generated ${Object.keys(catalog).length} expected metadata objects from ${Object.keys(migrations).length} local migrations. No hosted project contacted.`,
    );
  } finally {
    spawnSync("docker", ["rm", "-f", container], { stdio: "ignore" });
  }
}
void main().catch(() => {
  console.error("Local schema-reference generation failed.");
  process.exitCode = 1;
});
