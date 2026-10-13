import { z } from "zod";
import { audit, connect, loadEnvironment, projectRef, reportError } from "./common";
function argument(name: string) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}
async function main() {
  loadEnvironment();
  const userId = z.uuid().parse(argument("--user-id"));
  const apply = process.argv.includes("--apply");
  const suppliedName = argument("--name");
  const name =
    !apply && !suppliedName ? null : z.string().trim().min(1).max(200).parse(suppliedName);
  if (apply && argument("--approve") !== `${projectRef}:${userId}`)
    throw new Error("Explicit project/user approval is required.");
  const client = await connect();
  try {
    await client.query(apply ? "begin" : "begin read only");
    if (apply) {
      await client.query(
        "select pg_advisory_xact_lock(hashtextextended('hamdi-owner-bootstrap',0))",
      );
      await client.query("lock table public.organizations in share row exclusive mode");
    }
    await audit(client);
    const user = await client.query(
      "select id,email_confirmed_at is not null as confirmed, deleted_at is not null as deleted,(banned_until is not null and banned_until>now()) as banned from auth.users where id=$1" +
        (apply ? " for update" : ""),
      [userId],
    );
    if (
      user.rowCount !== 1 ||
      !user.rows[0].confirmed ||
      user.rows[0].deleted ||
      user.rows[0].banned
    )
      throw new Error("Real user must exist, be confirmed, not deleted and not currently banned.");
    const member = await client.query(
      "select organization_id,role,active from public.staff_members where user_id=$1",
      [userId],
    );
    if (member.rowCount) {
      if (member.rows[0].role !== "owner" || !member.rows[0].active)
        throw new Error("Existing membership must be reviewed; no automatic promotion.");
      console.log(
        `ALREADY CONFIGURED: active owner; organization ${member.rows[0].organization_id}. No changes made.`,
      );
      await client.query("rollback");
      return;
    }
    const businesses = await client.query(
      "select count(*)::int as count from public.organizations",
    );
    if (businesses.rows[0].count !== 0)
      throw new Error(
        "Existing business requires review. Do not create a duplicate organization or silently attach a new owner.",
      );
    if (!apply) {
      console.log(
        `PLAN: confirmed Auth user ${userId}; create one Hamdi Tourism organization and one active owner membership. No operational records. Real display name, explicit client authorization and approval required before --apply.`,
      );
      await client.query("rollback");
      return;
    }
    const organization = await client.query(
      "insert into public.organizations(name) values('Hamdi Tourism') returning id",
    );
    const org = organization.rows[0].id;
    const inserted = await client.query(
      "insert into public.staff_members(user_id,organization_id,email,display_name,role) select id,$2,email,$3,'owner' from auth.users where id=$1 and email_confirmed_at is not null and deleted_at is null and (banned_until is null or banned_until<=now())",
      [userId, org, name],
    );
    if (inserted.rowCount !== 1)
      throw new Error("Owner membership was not created; transaction rolled back.");
    await client.query("commit");
    console.log(
      `Owner bootstrap committed. Set HAMDI_ORGANIZATION_ID securely to ${org}. No customers, drivers, vehicles, prices or bookings created.`,
    );
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}
void main().catch(reportError);
