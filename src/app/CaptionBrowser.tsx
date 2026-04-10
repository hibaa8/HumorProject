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

const PAGE_SIZE_INITIAL = 50;
const PAGE_SIZE_MORE = 50;

export default function CaptionBrowser() {
  const [flavors, setFlavors] = useState<HumorFlavor[]>([]);
  const [selectedFlavorId, setSelectedFlavorId] = useState<string>("all");
  const [sortBy, setSortBy] = useState<
    "upvotes" | "downvotes" | "time" | "oldest"
  >("upvotes");
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
      const fetchKey = `${selectedFlavorId}-${sortBy}-0-${PAGE_SIZE_INITIAL}`;
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
        `/api/captions?flavorId=${selectedFlavorId}&sort=${sortBy}&offset=0&limit=${PAGE_SIZE_INITIAL}`
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
  }, [selectedFlavorId, sortBy]);

  const loadMore = async () => {
    if (loading || !hasMore) {
      return;
    }

    setLoading(true);
    setError(null);
    setVoteError(null);

    const nextOffset = offset;
    const response = await fetch(
      `/api/captions?flavorId=${selectedFlavorId}&sort=${sortBy}&offset=${nextOffset}&limit=${PAGE_SIZE_MORE}`
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
        return updated;
      });
    }

    votingRef.current.delete(captionId);
    setVotingId(null);
  };

  const displayedCaptions = captions;

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
                event.target.value as
                  | "upvotes"
                  | "downvotes"
                  | "time"
                  | "oldest"
              )
            }
          >
            <option value="upvotes">Upvotes</option>
            <option value="downvotes">Downvotes</option>
            <option value="time">Most recent</option>
            <option value="oldest">Oldest</option>
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
            gap: "12px",
            marginTop: "12px",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            alignItems: "start",
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
                <div className="caption-card-image-frame">
                  <img
                    src={caption.images.url}
                    alt={
                      caption.images.image_description ?? "Caption image"
                    }
                  />
                </div>
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
        className="btn-show-more"
        onClick={loadMore}
        disabled={!hasMore || loading}
      >
        {loading ? "Loading..." : hasMore ? "Show more" : "No more results"}
      </button>
    </section>
  );
}
