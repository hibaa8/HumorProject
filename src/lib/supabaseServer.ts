import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseCookieOptions } from "@/lib/supabaseCookieOptions";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabaseEnv";

const supabaseUrl = getSupabaseUrl();
const supabaseAnonKey = getSupabaseAnonKey();

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase URL (SUPABASE_URL, NEXT_PUBLIC_SUPABASE_URL, or SUPABASE_PROJECT_ID) or anon key (SUPABASE_ANON_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY)."
  );
}

/**
 * Matches humorproject-admin pattern: use the request cookie store’s getAll/set
 * directly so PKCE + session cookies persist on Vercel after OAuth callback.
 */
export const createSupabaseServerClient = async () => {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: getSupabaseCookieOptions(),
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          try {
            cookieStore.set(name, value, options);
          } catch {
            // Read-only contexts (e.g. some RSC); middleware handles refresh.
          }
        });
      },
    },
  });
};
