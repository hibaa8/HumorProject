import { createClient } from "@supabase/supabase-js";

const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseUrl =process.env.SUPABASE_URL

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_ANON_KEY."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
