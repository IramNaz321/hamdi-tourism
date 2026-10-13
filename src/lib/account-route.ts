export function accountRoute(member: { role: string; active: boolean } | null | undefined) {
  if (!member?.active) return "/access-pending";
  if (member.role === "driver") return "/driver-account";
  if (["owner", "manager", "dispatcher", "viewer"].includes(member.role)) return "/admin";
  return "/access-pending";
}
