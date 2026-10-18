import { compareCatalog, type Catalog, type Reference } from "../database/common";
export type Stage = { version: 7 | 8 | 9 | 10; reference: Reference };
/** Full definitions/policies must match. Counts and a missing ledger never authorize SQL replay. */
export function compareStages(actual: Catalog, stages: Stage[]) {
  return stages.map(({ version, reference }) => ({
    version,
    tableCount: Object.keys(reference.catalog).filter((key) => key.startsWith("table:")).length,
    differences: compareCatalog(reference.catalog, actual),
  }));
}
export function migrationPlan(
  matches: ReturnType<typeof compareStages>,
  ledger: string[] | null,
  stages: Stage[],
) {
  const exact = matches.filter((stage) => stage.differences.length === 0);
  if (exact.length !== 1)
    return {
      status: "blocked",
      reason: "Schema drift or partial installation requires review; no SQL may be replayed.",
      pending: [] as string[],
    };
  const current = stages.find((stage) => stage.version === exact[0].version)!;
  const versions = Object.keys(current.reference.migrations)
    .map((file) => file.split("_")[0])
    .sort();
  if (
    ledger &&
    (ledger.some((version) => !versions.includes(version)) ||
      new Set(ledger).size !== ledger.length)
  )
    return {
      status: "blocked",
      reason: "Migration history conflicts with the actual matching schema; review required.",
      pending: [] as string[],
    };
  const unrecorded = versions.filter((version) => !ledger?.includes(version));
  const finalReference = stages.reduce((latest, stage) =>
    stage.version > latest.version ? stage : latest,
  ).reference;
  const pending = Object.keys(finalReference.migrations)
    .filter((file) => !Object.hasOwn(current.reference.migrations, file))
    .sort();
  return {
    status: "approval_required",
    schemaVersion: current.version,
    unrecorded,
    pending,
    reason: unrecorded.length
      ? "Approve ledger-only baseline for already-matching migrations; never replay their SQL. Then separately approve each genuinely pending migration."
      : pending.length
        ? "Separately approve each genuinely pending migration after Owner/configuration verification."
        : "No schema migration needed; hosted Auth, membership and launch acceptance remain separate gates.",
  };
}
/** Errors may contain connection strings, passwords, request headers or personal data. Inspect codes only. */
export function safeFailure(error: unknown): { category: string; reason: string } {
  const object =
    error && typeof error === "object"
      ? (error as { code?: string; name?: string; cause?: unknown })
      : {};
  const code = object.code;
  if (code === "28P01" || code === "28000")
    return {
      category: "authentication",
      reason:
        "Database credentials were rejected. Update the secure binding; do not paste credentials in chat.",
    };
  if (code === "42501")
    return {
      category: "authorization",
      reason: "Connected account lacks read access required for this audit.",
    };
  if (
    code &&
    [
      "ENOTFOUND",
      "EAI_AGAIN",
      "ECONNREFUSED",
      "ETIMEDOUT",
      "ENETUNREACH",
      "EHOSTUNREACH",
      "ECONNRESET",
      "UND_ERR_CONNECT_TIMEOUT",
    ].includes(code)
  )
    return {
      category: "network",
      reason:
        "The database or API could not be reached. Check the selected connection endpoint and network access.",
    };
  if (
    code &&
    [
      "CERT_HAS_EXPIRED",
      "DEPTH_ZERO_SELF_SIGNED_CERT",
      "SELF_SIGNED_CERT_IN_CHAIN",
      "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
      "ERR_TLS_CERT_ALTNAME_INVALID",
    ].includes(code)
  )
    return {
      category: "tls",
      reason: "TLS certificate verification failed. Do not disable verification.",
    };
  if (object.name === "TimeoutError" || object.name === "AbortError")
    return { category: "network", reason: "Connection or read request timed out." };
  if (object.cause) return safeFailure(object.cause);
  return {
    category: "unclassified",
    reason: "Audit did not complete. No credential values or raw provider errors are displayed.",
  };
}
export function authPolicy(
  settings: { disable_signup?: boolean; mailer_autoconfirm?: boolean },
  passengerEnabled: boolean,
) {
  return {
    signupPolicy:
      settings.disable_signup === !passengerEnabled
        ? "matches_application_mode"
        : typeof settings.disable_signup === "boolean"
          ? "review_required"
          : "not_verified",
    emailConfirmation:
      settings.mailer_autoconfirm === false
        ? "required"
        : settings.mailer_autoconfirm === true
          ? "unsafe_auto_confirmation"
          : "not_verified",
  };
}

/** API preflight is restricted to GET/HEAD, with bounded requests and no credential-bearing redirects. */
export async function readOnlyFetch(input: RequestInfo | URL, init?: RequestInit) {
  const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
  if (!["GET", "HEAD"].includes(method))
    throw new Error("Read-only API verification rejects mutation methods.");
  const timeout = AbortSignal.timeout(15000);
  return fetch(input, {
    ...init,
    method,
    redirect: "error",
    signal: init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout,
  });
}

export function safeMembership(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  return {
    role: ["owner", "manager", "dispatcher", "viewer", "driver"].includes(String(row.role))
      ? String(row.role)
      : "unrecognized_role_redacted",
    active: row.active === true ? true : row.active === false ? false : null,
    matches_configured_org:
      row.matches_configured_org === true
        ? true
        : row.matches_configured_org === false
          ? false
          : null,
  };
}
