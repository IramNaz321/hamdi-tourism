"use client";
import { useRef, useEffect, useState } from "react";
import Script from "next/script";
type Turnstile = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
export function TurnstileChallenge({
  action,
  onToken,
}: {
  action: string;
  onToken: (token: string) => void;
}) {
  const element = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const api = (window as unknown as { turnstile?: Turnstile }).turnstile;
    if (!ready || !element.current || !api || !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) return;
    const id = api.render(element.current, {
      sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
      action,
      callback: onToken,
      "expired-callback": () => onToken(""),
      "error-callback": () => onToken(""),
    });
    return () => api.remove(id);
  }, [ready, action, onToken]);
  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        onReady={() => setReady(true)}
      />
      <div ref={element} />
    </>
  );
}
