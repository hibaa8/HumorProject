import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function GET(request: Request) {
  const { origin } = new URL(request.url);

  const supabase = await createSupabaseServerClient();

  /*
   * No query string on redirectTo: Supabase's redirect allow list often
   * matches the URL strictly (incl. path), so adding `?next=...` can break
   * matches like `https://*.vercel.app/auth/callback`. Always land on
   * /dashboard via the callback route instead.
   */
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error || !data?.url) {
    return NextResponse.redirect(`${origin}/`);
  }

  return NextResponse.redirect(data.url);
}
