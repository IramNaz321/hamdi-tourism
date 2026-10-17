"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold">Trips could not be loaded</h1>
      <p className="mt-3 text-sm text-muted">
        Check your connection and retry. Contact your dispatcher if access remains unavailable.
      </p>
      <button className="button mt-5" onClick={reset}>
        Retry
      </button>
    </main>
  );
}
