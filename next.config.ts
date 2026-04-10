import type { NextConfig } from "next";

/** Mirror `.env` `SUPABASE_*` into `NEXT_PUBLIC_*` for any browser Supabase client. */
const supabaseUrl =
  process.env.SUPABASE_URL ||
  (process.env.SUPABASE_PROJECT_ID
    ? `https://${process.env.SUPABASE_PROJECT_ID}.supabase.co`
    : "");

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ?? "",
  },
};

export default nextConfig;
