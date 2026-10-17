import "server-only";
import { configuredSiteOrigin } from "./site-origin";
export function sameOrigin(request: Request) {
  const expected = configuredSiteOrigin(process.env);
  return !!expected && request.headers.get("origin") === expected;
}
export async function verifyChallenge(token: string | undefined, action: string) {
  if (!process.env.TURNSTILE_SECRET_KEY || !token) return false;
  try {
    const origin = configuredSiteOrigin(process.env);
    if (!origin) return false;
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: process.env.TURNSTILE_SECRET_KEY, response: token }),
      signal: AbortSignal.timeout(10000),
    });
    const result = await response.json();
    return (
      response.ok &&
      result.success === true &&
      result.action === action &&
      result.hostname === new URL(origin).hostname
    );
  } catch {
    return false;
  }
}
