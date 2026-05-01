/**
 * Match `supabaseClient.ts` order so the storage key / cookie namespace is the
 * same in the browser, proxy, and Route Handlers (avoids "still logged in"
 * after logout when public vs server URL differ).
 */
export function getSupabaseUrl(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL ??
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
