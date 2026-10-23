import { useState, type FormEvent } from "react";
import { errorMessage, todayUae, type Resources, type OnboardingInput } from "../domain";
import { useApp } from "../state";
import { Alert, Button, Field } from "./ui";
export function DriverOnboarding({
  driver,
  onSaved,
}: {
  driver: Resources["drivers"][number];
  onSaved: () => void;
}) {
  const { service } = useApp();
  const [input, setInput] = useState<Omit<OnboardingInput, "acceptedPolicies">>({
    name: driver.name,
    phone: driver.phone,
    licenceNumber: driver.licenceNumber ?? "",
    licenceUntil: "",
  });
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!accepted) return;
    setBusy(true);
    setError("");
    try {
      await service.driverSubmitOnboarding({ ...input, acceptedPolicies: true });
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  if (driver.onboardingStatus === "submitted")
    return (
      <section className="driver-onboarding">
        <p className="eyebrow">ONBOARDING SUBMITTED</p>
        <h1>You’re nearly ready.</h1>
        <p>The Owner is reviewing your details. Your assignments will appear after activation.</p>
        <Alert kind="info">Waiting for Owner approval. This page updates automatically.</Alert>
      </section>
    );
  if (driver.onboardingStatus === "approved" && !driver.active)
    return (
      <section className="driver-onboarding">
        <h1>Your account is inactive.</h1>
        <p>Contact the Owner to reactivate your access. Your previous trips remain saved.</p>
      </section>
    );
  return (
    <section className="driver-onboarding">
      <p className="eyebrow">WELCOME TO HAMDI</p>
      <h1>Get ready to drive.</h1>
      <p>Check your contact details and submit your licence information for Owner review.</p>
      <form onSubmit={submit} className="stack-form">
        <Field label="Full name" htmlFor="onboard-name">
          <input
            id="onboard-name"
            required
            value={input.name}
            onChange={(e) => setInput({ ...input, name: e.target.value })}
          />
        </Field>
        <Field label="Phone number" htmlFor="onboard-phone">
          <input
            id="onboard-phone"
            type="tel"
            required
            value={input.phone}
            onChange={(e) => setInput({ ...input, phone: e.target.value })}
          />
        </Field>
        <Field label="Driving licence number" htmlFor="onboard-licence">
          <input
            id="onboard-licence"
            required
            value={input.licenceNumber}
            onChange={(e) => setInput({ ...input, licenceNumber: e.target.value })}
          />
        </Field>
        <Field label="Licence expires" htmlFor="onboard-expiry">
          <input
            id="onboard-expiry"
            type="date"
            required
            min={todayUae()}
            value={input.licenceUntil}
            onChange={(e) => setInput({ ...input, licenceUntil: e.target.value })}
          />
        </Field>
        <label className="terms-check">
          <input
            type="checkbox"
            required
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
          />
          <span>
            I confirm these details are accurate and agree to follow the assigned trip instructions.
          </span>
        </label>
        {error ? <Alert>{error}</Alert> : null}
        <Button type="submit" className="full-width" busy={busy} disabled={!accepted}>
          Submit for review
        </Button>
      </form>
    </section>
  );
}
