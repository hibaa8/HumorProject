import { createClient } from "@supabase/supabase-js";

const supabaseProjectId = process.env.SUPABASE_PROJECT_ID;
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  (supabaseProjectId ? `https://${supabaseProjectId}.supabase.co` : undefined);

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase URL or anon key. Set SUPABASE_URL (or SUPABASE_PROJECT_ID) and SUPABASE_ANON_KEY in .env; next.config.ts exposes them to the browser as NEXT_PUBLIC_*."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
