"use client";
import { useActionState } from "react";
import { reviewManualEnquiry } from "@/app/admin/manual-enquiries/actions";

export function ManualEnquiryReview({
  id,
  version,
  status,
}: {
  id: string;
  version: string;
  status: string;
}) {
  const action = reviewManualEnquiry.bind(null, id);
  const [state, submit, pending] = useActionState(action, {});
  if (status === "closed") return <p className="notice mt-6">This request is closed.</p>;
  return (
    <form action={submit} className="panel p-6 mt-6">
      <input type="hidden" name="updated_at" value={version} />
      <label className="field">
        Review status
        <select name="status" defaultValue="reviewed">
          <option value="reviewed">Reviewed</option>
          <option value="closed">Closed</option>
        </select>
      </label>
      {state.error && <p className="notice error mt-4" role="alert">{state.error}</p>}
      {state.success && <p className="notice mt-4" role="status">{state.success}</p>}
      <button className="button mt-4" disabled={pending}>
        {pending ? "Saving…" : "Update request"}
      </button>
    </form>
  );
}
