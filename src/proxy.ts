import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { loginRedirectUrl } from "@/lib/site-origin";
import { publicSupabaseConfig } from "@/lib/supabase/config";
function loginRedirect(request: NextRequest) {
  // Next.js proxy requires absolute locations. Explicit public origins handle
  // reverse proxies; loopback development stays on the actual request origin.
  const target = loginRedirectUrl(request.nextUrl.origin, process.env);
  const response = NextResponse.redirect(target, 303);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const publicConfig = publicSupabaseConfig(url, key);
  if (!publicConfig) {
    response.headers.set("Cache-Control", "private, no-store");
    if (
      request.nextUrl.pathname === "/admin" ||
      request.nextUrl.pathname.startsWith("/admin/") ||
      request.nextUrl.pathname === "/driver-account"
    )
      return loginRedirect(request);
    return response;
  }
  const supabase = createServerClient(publicConfig.url, publicConfig.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (items) => {
        items.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (
    (request.nextUrl.pathname.startsWith("/admin") ||
      request.nextUrl.pathname === "/driver-account") &&
    !user
  ) {
    const redirect = loginRedirect(request);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = {
  matcher: [
    "/admin/:path*",
    "/login",
    "/reset-password",
    "/update-password",
    "/access-pending",
    "/driver-account",
    "/auth/:path*",
    "/track/:path*",
  ],
};
