"use client";
import { useActionState } from "react";
import { reviewEnquiry, convertEnquiry } from "@/app/admin/enquiries/actions";
import { Button } from "@/components/ui/button";
export function EnquiryReview({
  id,
  version,
  returnTransfer,
}: {
  id: string;
  version: string;
  returnTransfer: boolean;
}) {
  const [state, action, pending] = useActionState(reviewEnquiry.bind(null, id), {});
  const [conversion, convert, converting] = useActionState(convertEnquiry.bind(null, id), {});
  return (
    <div className="grid lg:grid-cols-2 gap-6 mt-6">
      <form action={action} className="panel p-6">
        <h2 className="font-semibold mb-5">Review enquiry</h2>
        <input name="updated_at" type="hidden" value={version} />
        <label className="field">
          Review outcome
          <select name="status">
            <option value="reviewed">Reviewed</option>
            <option value="closed">Closed</option>
          </select>
        </label>
        {state.error && (
          <p role="alert" className="notice error mt-4">
            {state.error}
          </p>
        )}
        {state.success && (
          <p role="status" className="notice mt-4">
            {state.success}
          </p>
        )}
        <Button className="mt-5" disabled={pending}>
          {pending ? "Saving…" : "Save review"}
        </Button>
      </form>
      <form
        action={convert}
        className="panel p-6"
        onSubmit={(e) => {
          if (
            !window.confirm(
              "Create pending booking records and a customer from this genuine enquiry? Confirm the submitted quote and journey details with the customer before confirming any trip.",
            )
          )
            e.preventDefault();
        }}
      >
        <h2 className="font-semibold mb-3">Create pending bookings</h2>
        <p className="text-sm text-muted mb-5">
          This creates a customer from the enquiry and{" "}
          {returnTransfer ? "one booking for each leg" : "a pending booking"}. Assignments and
          confirmation follow separately. The submitted pricing snapshot is retained.
        </p>
        <label className="field">
          Outbound expected end (UAE)
          <input name="outbound_end" type="datetime-local" required />
        </label>
        {returnTransfer && (
          <label className="field mt-4">
            Return expected end (UAE)
            <input name="return_end" type="datetime-local" required />
          </label>
        )}
        {conversion.error && (
          <p role="alert" className="notice error mt-4">
            {conversion.error}
          </p>
        )}
        <Button className="mt-5" disabled={converting}>
          {converting ? "Creating…" : "Create pending bookings"}
        </Button>
      </form>
    </div>
  );
}
