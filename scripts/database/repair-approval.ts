import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { projectRef } from "./common";
const files = {
  settings: "supabase/proposals/hosted-repair/010-settings-candidate.sql",
  driver: "supabase/proposals/hosted-repair/020-driver-candidate.sql",
  passenger: "supabase/proposals/hosted-repair/030-passenger-candidate.sql",
} as const;
export function repairInput(args: string[], env: Record<string, string | undefined>) {
  const value = (key: string) => {
    const i = args.indexOf(key);
    return i < 0 ? undefined : args[i + 1];
  };
  const step = value("--step");
  if (!step || !Object.hasOwn(files, step)) throw new Error("Choose a reviewed repair step.");
  const file = files[step as keyof typeof files];
  const sql = readFileSync(file, "utf8");
  // These reviewed candidates intentionally target this existing organization.
  const organizationId = "9f53250d-5e05-409d-9182-3d45448aa399";
  if (env.HAMDI_ORGANIZATION_ID !== organizationId)
    throw new Error("Repair target does not match the configured existing organization.");
  const hash = createHash("sha256").update(sql).digest("hex");
  const approval = `${projectRef}:${organizationId}:${step}:${hash}`;
  const apply = args.includes("--apply");
  if (apply && value("--approve") !== approval)
    throw new Error("Exact project/organization/step/SQL-hash approval is required.");
  return { step: step as keyof typeof files, file, sql, hash, organizationId, approval, apply };
}
export function repairDecision(
  step: "settings" | "driver" | "passenger",
  stage: 7 | 8 | 9,
  settingsExist: boolean,
) {
  if (step === "settings") return settingsExist ? "already_installed" : "pending";
  if (step === "driver") return stage >= 8 ? "already_installed" : "pending";
  if (stage === 7) throw new Error("Driver repair must be verified before Passenger repair.");
  return stage === 9 ? "already_installed" : "pending";
}
