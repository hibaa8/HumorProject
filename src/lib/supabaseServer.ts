import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseProjectId = process.env.SUPABASE_PROJECT_ID;
const supabaseUrl =
  process.env.SUPABASE_URL ||
  (supabaseProjectId ? `https://${supabaseProjectId}.supabase.co` : undefined);

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing SUPABASE_URL (or SUPABASE_PROJECT_ID) or SUPABASE_ANON_KEY."
  );
}

export const createSupabaseServerClient = async () => {
  const cookieStore = await cookies();
  const cookieStoreAny = cookieStore as {
    getAll?: () => { name: string; value: string }[];
    set?: (name: string, value: string, options?: unknown) => void;
  };

  return createServerClient(supabaseUrl, supabaseAnonKey, {
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
