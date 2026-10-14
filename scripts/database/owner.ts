import { verifyRepairPrerequisites } from "./repair-prerequisites";
/** Guarded existing-organization Owner planning; applies only after verified identity and exact approval. */
import {
  audit,
  catalog,
  compareCatalog,
  connect,
  loadEnvironment,
  reference,
  reportError,
} from "./common";
import { ownerBootstrapInput, ownerMembershipDecision } from "./owner-approval";
async function main() {
  loadEnvironment();
  // Reject missing identity/approval before opening any database connection.
  const target = ownerBootstrapInput(process.argv.slice(2), process.env);
  const client = await connect();
  try {
    await client.query(target.apply ? "begin" : "begin read only");
    if (target.apply) {
      await client.query(
        "select pg_advisory_xact_lock(hashtextextended('hamdi-owner-bootstrap',0))",
      );
    }
    const org = await client.query(
      "select id from public.organizations where id=$1" + (target.apply ? " for update" : ""),
      [target.organizationId],
    );
    if (org.rowCount !== 1)
      throw new Error("Existing organization is required. No organization will be created.");
    if (target.apply)
      await client.query("lock table public.staff_members in share row exclusive mode");
    const actual = await catalog(client);
    const stages = [
      { driver: false, passenger: false },
      { driver: true, passenger: false },
      { driver: true, passenger: true },
    ].filter(
      (stage) =>
        compareCatalog(reference(stage.driver, stage.passenger).catalog, actual).length === 0,
    );
    if (stages.length !== 1)
      throw new Error("Schema drift requires review before Owner planning or assignment.");
    await audit(client, stages[0].driver, stages[0].passenger);
    await verifyRepairPrerequisites(client, stages[0].passenger ? 9 : stages[0].driver ? 8 : 7);
    const user = await client.query(
      "select id,email_confirmed_at is not null as confirmed, email is not null as has_email, deleted_at is not null as deleted,(banned_until is not null and banned_until>now()) as banned from auth.users where id=$1" +
        (target.apply ? " for update" : ""),
      [target.userId],
    );
    if (
      user.rowCount !== 1 ||
      !user.rows[0].confirmed ||
      !user.rows[0].has_email ||
      user.rows[0].deleted ||
      user.rows[0].banned
    )
      throw new Error(
        "Existing real user must have confirmed email and be neither deleted nor banned.",
      );
    const member = await client.query(
      "select organization_id,role,active from public.staff_members where user_id=$1",
      [target.userId],
    );
    // This client project permits one verified Owner, including inactive historical memberships.
    const owners = await client.query(
      "select user_id from public.staff_members where role='owner'",
    );
    const decision = ownerMembershipDecision(target, member.rows[0], owners.rows);
    if (decision === "already_configured") {
      console.log(
        "Existing active Owner membership matches the target organization; no changes made. Human identity approval is a separate prerequisite.",
      );
      await client.query("rollback");
      return;
    }
    if (!target.apply) {
      console.log(
        "PLAN: one active Owner membership for the selected existing Auth user in the configured existing organization. No new organization, user or operational records. Client identity and exact approval remain required; no changes made.",
      );
      await client.query("rollback");
      return;
    }
    const inserted = await client.query(
      "insert into public.staff_members(user_id,organization_id,email,display_name,role,active) select id,$2,email,$3,'owner',true from auth.users where id=$1 and email_confirmed_at is not null and deleted_at is null and (banned_until is null or banned_until<=now())",
      [target.userId, target.organizationId, target.name],
    );
    if (inserted.rowCount !== 1)
      throw new Error("Owner membership was not created; transaction will roll back.");
    await client.query("commit");
    console.log(
      "Approved Owner membership committed for the existing organization/user. No other accounts or operational records created.",
    );
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}
void main().catch(reportError);
