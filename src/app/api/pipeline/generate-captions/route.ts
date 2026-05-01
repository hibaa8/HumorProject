import { NextResponse } from "next/server";
import { almostCrackdFetch } from "@/lib/almostCrackdClient";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST(request: Request) {
  const { imageId, humorFlavorId } = (await request.json()) as {
    imageId?: string;
    humorFlavorId?: number | string;
  };

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

  const body: Record<string, unknown> = { imageId };
  if (humorFlavorId != null && humorFlavorId !== "") {
    const n = Number(humorFlavorId);
    if (Number.isFinite(n)) {
      body.humorFlavorId = n;
    }
  }

  const response = await almostCrackdFetch(
    "/pipeline/generate-captions",
    {
      method: "POST",
      body: JSON.stringify(body),
    },
    session.access_token
  );

  const payload = await response.json();
  return NextResponse.json(payload, { status: response.status });
}
