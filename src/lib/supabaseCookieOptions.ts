import type { CookieOptions } from "@supabase/ssr";

/**
 * Session cookies (JWT + refresh) are scoped for the whole site and the full
 * browser session. Used by middleware, Route Handlers, and RSC Supabase client.
 */
export function getSupabaseCookieOptions(): CookieOptions {
  return {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    // Let Supabase set maxAge per chunk; httpOnly comes from library defaults.
  };
}
