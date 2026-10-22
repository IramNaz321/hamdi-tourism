import { requireStaff } from "@/lib/auth";
import { reviewCancellation } from "@/app/admin/passenger-platform/actions";
export async function PassengerBookingAdmin({ id }: { id: string }) {
  const { supabase, member } = await requireStaff();
  const { data, error } = await supabase.rpc("admin_passenger_booking", { trip: id });
  if (error)
    return (
      <p className="notice mt-6">
        Passenger payment and cancellation information is currently unavailable.
      </p>
    );
  if (!data) return null;
  return (
    <section className="panel p-5 mt-6 space-y-3">
      <h2 className="font-semibold">Passenger account and payment review</h2>
      {data.preferred_vehicle && (
        <p>
          Passenger vehicle preference: {data.preferred_vehicle}. Dispatch assigns the actual
          vehicle.
        </p>
      )}
      <p>
        Verified ledger: paid AED {Number(data.paid_aed).toFixed(2)}, refunds AED{" "}
        {Number(data.refunded_aed).toFixed(2)}.
      </p>
      {data.payment && (
        <>
          <p>
            Provider checkout state: {data.payment.status} · AED{" "}
            {(Number(data.payment.amount_minor) / 100).toFixed(2)}
          </p>
          <p className="break-all text-sm">
            Stripe session: {data.payment.session_id ?? "Not attached"} · Payment intent:{" "}
            {data.payment.payment_intent_id ?? "Not verified"}
          </p>
          <p className="text-sm">
            Reconcile mismatches using the verified Stripe merchant dashboard. This portal does not
            issue refunds or initiate an additional charge.
          </p>
        </>
      )}
      {data.cancellation && (
        <>
          <h3 className="font-semibold">Cancellation request: {data.cancellation.status}</h3>
          <p className="whitespace-pre-wrap">{data.cancellation.reason}</p>
          {["owner", "manager", "dispatcher"].includes(member.role) &&
            data.cancellation.status === "requested" && (
              <form action={reviewCancellation}>
                <input type="hidden" name="id" value={id} />
                <button className="button secondary">Mark request reviewed</button>
              </form>
            )}
          <p className="text-sm">
            Use the existing authorized booking status workflow to cancel if approved. Marking
            reviewed does not cancel or refund.
          </p>
        </>
      )}
    </section>
  );
}
