import { NextResponse } from "next/server";
// Fixed relative destinations keep cookies and redirects on the current public origin,
// including when a reverse proxy supplies a different internal request hostname.
export function localRedirect(
  destination:
    | "/login"
    | "/login?notice=invalid-link"
    | "/update-password"
    | "/passenger"
    | "/passenger/login?notice=invalid-link",
) {
  return new NextResponse(null, {
    status: 303,
    headers: { Location: destination, "Cache-Control": "private, no-store" },
  });
}
