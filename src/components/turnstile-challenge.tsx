"use client";
import { useRef, useEffect, useState } from "react";
import Script from "next/script";
type Turnstile = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
type Status = "loading" | "waiting" | "verified" | "expired" | "unavailable";
export function TurnstileChallenge({
  action,
  onToken,
}: {
  action: string;
  onToken: (token: string) => void;
}) {
  const element = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<Status>("loading");
  useEffect(() => {
    if (!ready) return;
    let alive = true;
    let id: string | undefined;
    const api = (window as unknown as { turnstile?: Turnstile }).turnstile;
    const report = (next: Status, token = "") => {
      if (!alive) return;
      onToken(token);
      setStatus(next);
    };
    queueMicrotask(() => {
      if (!alive) return;
      if (!element.current || !api || !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
        report("unavailable");
        return;
      }
      report("waiting");
      try {
        id = api.render(element.current, {
          sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
          action,
          callback: (token: string) => report(token ? "verified" : "unavailable", token),
          "expired-callback": () => report("expired"),
          "error-callback": () => report("unavailable"),
        });
      } catch {
        report("unavailable");
      }
    });
    return () => {
      alive = false;
      if (id && api) {
        try {
          api.remove(id);
        } catch {
          /* A failed widget must not break page navigation. */
        }
      }
    };
  }, [ready, action, onToken]);
  const messages = {
    loading: "Loading security check…",
    waiting: "Complete the security check to continue.",
    verified: "Security check completed.",
    expired: "Security check expired. Complete a new check to continue.",
    unavailable: "Security check is unavailable. Reload this page or contact our team.",
  };
  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        onReady={() => setReady(true)}
        onError={() => {
          onToken("");
          setStatus("unavailable");
        }}
      />
      <div ref={element} />
      <p role={status === "unavailable" ? "alert" : "status"} className="text-sm text-muted">
        {messages[status]}
      </p>
      {status === "unavailable" && (
        <button type="button" className="button secondary" onClick={() => window.location.reload()}>
          Reload security check
        </button>
      )}
    </>
  );
}
