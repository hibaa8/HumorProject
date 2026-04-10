import { NextResponse } from "next/server";
import { getSafeInternalPath } from "@/lib/authRedirect";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextPath = getSafeInternalPath(searchParams.get("next"), "/jokes");

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=missing_code&next=${encodeURIComponent(nextPath)}`
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=oauth_exchange_failed&next=${encodeURIComponent(nextPath)}`
    );
  }

  await supabase.auth.getSession();

  return NextResponse.redirect(`${origin}${nextPath}`);
}
