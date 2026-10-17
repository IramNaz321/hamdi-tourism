import { z } from "zod";
import { projectRef } from "./common";
export function ownerBootstrapInput(args: string[], env: Record<string, string | undefined>) {
  const value = (name: string) => {
    const index = args.indexOf(name);
    return index < 0 ? undefined : args[index + 1];
  };
  const userId = z.uuid().parse(value("--user-id"));
  const organizationId = z.uuid().parse(value("--organization-id") ?? env.HAMDI_ORGANIZATION_ID);
  if (organizationId !== env.HAMDI_ORGANIZATION_ID)
    throw new Error("Target must match the configured existing organization.");
  const apply = args.includes("--apply");
  const name = value("--name")?.trim();
  const approval = `${projectRef}:${organizationId}:${userId}:owner`;
  if (apply) {
    if (env.HAMDI_OWNER_USER_ID !== userId)
      throw new Error(
        "Client identity must be explicitly verified and configured before Owner assignment.",
      );
    if (value("--approve") !== approval)
      throw new Error("Explicit project, organization and user approval is required.");
    if (!name || name.length > 200) throw new Error("Confirmed real display name is required.");
  }
  return { userId, organizationId, apply, name, approval };
}
export function ownerMembershipDecision(
  target: { userId: string; organizationId: string },
  member: { role: string; active: boolean; organization_id: string } | undefined,
  owners: { user_id: string }[],
): "already_configured" | "insert_after_approval" {
  if (owners.some((owner) => owner.user_id !== target.userId))
    throw new Error(
      "Another Owner exists. Review identity and access; no second Owner will be created.",
    );
  if (member) {
    if (
      member.organization_id !== target.organizationId ||
      member.role !== "owner" ||
      !member.active
    )
      throw new Error(
        "Existing membership requires review; no automatic promotion, reactivation or reassignment.",
      );
    return "already_configured";
  }
  return "insert_after_approval";
}
