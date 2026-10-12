import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { localRedirect } from "@/lib/local-redirect";
import { publicSupabaseConfig } from "@/lib/supabase/config";
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const publicConfig = publicSupabaseConfig(url, key);
  if (!publicConfig) return response;
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
    const redirect = localRedirect("/login");
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
  ],
};
