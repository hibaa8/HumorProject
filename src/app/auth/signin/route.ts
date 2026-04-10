import { NextResponse } from "next/server";
import { getSafeInternalPath } from "@/lib/authRedirect";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const nextPath = getSafeInternalPath(
    searchParams.get("next"),
    "/jokes"
  );

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
    },
  });

  if (error || !data?.url) {
    return NextResponse.redirect(
      `${origin}/login?error=oauth_start_failed&next=${encodeURIComponent(nextPath)}`
    );
  }

  return NextResponse.redirect(data.url);
}
