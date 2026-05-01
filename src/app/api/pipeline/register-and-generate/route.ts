import { NextResponse } from "next/server";
import {
  almostCrackdFetch,
  pipelineErrorMessageFromBody,
} from "@/lib/almostCrackdClient";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

function pickImageId(body: Record<string, unknown>): string | undefined {
  const asString = (v: unknown): string | undefined => {
    if (typeof v === "string" && v.length > 0) return v;
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
    return undefined;
  };

  const direct = asString(body.imageId ?? body.image_id ?? body.id);
  if (direct) return direct;

  const data = body.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const nested = asString(
      (data as Record<string, unknown>).imageId ??
        (data as Record<string, unknown>).image_id ??
        (data as Record<string, unknown>).id
    );
    if (nested) return nested;
  }

  const result = body.result;
  if (result && typeof result === "object" && !Array.isArray(result)) {
    const nested = asString(
      (result as Record<string, unknown>).imageId ??
        (result as Record<string, unknown>).image_id ??
        (result as Record<string, unknown>).id
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
  const { imageUrl, isCommonUse, humorFlavorId } = (await request.json()) as {
    imageUrl?: string;
    isCommonUse?: boolean;
    humorFlavorId?: number | string;
  };

  if (!imageUrl?.trim()) {
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
        imageUrl: imageUrl.trim(),
        isCommonUse: Boolean(isCommonUse),
      }),
    },
    token
  );

  let registerJson: Record<string, unknown>;
  try {
    registerJson = (await registerRes.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      {
        error: "Pipeline register returned a non-JSON response.",
        status: registerRes.status,
      },
      { status: 502 }
    );
  }
  if (!registerRes.ok) {
    return NextResponse.json(
      {
        ...registerJson,
        error:
          pipelineErrorMessageFromBody(
            registerJson,
            `Pipeline register failed (HTTP ${registerRes.status}).`
          ),
      },
      { status: registerRes.status }
    );
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

  const generateBody: Record<string, unknown> = { imageId };
  if (humorFlavorId != null && humorFlavorId !== "") {
    const n = Number(humorFlavorId);
    if (Number.isFinite(n)) {
      generateBody.humorFlavorId = n;
    }
  }

  const generateRes = await almostCrackdFetch(
    "/pipeline/generate-captions",
    {
      method: "POST",
      body: JSON.stringify(generateBody),
    },
    token
  );

  let generatePayload: unknown;
  try {
    generatePayload = await generateRes.json();
  } catch {
    return NextResponse.json(
      {
        error: "Pipeline generate-captions returned a non-JSON response.",
        status: generateRes.status,
      },
      { status: 502 }
    );
  }

  if (!generateRes.ok) {
    const bodyObj =
      generatePayload && typeof generatePayload === "object"
        ? (generatePayload as Record<string, unknown>)
        : {};
    return NextResponse.json(
      {
        ...bodyObj,
        error: pipelineErrorMessageFromBody(
          generatePayload,
          `Generate captions failed (HTTP ${generateRes.status}).`
        ),
      },
      { status: generateRes.status }
    );
  }

  return NextResponse.json(generatePayload, { status: generateRes.status });
}
