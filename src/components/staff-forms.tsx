"use client";
import { useActionState } from "react";
import { inviteStaff, updateStaff, cancelInvitation } from "@/app/admin/staff/actions";
export function InvitationForm({ configured }: { configured: boolean }) {
  const [state, action, pending] = useActionState(inviteStaff, {});
  return (
    <form action={action} className="panel p-6">
      <h2 className="text-lg font-semibold mb-2">Invite a team member</h2>
      <p className="text-sm text-muted mb-6">
        Send an email invitation. Staff choose their own password.
      </p>
      {!configured && (
        <p className="notice mb-5">
          Email invitations are not available yet. Configure invitation delivery before adding
          staff.
        </p>
      )}
      {state.error && (
        <p className="notice error mb-5" role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="notice mb-5" role="status">
          {state.success}
        </p>
      )}
      <div className="grid sm:grid-cols-3 gap-4">
        <label className="field">
          Name
          <input name="name" required maxLength={200} autoComplete="name" />
        </label>
        <label className="field">
          Email
          <input name="email" type="email" required maxLength={254} autoComplete="email" />
        </label>
        <label className="field">
          Role
          <select name="role" defaultValue="viewer">
            <option value="viewer">Viewer</option>
            <option value="dispatcher">Dispatcher</option>
            <option value="manager">Manager</option>
          </select>
        </label>
      </div>
      <button className="button mt-6" disabled={pending || !configured}>
        {pending ? "Sending…" : "Send invitation"}
      </button>
    </form>
  );
}
export function StaffAccessForm({
  staff,
}: {
  staff: { user_id: string; role: string; active: boolean; display_name: string };
}) {
  const [state, action, pending] = useActionState(updateStaff.bind(null, staff.user_id), {});
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (
          !window.confirm(
            `Update access for ${staff.display_name}? Owners can manage all records and staff access.`,
          )
        )
          e.preventDefault();
      }}
    >
      <div className="flex flex-wrap gap-3 items-center">
        <label className="field">
          <span className="sr-only">Role for {staff.display_name}</span>
          <select name="role" defaultValue={staff.role} className="min-h-0! py-2!">
            {staff.role === "driver" ? (
              <option value="driver">Driver</option>
            ) : (
              <>
                <option value="viewer">Viewer</option>
                <option value="dispatcher">Dispatcher</option>
                <option value="manager">Manager</option>
                <option value="owner">Owner</option>
              </>
            )}
          </select>
        </label>
        <label className="flex gap-2 items-center text-xs">
          <input type="checkbox" name="active" defaultChecked={staff.active} />
          Active
        </label>
        <button className="button secondary py-2! text-xs" disabled={pending}>
          {pending ? "Saving…" : "Save access"}
        </button>
      </div>
      {state.error && (
        <p className="text-xs text-red-700 mt-2" role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="text-xs text-muted mt-2" role="status">
          {state.success}
        </p>
      )}
    </form>
  );
}
export function CancelInvitationForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(cancelInvitation.bind(null, id), {});
  return (
    <form action={action}>
      <button disabled={pending} className="text-xs underline">
        {pending ? "Cancelling…" : "Cancel invitation"}
      </button>
      {state.error && (
        <p role="alert" className="text-xs text-red-700">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-xs">
          {state.success}
        </p>
      )}
    </form>
  );
}
