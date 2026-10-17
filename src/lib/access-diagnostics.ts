/** Log only a static stage and bounded provider code, never identities, tokens or raw errors. */
export function reportAccessFailure(
  stage: "staff-login" | "passenger-login" | "admin" | "driver" | "passenger",
  error: unknown,
) {
  const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
  console.error("Account permission check failed", {
    stage,
    code: typeof code === "string" && /^[A-Za-z0-9_]{1,40}$/.test(code) ? code : "unavailable",
  });
}
