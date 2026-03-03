import { NextResponse } from "next/server";
import { almostCrackdFetch } from "@/lib/almostCrackdClient";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST(request: Request) {
  const { imageUrl, isCommonUse } = (await request.json()) as {
    imageUrl?: string;
    isCommonUse?: boolean;
  };

  if (!imageUrl) {
    return NextResponse.json({ error: "Missing imageUrl." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return NextResponse.json({ error: "Missing access token." }, { status: 401 });
  }

  const response = await almostCrackdFetch(
    "/pipeline/upload-image-from-url",
    {
      method: "POST",
      body: JSON.stringify({ imageUrl, isCommonUse: Boolean(isCommonUse) }),
    },
    session.access_token
  );

  const payload = await response.json();
  return NextResponse.json(payload, { status: response.status });
}
