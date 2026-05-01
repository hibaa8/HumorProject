// Client component for running the caption pipeline.
"use client";

import { useState } from "react";
import {
  isPipelineImageContentType,
  normalizePipelineContentType,
  extractPresignUploadResponse,
  pipelineErrorMessageFromBody,
} from "@/lib/almostCrackdClient";

/** Pipeline may return a bare array or { captions / data: [...] }. */
function normalizeCaptionsResponse(raw: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(raw)) {
    return raw as Array<Record<string, unknown>>;
  }
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const fromCaptions = o.captions;
    if (Array.isArray(fromCaptions)) {
      return fromCaptions as Array<Record<string, unknown>>;
    }
    const fromData = o.data;
    if (Array.isArray(fromData)) {
      return fromData as Array<Record<string, unknown>>;
    }
  }
  return [];
}

export default function GenerateCaptions() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pipelineStatus, setPipelineStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [generatedCaptions, setGeneratedCaptions] = useState<
    Array<Record<string, unknown>>
  >([]);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  const handleGenerateCaptions = async () => {
    if (!selectedFile) {
      setPipelineError("Please choose an image file.");
      return;
    }
    if (!isPipelineImageContentType(selectedFile.type)) {
      setPipelineError("Unsupported image type.");
      return;
    }

    const contentTypeForPipeline = normalizePipelineContentType(
      selectedFile.type
    );

    setPipelineStatus("uploading");
    setPipelineError(null);
    setGeneratedCaptions([]);
    setUploadedImageUrl(null);

    try {
      // 1) Presign → 2) PUT bytes to presignedUrl (same Content-Type as step 1) →
      // 3–4) register cdnUrl then generate-captions (Bearer JWT) via Next BFF.
      const presignedResponse = await fetch("/api/pipeline/presigned-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: contentTypeForPipeline }),
      });
      const presignedPayload: unknown = await presignedResponse
        .json()
        .catch(() => null);
      if (!presignedResponse.ok) {
        throw new Error(
          pipelineErrorMessageFromBody(
            presignedPayload,
            "Failed to generate upload URL."
          )
        );
      }
      const urls = extractPresignUploadResponse(presignedPayload);
      if (!urls) {
        throw new Error(
          "Upload URL response missing presignedUrl or cdnUrl. Check server logs."
        );
      }

      const uploadResponse = await fetch(urls.presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": contentTypeForPipeline },
        body: selectedFile,
      });
      if (!uploadResponse.ok) {
        throw new Error(
          `Failed to upload image to storage (HTTP ${uploadResponse.status}).`
        );
      }

      const captionsResponse = await fetch(
        "/api/pipeline/register-and-generate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: urls.cdnUrl,
            isCommonUse: false,
          }),
        }
      );
      const registerGeneratePayload: unknown = await captionsResponse
        .json()
        .catch(() => null);
      if (!captionsResponse.ok) {
        throw new Error(
          pipelineErrorMessageFromBody(
            registerGeneratePayload,
            "Failed to register image or generate captions."
          )
        );
      }

      const captionsList = normalizeCaptionsResponse(registerGeneratePayload);

      setUploadedImageUrl(urls.cdnUrl);
      setGeneratedCaptions(captionsList);
      setPipelineStatus("success");
    } catch (error) {
      setPipelineStatus("error");
      setPipelineError(
        error instanceof Error ? error.message : "Pipeline failed."
      );
    }
  };

  return (
    <section
      style={{
        display: "grid",
        gap: "14px",
        padding: "20px",
        borderRadius: "18px",
        border: "1px solid #1f2937",
        background: "#0f172a",
      }}
    >

      <p style={{ margin: 0, color: "#cbd5f5" }}>
        Upload an image to generate new captions through the pipeline.
      </p>
      <div
        style={{
          display: "flex",
          gap: "12px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 16px",
            borderRadius: "999px",
            border: "1px solid #1f2937",
            background: "#0b0b0f",
            color: "#f9fafb",
            cursor: "pointer",
          }}
        >
          Choose file
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/heic"
            onChange={(event) => {
              setSelectedFile(event.target.files?.[0] ?? null);
            }}
            style={{ display: "none" }}
          />
        </label>
        <span style={{ color: "#cbd5f5" }}>
          {selectedFile ? selectedFile.name : "No file selected"}
        </span>
      </div>
      <button
        type="button"
        className="vote-button"
        onClick={handleGenerateCaptions}
        disabled={pipelineStatus === "uploading"}
        style={{ width: "fit-content" }}
      >
        {pipelineStatus === "uploading" ? "Processing..." : "Generate captions"}
      </button>
      {pipelineError ? (
        <p style={{ color: "#fca5a5", margin: 0 }}>{pipelineError}</p>
      ) : null}
      {generatedCaptions.length > 0 ? (
        <section style={{ display: "grid", gap: "12px" }}>
          <strong>Generated captions (saved to database)</strong>
          <div
            style={{
              display: "grid",
              gap: "16px",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            }}
          >
            {generatedCaptions.map((caption, index) => (
              <article
                key={`generated-${index}`}
                style={{
                  border: "1px solid #1f2937",
                  borderRadius: "14px",
                  padding: "16px",
                  display: "grid",
                  gap: "12px",
                  background: "#0f172a",
                  boxShadow: "0 10px 24px rgba(0, 0, 0, 0.35)",
                }}
              >
                {uploadedImageUrl ? (
                  <div className="caption-card-image-frame">
                    <img src={uploadedImageUrl} alt="Uploaded" />
                  </div>
                ) : null}
                <p style={{ margin: 0 }}>
                  {String(
                    caption.content ??
                      caption.caption ??
                      caption.text ??
                      "Caption generated."
                  )}
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}
