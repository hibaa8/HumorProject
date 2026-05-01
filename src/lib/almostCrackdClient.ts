const API_BASE_URL = "https://api.almostcrackd.ai";

/** MIME types accepted by the AlmostCrackd presigned-upload + pipeline (Step 1). */
export const PIPELINE_IMAGE_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
]);

/** Match Step 1 body: `image/jpg` is normalized to `image/jpeg` for the API. */
export function normalizePipelineContentType(contentType: string): string {
  const t = contentType.trim().toLowerCase();
  return t === "image/jpg" ? "image/jpeg" : t;
}

export function isPipelineImageContentType(contentType: string): boolean {
  return PIPELINE_IMAGE_CONTENT_TYPES.has(
    normalizePipelineContentType(contentType)
  );
}

function nonEmptyString(v: unknown): string | undefined {
  if (typeof v === "string" && v.trim().length > 0) return v.trim();
  return undefined;
}

/**
 * Parse Step 1 (generate-presigned-url) response — API may use camelCase or
 * snake_case. Both URLs are required for Step 2 (PUT) and Step 3 (register).
 */
export function extractPresignUploadResponse(
  payload: unknown
): { presignedUrl: string; cdnUrl: string } | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  const o = payload as Record<string, unknown>;
  const presignedUrl =
    nonEmptyString(o.presignedUrl) ??
    nonEmptyString(o.presigned_url) ??
    nonEmptyString(o.uploadUrl) ??
    nonEmptyString(o.upload_url);
  const cdnUrl =
    nonEmptyString(o.cdnUrl) ??
    nonEmptyString(o.cdn_url) ??
    nonEmptyString(o.publicUrl) ??
    nonEmptyString(o.public_url) ??
    nonEmptyString(o.imageUrl) ??
    nonEmptyString(o.image_url);
  if (!presignedUrl || !cdnUrl) return null;
  return { presignedUrl, cdnUrl };
}

/** Best-effort message from a failed pipeline JSON body. */
export function pipelineErrorMessageFromBody(
  body: unknown,
  fallback: string
): string {
  if (!body || typeof body !== "object") return fallback;
  const o = body as Record<string, unknown>;
  const err = o.error;
  if (typeof err === "string" && err.length > 0) return err;
  const msg = o.message;
  if (typeof msg === "string" && msg.length > 0) return msg;
  const detail = o.detail;
  if (typeof detail === "string" && detail.length > 0) return detail;
  return fallback;
}

export const almostCrackdFetch = async (
  path: string,
  options: RequestInit,
  token: string
) => {
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });
};
