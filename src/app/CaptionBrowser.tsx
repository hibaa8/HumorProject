// Client component for interactive filtering and pagination.
"use client";

import { useEffect, useState } from "react";

type HumorFlavor = {
  id: number;
  slug: string | null;
  description: string | null;
};

type CaptionRow = {
  id: string;
  content: string | null;
  humor_flavor_id: number | null;
  images: {
    url: string | null;
    image_description: string | null;
  } | null;
};

const PAGE_SIZE = 10;

export default function CaptionBrowser() {
  const [flavors, setFlavors] = useState<HumorFlavor[]>([]);
  const [selectedFlavorId, setSelectedFlavorId] = useState<number | null>(null);
  const [captions, setCaptions] = useState<CaptionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const loadFlavors = async () => {
      setError(null);
      const response = await fetch("/api/humor-flavors");
      if (!response.ok) {
        setError("Unable to load humor flavors.");
        return;
      }
      const payload = (await response.json()) as {
        data: HumorFlavor[];
      };
      setFlavors(payload.data ?? []);
      setSelectedFlavorId(payload.data?.[0]?.id ?? null);
    };

    void loadFlavors();
  }, []);

  useEffect(() => {
    if (selectedFlavorId === null) {
      return;
    }

    const loadInitial = async () => {
      setLoading(true);
      setError(null);
      setOffset(0);
      setHasMore(true);

      const response = await fetch(
        `/api/captions?flavorId=${selectedFlavorId}&offset=0&limit=${PAGE_SIZE}`
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
      setCaptions(payload.data ?? []);
      setHasMore((payload.data?.length ?? 0) === PAGE_SIZE);

      setLoading(false);
    };

    void loadInitial();
  }, [selectedFlavorId]);

  const loadMore = async () => {
    if (loading || selectedFlavorId === null || !hasMore) {
      return;
    }

    setLoading(true);
    setError(null);

    const nextOffset = offset + PAGE_SIZE;
    const response = await fetch(
      `/api/captions?flavorId=${selectedFlavorId}&offset=${nextOffset}&limit=${PAGE_SIZE}`
    );
    if (!response.ok) {
      setError("Unable to load more captions.");
      setLoading(false);
      return;
    }
    const payload = (await response.json()) as {
      data: CaptionRow[];
    };
    setCaptions((prev) => [...prev, ...(payload.data ?? [])]);
    setOffset(nextOffset);
    setHasMore((payload.data?.length ?? 0) === PAGE_SIZE);

    setLoading(false);
  };

  return (
    <section style={{ marginTop: "16px" }}>
      <label>
        Humor flavor:
        <select
          style={{ marginLeft: "8px" }}
          value={selectedFlavorId ?? ""}
          onChange={(event) => {
            const value = Number(event.target.value);
            setSelectedFlavorId(Number.isNaN(value) ? null : value);
          }}
        >
          {flavors.map((flavor) => (
            <option key={flavor.id} value={flavor.id}>
              {flavor.slug ?? `Flavor ${flavor.id}`}
            </option>
          ))}
        </select>
      </label>

      {error ? <p style={{ marginTop: "12px" }}>{error}</p> : null}

      <div
        style={{
          display: "grid",
          gap: "16px",
          marginTop: "16px",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        }}
      >
        {captions.map((caption) => (
          <article
            key={caption.id}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              padding: "16px",
              display: "grid",
              gap: "12px",
              maxWidth: "360px",
              width: "100%",
            }}
          >
            {caption.images?.url ? (
              <img
                src={caption.images.url}
                alt={caption.images.image_description ?? "Caption image"}
                style={{
                  width: "100%",
                  height: "220px",
                  objectFit: "contain",
                  background: "#f9fafb",
                }}
              />
            ) : (
              <div
                style={{
                  background: "#f3f4f6",
                  height: "220px",
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
          </article>
        ))}
      </div>

      <button
        type="button"
        onClick={loadMore}
        disabled={!hasMore || loading || selectedFlavorId === null}
        style={{ marginTop: "16px", padding: "8px 16px" }}
      >
        {loading ? "Loading..." : hasMore ? "Load more" : "No more results"}
      </button>
    </section>
  );
}
