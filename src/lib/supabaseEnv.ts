/**
 * Same resolution order as humorproject-admin `lib/supabase/env.ts` so Vercel
 * behaves the same when only NEXT_PUBLIC_* or only SUPABASE_* is set.
 */
export function getSupabaseUrl(): string | undefined {
  return (
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    (process.env.SUPABASE_PROJECT_ID
      ? `https://${process.env.SUPABASE_PROJECT_ID}.supabase.co`
      : undefined)
  );
}

export function getSupabaseAnonKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY
  );
}
