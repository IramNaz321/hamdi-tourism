"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Script from "next/script";
type Turnstile = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
  reset: (id: string) => void;
};
export function TravelConcierge({ bookingId }: { bookingId?: string } = {}) {
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState("en");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState("");
  const [loaded, setLoaded] = useState(false);
  const element = useRef<HTMLDivElement>(null);
  const widget = useRef<string | undefined>(undefined);
  useEffect(() => {
    const ts = (window as unknown as { turnstile?: Turnstile }).turnstile;
    if (!open || !loaded || !element.current || !ts) return;
    widget.current = ts.render(element.current, {
      sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
      action: "travel_concierge",
      callback: (value: string) => setToken(value),
      "expired-callback": () => setToken(""),
    });
    return () => {
      if (widget.current) ts.remove(widget.current);
      widget.current = undefined;
    };
  }, [open, loaded]);
  return (
    <aside
      className="fixed bottom-5 end-5 z-40 max-w-[calc(100vw-2rem)]"
      aria-label="Travel concierge"
    >
      {open && (
        <section className="panel p-5 mb-3 w-96 max-w-full max-h-[75vh] overflow-y-auto space-y-4">
          <header className="flex justify-between">
            <h2 className="font-semibold">Travel concierge</h2>
            <button aria-label="Close travel concierge" onClick={() => setOpen(false)}>
              ✕
            </button>
          </header>
          <p className="text-xs text-muted">
            AI assistance uses published business information. Please avoid private or payment
            details. Reservations and fares require confirmation.
          </p>
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              setAnswer("");
              const form = new FormData(e.currentTarget);
              try {
                const response = await fetch("/api/concierge", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    message: form.get("message"),
                    language,
                    token,
                    bookingId,
                  }),
                  signal: AbortSignal.timeout(30000),
                });
                const data = await response.json();
                if (!response.ok) setError(data.error ?? "Concierge unavailable.");
                else setAnswer(data.answer);
              } catch {
                setError("Concierge unavailable. Please contact our team.");
              } finally {
                setBusy(false);
                const ts = (window as unknown as { turnstile?: Turnstile }).turnstile;
                if (widget.current) ts?.reset(widget.current);
                setToken("");
              }
            }}
          >
            <label className="field">
              Language
              <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option value="en">English</option>
                <option value="ar">العربية</option>
                <option value="ur">اردو</option>
                <option value="hi">हिन्दी</option>
              </select>
            </label>
            <label className="field">
              Your question
              <textarea
                name="message"
                required
                maxLength={1500}
                dir={["ar", "ur"].includes(language) ? "rtl" : "ltr"}
              />
            </label>
            {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
              <>
                <Script
                  src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
                  onReady={() => setLoaded(true)}
                />
                <div ref={element} />
              </>
            )}
            <button className="button" disabled={busy}>
              {busy ? "Checking…" : "Ask concierge"}
            </button>
          </form>
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          {answer && (
            <p
              dir={["ar", "ur"].includes(language) ? "rtl" : "ltr"}
              className="whitespace-pre-wrap text-sm"
              role="status"
            >
              {answer}
            </p>
          )}
          <Link className="text-sm underline" href="/#contact">
            Contact our team
          </Link>
        </section>
      )}
      <button className="button shadow-lg" onClick={() => setOpen(!open)} aria-expanded={open}>
        Travel concierge
      </button>
    </aside>
  );
}
