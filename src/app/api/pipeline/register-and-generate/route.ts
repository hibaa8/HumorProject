import { NextResponse } from "next/server";
import { almostCrackdFetch } from "@/lib/almostCrackdClient";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

function pickImageId(body: Record<string, unknown>): string | undefined {
  const asString = (v: unknown): string | undefined => {
    if (typeof v === "string" && v.length > 0) return v;
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
    return undefined;
  };

  const direct = asString(body.imageId ?? body.image_id);
  if (direct) return direct;

  const data = body.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const nested = asString(
      (data as Record<string, unknown>).imageId ??
        (data as Record<string, unknown>).image_id
    );
    if (nested) return nested;
  }

  return undefined;
}

/**
 * One hop from the browser after storage upload: register the image URL with the
 * pipeline, then generate captions. Saves a client↔Next round-trip vs two separate calls.
 */
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

  const token = session.access_token;

  const registerRes = await almostCrackdFetch(
    "/pipeline/upload-image-from-url",
    {
      method: "POST",
      body: JSON.stringify({
        imageUrl,
        isCommonUse: Boolean(isCommonUse),
      }),
    },
    token
  );

  const registerJson = (await registerRes.json()) as Record<string, unknown>;
  if (!registerRes.ok) {
    return NextResponse.json(registerJson, { status: registerRes.status });
  }

  const imageId = pickImageId(registerJson);
  if (!imageId) {
    return NextResponse.json(
      {
        error: "Pipeline register succeeded but returned no imageId.",
        registerResponse: registerJson,
      },
      { status: 502 }
    );
  }

  const generateRes = await almostCrackdFetch(
    "/pipeline/generate-captions",
    {
      method: "POST",
      body: JSON.stringify({ imageId }),
    },
    token
  );

  const generatePayload = await generateRes.json();
  return NextResponse.json(generatePayload, { status: generateRes.status });
}
