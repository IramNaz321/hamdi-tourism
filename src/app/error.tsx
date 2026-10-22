"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="min-h-[70vh] flex flex-col justify-center items-center p-8">
      <h1 className="text-2xl font-semibold mb-3">Something went wrong</h1>
      <p className="text-muted mb-6">Please try again or contact the business owner.</p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
