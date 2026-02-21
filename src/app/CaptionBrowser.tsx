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
  const [sortBy, setSortBy] = useState<"none" | "upvotes" | "downvotes">(
    "none"
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

  const displayedCaptions =
    sortBy === "none"
      ? captions
      : [...captions].sort((a, b) => {
          if (sortBy === "downvotes") {
            return (b.downvote_count ?? 0) - (a.downvote_count ?? 0);
          }
          return (b.upvote_count ?? 0) - (a.upvote_count ?? 0);
        });

  return (
    <section style={{ marginTop: "16px" }}>
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        <label>
          Humor flavor:
          <select
            style={{ marginLeft: "8px" }}
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
            style={{ marginLeft: "8px" }}
            value={sortBy}
            onChange={(event) =>
              setSortBy(
                event.target.value as "none" | "upvotes" | "downvotes"
              )
            }
          >
            <option value="none">None</option>
            <option value="upvotes">Upvotes</option>
            <option value="downvotes">Downvotes</option>
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
          {displayedCaptions.map((caption) => (
            <article
              key={caption.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "16px",
                display: "grid",
                gap: "12px",
                maxWidth: "420px",
                width: "100%",
              }}
            >
              {caption.images?.url ? (
                <img
                  src={caption.images.url}
                  alt={caption.images.image_description ?? "Caption image"}
                  style={{
                    width: "100%",
                    height: "240px",
                    objectFit: "contain",
                    background: "#f9fafb",
                  }}
                />
              ) : (
                <div
                  style={{
                    background: "#f3f4f6",
                    height: "240px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#6b7280",
                  }}
                >
                  No image available
                </div>
              )}
              <p style={{ margin: 0 }}>{caption.content ?? "Untitled caption"}</p>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <span>Upvotes: {caption.upvote_count ?? 0}</span>
                <span>Downvotes: {caption.downvote_count ?? 0}</span>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    className="vote-button"
                    onClick={() => submitVote(caption.id, 1)}
                    disabled={votingId === caption.id || caption.my_vote === 1}
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    className="vote-button"
                    onClick={() => submitVote(caption.id, -1)}
                    disabled={votingId === caption.id || caption.my_vote === -1}
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
