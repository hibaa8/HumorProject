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

export const createSupabaseServerClient = async () => {
  const cookieStore = await cookies();
  const cookieStoreAny = cookieStore as {
    getAll?: () => { name: string; value: string }[];
    set?: (name: string, value: string, options?: unknown) => void;
  };

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: getSupabaseCookieOptions(),
    cookies: {
      getAll() {
        if (typeof cookieStoreAny.getAll === "function") {
          return cookieStoreAny.getAll();
        }
        return [];
      },
      setAll(cookiesToSet) {
        if (typeof cookieStoreAny.set !== "function") {
          return;
        }
        cookiesToSet.forEach(({ name, value, options }) => {
          try {
            cookieStoreAny.set?.(name, value, options);
          } catch {
            // Ignore cookie write errors in read-only contexts.
          }
        });
      },
    },
  });
};
