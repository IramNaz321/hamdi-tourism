"use client";
export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <div className="panel p-8">
      <h2 className="text-xl font-semibold mb-3">Unable to load your information</h2>
      <p className="text-muted mb-6">
        Please try again. If the problem continues, contact the account owner. Your records have not
        been replaced with empty results.
      </p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
