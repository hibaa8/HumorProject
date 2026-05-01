import { NextResponse } from "next/server";
import {
  almostCrackdFetch,
  isPipelineImageContentType,
  normalizePipelineContentType,
  extractPresignUploadResponse,
} from "@/lib/almostCrackdClient";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST(request: Request) {
  const { contentType } = (await request.json()) as { contentType?: string };

  if (!contentType) {
    return NextResponse.json(
      { error: "Missing contentType." },
      { status: 400 }
    );
  }

  const normalized = normalizePipelineContentType(contentType);
  if (!isPipelineImageContentType(contentType)) {
    return NextResponse.json(
      { error: "Unsupported contentType for pipeline upload." },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return NextResponse.json({ error: "Missing access token." }, { status: 401 });
  }

  const response = await almostCrackdFetch(
    "/pipeline/generate-presigned-url",
    {
      method: "POST",
      body: JSON.stringify({ contentType: normalized }),
    },
    session.access_token
  );

  const payload = await response.json();
  if (!response.ok) {
    return NextResponse.json(payload, { status: response.status });
  }

  const extracted = extractPresignUploadResponse(payload);
  if (!extracted) {
    return NextResponse.json(
      {
        error:
          "Presign response missing presignedUrl or public image URL (cdnUrl).",
        raw: payload,
      },
      { status: 502 }
    );
  }

  return NextResponse.json(extracted, { status: 200 });
}
