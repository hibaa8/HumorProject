import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseCookieOptions } from "@/lib/supabaseCookieOptions";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabaseEnv";

/*
 * Next.js 16 renamed `middleware.ts` to `proxy.ts`. Function must be named
 * `proxy` (not `middleware`). Default runtime is Node.js (no longer Edge).
 * https://nextjs.org/docs/app/building-your-application/routing/proxy
 */
export async function proxy(request: NextRequest) {
  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: getSupabaseCookieOptions(),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        /*
         * Supabase SSR: after refresh, update the request cookie jar so getAll()
         * sees new values in this same turn, then clone the outgoing response so
         * Set-Cookie reaches the browser.
         */
        try {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
        } catch {
          /* Rare runtime restriction on mutating request cookies */
        }

        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });

        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        } catch {
          /* Cookie size / runtime limits */
        }
      },
    },
  });

  /*
   * Use getSession(), not getUser(). getUser() revalidates the JWT with a
   * server round-trip and can return null intermittently on Vercel, causing
   * spurious redirects for logged-in users. Session is read from cookies and
   * refreshed via setAll when needed.
   */
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  /*
   * Stale refresh tokens (e.g. after rotating Supabase keys, manual cookie
   * edits, or long inactivity) make Supabase return a 400. Clear sb-* cookies
   * and send the user home for a clean re-login instead of bubbling the error.
   */
  if (sessionError?.code === "refresh_token_not_found" || sessionError?.status === 400) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.search = "";
    const redirectResponse = NextResponse.redirect(homeUrl);
    request.cookies.getAll().forEach((cookie) => {
      if (cookie.name.startsWith("sb-")) {
        redirectResponse.cookies.delete(cookie.name);
      }
    });
    return redirectResponse;
  }

  const user = session?.user ?? null;
  const pathname = request.nextUrl.pathname;
  const isPublicRoute =
    pathname === "/" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico";

  if (!user && !isPublicRoute) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const signinUrl = request.nextUrl.clone();
    signinUrl.pathname = "/auth/signin";
    signinUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(signinUrl);
  }

  response.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, max-age=0, must-revalidate"
  );

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
