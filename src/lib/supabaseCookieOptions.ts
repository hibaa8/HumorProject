import type { CookieOptions } from "@supabase/ssr";

/**
 * Session cookies (JWT + refresh). Used by middleware, Route Handlers, RSC,
 * and the browser client.
 *
 * Do not set `domain` unless you need cross-subdomain cookies — a wrong domain
 * breaks auth on Vercel (cookies never attach to the deployment host).
 */
export function getSupabaseCookieOptions(): CookieOptions {
  return {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  };
}
