// Client component for interactive filtering and pagination.
"use client";

import { useEffect, useRef, useState } from "react";

type HumorFlavor = {
  id: number;
  slug: string | null;
  description: string | null;
};

type CaptionRow = {
  id: string;
  content: string | null;
  humor_flavor_id: number | null;
  created_datetime_utc?: string;
  upvote_count?: number;
  downvote_count?: number;
  my_vote?: number;
  images: {
    url: string | null;
    image_description: string | null;
  } | null;
};

const PAGE_SIZE_INITIAL = 20;
const PAGE_SIZE_MORE = 50;

export default function CaptionBrowser() {
  const [flavors, setFlavors] = useState<HumorFlavor[]>([]);
  const [selectedFlavorId, setSelectedFlavorId] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"upvotes" | "downvotes" | "time">(
    "upvotes"
  );
  const [captions, setCaptions] = useState<CaptionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [votingId, setVotingId] = useState<string | null>(null);
  const votingRef = useRef<Set<string>>(new Set());
  const lastFetchKeyRef = useRef<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pipelineStatus, setPipelineStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [generatedCaptions, setGeneratedCaptions] = useState<
    Array<Record<string, unknown>>
  >([]);

  const allowedTypes = new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/heic",
  ]);

  useEffect(() => {
    const loadFlavors = async () => {
      setError(null);
      setVoteError(null);
      const response = await fetch("/api/humor-flavors");
      if (!response.ok) {
        setError("Unable to load humor flavors.");
        return;
      }
      const payload = (await response.json()) as {
        data: HumorFlavor[];
      };
      setFlavors(payload.data ?? []);
    };

    void loadFlavors();
  }, []);

  useEffect(() => {
    const loadInitial = async () => {
      const fetchKey = `${selectedFlavorId}-0-${PAGE_SIZE_INITIAL}`;
      if (lastFetchKeyRef.current === fetchKey) {
        return;
      }
      lastFetchKeyRef.current = fetchKey;

      setLoading(true);
      setError(null);
      setVoteError(null);
      setOffset(0);
      setHasMore(true);

      const response = await fetch(
        `/api/captions?flavorId=${selectedFlavorId}&offset=0&limit=${PAGE_SIZE_INITIAL}`
      );
      if (!response.ok) {
        setError("Unable to load captions.");
        setCaptions([]);
        setLoading(false);
        return;
      }
      const payload = (await response.json()) as {
        data: CaptionRow[];
      };
      const initialData = payload.data ?? [];
      setCaptions(initialData);
      setOffset(initialData.length);
      setHasMore(initialData.length === PAGE_SIZE_INITIAL);

      setLoading(false);
    };

    void loadInitial();
  }, [selectedFlavorId]);

  const loadMore = async () => {
    if (loading || !hasMore) {
      return;
    }

    setLoading(true);
    setError(null);
    setVoteError(null);

    const nextOffset = offset;
    const response = await fetch(
      `/api/captions?flavorId=${selectedFlavorId}&offset=${nextOffset}&limit=${PAGE_SIZE_MORE}`
    );
    if (!response.ok) {
      setError("Unable to load more captions.");
      setLoading(false);
      return;
    }
    const payload = (await response.json()) as {
      data: CaptionRow[];
    };
    const moreData = payload.data ?? [];
    setCaptions((prev) => [...prev, ...moreData]);
    setOffset(nextOffset + moreData.length);
    setHasMore(moreData.length === PAGE_SIZE_MORE);

    setLoading(false);
  };

  const submitVote = async (captionId: string, voteValue: number) => {
    if (votingRef.current.has(captionId)) {
      return;
    }

    setVoteError(null);
    votingRef.current.add(captionId);
    setVotingId(captionId);

    const response = await fetch("/api/caption-vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ captionId, voteValue }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setVoteError(payload.error ?? "Unable to submit vote.");
      votingRef.current.delete(captionId);
      setVotingId(null);
      return;
    }

    const payload = (await response.json()) as {
      upvoteDelta?: number;
      downvoteDelta?: number;
      unchanged?: boolean;
      myVote?: number;
    };
    if (
      typeof payload.upvoteDelta === "number" &&
      typeof payload.downvoteDelta === "number"
    ) {
      const upvoteDelta = payload.upvoteDelta;
      const downvoteDelta = payload.downvoteDelta;
      setCaptions((prev) => {
        const updated = prev.map((caption) => {
          if (caption.id !== captionId) {
            return caption;
          }
          const nextUpvotes =
            (caption.upvote_count ?? 0) + upvoteDelta;
          const nextDownvotes =
            (caption.downvote_count ?? 0) + downvoteDelta;
          return {
            ...caption,
            upvote_count: Math.max(0, nextUpvotes),
            downvote_count: Math.max(0, nextDownvotes),
            my_vote: payload.myVote ?? caption.my_vote ?? 0,
          };
        });
        return updated.sort((a, b) => {
          if (sortBy === "time") {
            const aTime = a.created_datetime_utc ?? "";
            const bTime = b.created_datetime_utc ?? "";
            if (bTime !== aTime) {
              return bTime.localeCompare(aTime);
            }
            return 0;
          }
          if (sortBy === "downvotes") {
            return (b.downvote_count ?? 0) - (a.downvote_count ?? 0);
          }
          return (b.upvote_count ?? 0) - (a.upvote_count ?? 0);
        });
      });
    }

    votingRef.current.delete(captionId);
    setVotingId(null);
  };

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

      setGeneratedCaptions(captionsPayload ?? []);
      setPipelineStatus("success");
    } catch (error) {
      setPipelineStatus("error");
      setPipelineError(
        error instanceof Error ? error.message : "Pipeline failed."
      );
    }
  };

  const displayedCaptions = captions
    .map((caption, index) => ({ caption, index }))
    .sort((a, b) => {
      if (sortBy === "time") {
        const aTime = a.caption.created_datetime_utc ?? "";
        const bTime = b.caption.created_datetime_utc ?? "";
        if (bTime !== aTime) {
          return bTime.localeCompare(aTime);
        }
        return a.index - b.index;
      }
      const aCount =
        sortBy === "downvotes"
          ? a.caption.downvote_count ?? 0
          : a.caption.upvote_count ?? 0;
      const bCount =
        sortBy === "downvotes"
          ? b.caption.downvote_count ?? 0
          : b.caption.upvote_count ?? 0;
      if (bCount !== aCount) {
        return bCount - aCount;
      }
      return a.index - b.index;
    })
    .map(({ caption }) => caption);

  return (
    <section
      style={{
        marginTop: "16px",
        color: "#f9fafb",
        background: "linear-gradient(160deg, #0b0b0f, #111827)",
        borderRadius: "24px",
        padding: "24px",
        border: "1px solid #1f2937",
      }}
    >
      <section
        style={{
          display: "grid",
          gap: "12px",
          padding: "16px",
          borderRadius: "16px",
          border: "1px solid #1f2937",
          background: "#0f172a",
          marginBottom: "20px",
        }}
      >
        <h2 style={{ margin: 0 }}>Upload an image</h2>
        <p style={{ margin: 0, color: "#cbd5f5" }}>
          Generate fresh captions by uploading a new image.
        </p>
        <input
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/heic"
          onChange={(event) => {
            setSelectedFile(event.target.files?.[0] ?? null);
          }}
        />
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
          <div style={{ display: "grid", gap: "8px" }}>
            <strong>Generated captions</strong>
            {generatedCaptions.map((caption, index) => (
              <div
                key={`generated-${index}`}
                style={{
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1px solid #1f2937",
                  background: "#111827",
                }}
              >
                {String(
                  caption.content ??
                    caption.caption ??
                    caption.text ??
                    "Caption generated."
                )}
              </div>
            ))}
          </div>
        ) : null}
      </section>
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        <label>
          Humor flavor:
          <select
            style={{
              marginLeft: "8px",
              background: "#0b0b0f",
              color: "#f9fafb",
              border: "1px solid #1f2937",
              borderRadius: "8px",
              padding: "4px 8px",
            }}
            value={selectedFlavorId}
            onChange={(event) => {
              setSelectedFlavorId(event.target.value);
            }}
          >
            <option value="all">Default (all flavors)</option>
            {flavors.map((flavor) => (
              <option key={flavor.id} value={String(flavor.id)}>
                {flavor.slug ?? `Flavor ${flavor.id}`}
              </option>
            ))}
          </select>
        </label>
        <label>
          Filter by:
          <select
            style={{
              marginLeft: "8px",
              background: "#0b0b0f",
              color: "#f9fafb",
              border: "1px solid #1f2937",
              borderRadius: "8px",
              padding: "4px 8px",
            }}
            value={sortBy}
            onChange={(event) =>
              setSortBy(
                event.target.value as "upvotes" | "downvotes" | "time"
              )
            }
          >
            <option value="upvotes">Upvotes</option>
            <option value="downvotes">Downvotes</option>
            <option value="time">Most recent</option>
          </select>
        </label>
      </div>

      {error ? <p style={{ marginTop: "12px" }}>{error}</p> : null}
      {voteError ? <p style={{ marginTop: "12px" }}>{voteError}</p> : null}

      <section style={{ marginTop: "24px" }}>
        <h2>Captions</h2>
        <div
          style={{
            display: "grid",
            gap: "16px",
            marginTop: "12px",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          }}
        >
          {displayedCaptions.map((caption, index) => (
            <article
              key={`${caption.id}-${index}`}
              style={{
                border: "1px solid #1f2937",
                borderRadius: "14px",
                padding: "16px",
                display: "grid",
                gap: "12px",
                maxWidth: "420px",
                width: "100%",
                background: "#0f172a",
                boxShadow: "0 10px 24px rgba(0, 0, 0, 0.35)",
              }}
            >
              {caption.images?.url ? (
                <img
                  src={caption.images.url}
                  alt={caption.images.image_description ?? "Caption image"}
                  style={{
                    width: "100%",
                    height: "240px",
                    objectFit: "cover",
                    background: "#0b0b0f",
                    borderRadius: "10px",
                  }}
                />
              ) : null}
              <p style={{ margin: 0 }}>{caption.content ?? "Untitled caption"}</p>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                {(() => {
                  const upvotes = caption.upvote_count ?? 0;
                  const downvotes = caption.downvote_count ?? 0;
                  const totalVotes = upvotes + downvotes;
                  return totalVotes > 0 ? (
                    <span>
                      Votes: {totalVotes} (▲ {upvotes} / ▼ {downvotes})
                    </span>
                  ) : (
                    <span>No votes yet</span>
                  );
                })()}
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    className="vote-button"
                    onClick={() => submitVote(caption.id, 1)}
                    disabled={votingId === caption.id || caption.my_vote === 1}
                    aria-label="Upvote"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    className="vote-button"
                    onClick={() => submitVote(caption.id, -1)}
                    disabled={votingId === caption.id || caption.my_vote === -1}
                    aria-label="Downvote"
                  >
                    ▼
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <button
        type="button"
        onClick={loadMore}
        disabled={!hasMore || loading}
        style={{ marginTop: "16px", padding: "8px 16px" }}
      >
        {loading ? "Loading..." : hasMore ? "Show more" : "No more results"}
      </button>
    </section>
  );
}
