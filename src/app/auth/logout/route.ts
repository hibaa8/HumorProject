import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseCookieOptions } from "@/lib/supabaseCookieOptions";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabaseEnv";

/**
 * Server-side logout: revokes the session and clears Supabase auth cookies on
 * the **same** `NextResponse` we return. If `signOut()` only mutates
 * `cookies()` via `cookieStore.set()` and we returned a fresh redirect without
 * forwarding those writes, cleared cookies would never reach the browser — leaving
 * the user "logged in" for the proxy and RSC.
 */
export async function GET(request: Request) {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  const origin = new URL(request.url).origin;

  if (!url || !anonKey) {
    return NextResponse.redirect(`${origin}/`);
  }

  const cookieStore = await cookies();
  const res = NextResponse.redirect(`${origin}/`);

  const supabase = createServerClient(url, anonKey, {
    cookieOptions: getSupabaseCookieOptions(),
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options);
        });
      },
    },
  });

  await supabase.auth.signOut({ scope: "global" });

  const base = getSupabaseCookieOptions();
  const clearOpts = { ...base, maxAge: 0 };

  const names = new Set(
    cookieStore
      .getAll()
      .filter((c) => c.name.startsWith("sb-"))
      .map((c) => c.name)
  );
  for (const name of names) {
    res.cookies.set(name, "", clearOpts);
  }

  return res;
}
