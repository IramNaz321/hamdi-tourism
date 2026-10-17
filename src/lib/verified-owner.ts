/** Server-only configuration must be set only after explicit client identity approval.
 * It does not create membership or grant any database privileges. */
export function isVerifiedOwner(
  userId: string,
  member: { role: string; active: boolean; organization_id: string },
  env: {
    [key: string]: string | undefined;
    HAMDI_OWNER_USER_ID?: string;
    HAMDI_ORGANIZATION_ID?: string;
  },
) {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return Boolean(
    env.HAMDI_OWNER_USER_ID &&
    uuid.test(env.HAMDI_OWNER_USER_ID) &&
    env.HAMDI_ORGANIZATION_ID &&
    uuid.test(env.HAMDI_ORGANIZATION_ID) &&
    userId === env.HAMDI_OWNER_USER_ID &&
    member.organization_id === env.HAMDI_ORGANIZATION_ID &&
    member.active &&
    member.role === "owner",
  );
}
