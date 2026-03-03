// Client component for running the caption pipeline.
"use client";

import { useState } from "react";

const allowedTypes = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
]);

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
    if (!allowedTypes.has(selectedFile.type)) {
      setPipelineError("Unsupported image type.");
      return;
    }

    setPipelineStatus("uploading");
    setPipelineError(null);
    setGeneratedCaptions([]);
    setUploadedImageUrl(null);

    try {
      const presignedResponse = await fetch("/api/pipeline/presigned-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: selectedFile.type }),
      });
      if (!presignedResponse.ok) {
        throw new Error("Failed to generate upload URL.");
      }
      const presignedPayload = (await presignedResponse.json()) as {
        presignedUrl: string;
        cdnUrl: string;
      };

      const uploadResponse = await fetch(presignedPayload.presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      });
      if (!uploadResponse.ok) {
        throw new Error("Failed to upload image.");
      }

      const registerResponse = await fetch("/api/pipeline/register-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: presignedPayload.cdnUrl,
          isCommonUse: false,
        }),
      });
      if (!registerResponse.ok) {
        throw new Error("Failed to register image.");
      }
      const registerPayload = (await registerResponse.json()) as {
        imageId: string;
      };

      const captionsResponse = await fetch("/api/pipeline/generate-captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId: registerPayload.imageId }),
      });
      if (!captionsResponse.ok) {
        throw new Error("Failed to generate captions.");
      }
      const captionsPayload =
        (await captionsResponse.json()) as Array<Record<string, unknown>>;

      setUploadedImageUrl(presignedPayload.cdnUrl);
      setGeneratedCaptions(captionsPayload ?? []);
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
                  <img
                    src={uploadedImageUrl}
                    alt="Uploaded"
                    style={{
                      width: "100%",
                      height: "220px",
                      objectFit: "cover",
                      borderRadius: "10px",
                      background: "#0b0b0f",
                    }}
                  />
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
