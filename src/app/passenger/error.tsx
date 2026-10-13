"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="max-w-lg mx-auto p-8 space-y-5">
      <h1 className="text-2xl font-semibold">Account temporarily unavailable</h1>
      <p role="alert">Your information could not be loaded. Please retry or contact our team.</p>
      <button className="button" onClick={reset}>
        Retry
      </button>
    </main>
  );
}
