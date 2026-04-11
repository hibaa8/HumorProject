import { NextResponse } from "next/server";
import { getSafeInternalPath } from "@/lib/authRedirect";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextPath = getSafeInternalPath(searchParams.get("next"), "/");

  console.log("[auth/callback] origin:", origin, "has code:", !!code);

  if (!code) {
    console.log("[auth/callback] missing code — redirecting to login");
    return NextResponse.redirect(
      `${origin}/login?error=missing_code&next=${encodeURIComponent(nextPath)}`
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession error:", error.message, error.status);
    return NextResponse.redirect(
      `${origin}/login?error=oauth_exchange_failed&next=${encodeURIComponent(nextPath)}`
    );
  }

  const { data: { session } } = await supabase.auth.getSession();
  console.log("[auth/callback] session established:", !!session, "user:", session?.user?.email);

  return NextResponse.redirect(`${origin}${nextPath}`);
}
