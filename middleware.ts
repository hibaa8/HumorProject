import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseCookieOptions } from "@/lib/supabaseCookieOptions";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabaseEnv";

export async function middleware(request: NextRequest) {
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
         * Set-Cookie reaches the browser. Only setting response.cookies (old
         * pattern) can miss the refreshed session on Vercel Edge.
         */
        try {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
        } catch {
          /* Rare Edge restriction on mutating request cookies */
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
          /* Edge / cookie limits */
        }
      },
    },
  });

  /*
   * Use getSession() here, not getUser(). getUser() revalidates the JWT with a
   * server round-trip and often returns null on Vercel Edge, which incorrectly
   * triggers redirects for logged-in users. Session is read from cookies
   * (and refreshed via setAll when needed).
   */
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user ?? null;

  const pathname = request.nextUrl.pathname;
  const isPublicRoute =
    pathname === "/" ||
    pathname === "/login" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico";

  if (!user && !isPublicRoute) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
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
