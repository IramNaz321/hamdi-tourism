import { requireOwner } from "@/lib/auth";
import { InvitationForm, StaffAccessForm, CancelInvitationForm } from "@/components/staff-forms";
import { dateTime } from "@/lib/entities";
export default async function StaffPage() {
  const { supabase, member } = await requireOwner();
  const [staff, invitations] = await Promise.all([
    supabase
      .from("staff_members")
      .select("user_id,display_name,email,role,active")
      .eq("organization_id", member.organization_id)
      .order("created_at"),
    supabase
      .from("staff_invitations")
      .select("id,email,role,expires_at,accepted_at")
      .eq("organization_id", member.organization_id)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }),
  ]);
  if (staff.error || invitations.error) throw new Error("Unable to load staff access.");
  const configured =
    !!process.env.SUPABASE_SERVICE_ROLE_KEY &&
    !process.env.SUPABASE_SERVICE_ROLE_KEY.includes("your-server-only") &&
    !!process.env.NEXT_PUBLIC_SITE_URL;
  return (
    <>
      <p className="eyebrow mb-3">OWNER CONTROLS</p>
      <h1 className="text-3xl font-semibold tracking-tight mb-3">Staff & access</h1>
      <p className="text-sm text-muted mb-8">
        Invite your team, assign permissions and disable access when needed.
      </p>
      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-7">
        {[
          ["Owner", "All operations, invitations and staff permissions."],
          ["Manager", "Create and manage all operational records. No staff controls."],
          ["Dispatcher", "Manage bookings and customers. View fleet, locations and prices."],
          ["Viewer", "Read-only access to operational records."],
        ].map(([title, text]) => (
          <div className="panel p-5" key={title}>
            <h2 className="font-semibold text-sm mb-2">{title}</h2>
            <p className="text-xs text-muted leading-relaxed">{text}</p>
          </div>
        ))}
      </section>
      <InvitationForm configured={configured} />
      <section className="panel mt-7 overflow-hidden">
        <h2 className="font-semibold p-6">Team members</h2>
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Staff member</th>
                <th scope="col">Current access</th>
                <th scope="col">Manage access</th>
              </tr>
            </thead>
            <tbody>
              {staff.data?.map((person) => (
                <tr key={person.user_id}>
                  <td>
                    <p className="font-semibold">{person.display_name}</p>
                    <p className="text-xs text-muted mt-1">{person.email}</p>
                  </td>
                  <td>
                    <span className="badge">{person.active ? person.role : "Disabled"}</span>
                  </td>
                  <td>
                    <StaffAccessForm staff={person} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <p className="text-xs text-muted mt-4">
        Disabling a member immediately blocks database access, including existing sessions. At least
        one active owner must remain.
      </p>
      {Boolean(invitations.data?.length) && (
        <section className="panel mt-7 p-6">
          <h2 className="font-semibold mb-5">Pending invitations</h2>
          <div className="space-y-4">
            {invitations.data?.map((invitation) => (
              <div
                key={invitation.id}
                className="flex flex-wrap justify-between gap-3 border-t border-stone-100 pt-4"
              >
                <div>
                  <p className="text-sm">
                    {invitation.email} · {invitation.role}
                  </p>
                  <p className="text-xs text-muted mt-1">
                    Expires {dateTime(invitation.expires_at)} (UAE)
                  </p>
                </div>
                <CancelInvitationForm id={invitation.id} />
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
