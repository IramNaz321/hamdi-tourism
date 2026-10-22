/** Ownership changes belong to separately approved client onboarding, never staff forms. */
export function staffAccessChangeAllowed(currentRole: string, nextRole: string) {
  if (currentRole === "owner" || nextRole === "owner") return false;
  if (currentRole === "driver" || nextRole === "driver")
    return currentRole === "driver" && nextRole === "driver";
  return (
    ["manager", "dispatcher", "viewer"].includes(currentRole) &&
    ["manager", "dispatcher", "viewer"].includes(nextRole)
  );
}
