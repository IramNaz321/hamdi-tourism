"use client";
import { useActionState } from "react";
import { inviteDriver } from "@/app/admin/staff/driver-actions";
import { Button } from "@/components/ui/button";
export function DriverInvitation({ id, linked }: { id: string; linked: boolean }) {
  const [state, action, pending] = useActionState(inviteDriver.bind(null, id), {});
  return (
    <section className="panel p-6 mt-6">
      <h2 className="font-semibold mb-3">Driver account</h2>
      {linked ? (
        <p className="text-sm text-muted">
          This profile is linked to a driver account. Use Account status to activate or deactivate
          access. Driver accounts cannot enter the management portal.
        </p>
      ) : (
        <form action={action}>
          <p className="text-sm text-muted mb-5">
            Invite this driver using the email saved on their profile. They will choose their own
            password. Driver account access is restricted to the driver role.
          </p>
          {state.error && (
            <p role="alert" className="notice error mb-4">
              {state.error}
            </p>
          )}
          {state.success && (
            <p role="status" className="notice mb-4">
              {state.success}
            </p>
          )}
          <Button disabled={pending}>{pending ? "Sending…" : "Invite driver"}</Button>
        </form>
      )}
    </section>
  );
}
