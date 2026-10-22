"use client";
import { useActionState } from "react";
import { saveFareDraft } from "@/app/admin/pricing-review/actions";

export function FareDraftForm({ routeId, category }: { routeId: string; category: string }) {
  const [state, action, pending] = useActionState(saveFareDraft, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="route_id" value={routeId} />
      <input type="hidden" name="category" value={category} />
      <label className="field">
        Proposed outbound fare (AED)
        <input name="price_aed" type="number" min="0.01" max="10000000" step="0.01" required />
      </label>
      <label className="field">
        Additional charge per leg (AED)
        <input
          name="additional_charges_aed"
          type="number"
          min="0"
          max="10000000"
          step="0.01"
          defaultValue="0"
          required
        />
      </label>
      <label className="field">
        Optional return fare (AED)
        <input name="return_fare_aed" type="number" min="0.01" max="10000000" step="0.01" />
      </label>
      <label className="flex items-start gap-2 text-xs text-muted">
        <input type="checkbox" name="confirm" value="yes" required />
        I reviewed this amount for our real route and vehicle; save it unpublished.
      </label>
      {state.error && <p className="notice error" role="alert">{state.error}</p>}
      {state.success && <p className="notice" role="status">{state.success}</p>}
      <button className="button secondary" disabled={pending}>
        {pending ? "Saving…" : "Save unpublished draft"}
      </button>
    </form>
  );
}
