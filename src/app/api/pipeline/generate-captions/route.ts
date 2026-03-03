import { NextResponse } from "next/server";
import { almostCrackdFetch } from "@/lib/almostCrackdClient";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST(request: Request) {
  const { imageId } = (await request.json()) as { imageId?: string };

  if (!imageId) {
    return NextResponse.json({ error: "Missing imageId." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return NextResponse.json({ error: "Missing access token." }, { status: 401 });
  }

  const response = await almostCrackdFetch(
    "/pipeline/generate-captions",
    {
      method: "POST",
      body: JSON.stringify({ imageId }),
    },
    session.access_token
  );

  const payload = await response.json();
  return NextResponse.json(payload, { status: response.status });
}
