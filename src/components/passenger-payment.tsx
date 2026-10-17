"use client";
import { useActionState } from "react";
import { checkout } from "@/app/passenger/payment-actions";
export function CheckoutForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(checkout, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      {state.error && (
        <p role="alert" className="notice error">
          {state.error}
        </p>
      )}
      <button className="button" disabled={pending}>
        {pending ? "Opening checkout…" : "Continue to secure payment"}
      </button>
    </form>
  );
}
