"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { DashboardCaptionItem } from "@/lib/dashboardActivity";

type SortKey = "upvotes" | "downvotes" | "time" | "oldest";

function sortItems(
  items: DashboardCaptionItem[],
  sort: SortKey
): DashboardCaptionItem[] {
  const copy = [...items];
  copy.sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    switch (sort) {
      case "upvotes":
        return b.upvotes - a.upvotes || tb - ta;
      case "downvotes":
        return b.downvotes - a.downvotes || tb - ta;
      case "time":
        return tb - ta;
      case "oldest":
        return ta - tb;
      default:
        return 0;
    }
  });
  return copy;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

const selectStyle: CSSProperties = {
  marginLeft: "8px",
  background: "#0b0b0f",
  color: "#f9fafb",
  border: "1px solid #1f2937",
  borderRadius: "8px",
  padding: "4px 8px",
};

export default function DashboardActivity({
  generated,
  voted,
}: {
  generated: DashboardCaptionItem[];
  voted: DashboardCaptionItem[];
}) {
  const [sortBy, setSortBy] = useState<SortKey>("upvotes");

  const sortedGenerated = useMemo(
    () => sortItems(generated, sortBy),
    [generated, sortBy]
  );
  const sortedVoted = useMemo(
    () => sortItems(voted, sortBy),
    [voted, sortBy]
  );

  return (
    <section style={{ maxWidth: "1400px", margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "12px",
          marginBottom: "24px",
        }}
      >
        <label style={{ color: "#e2e8f0" }}>
          Sort both sections by:
          <select
            style={selectStyle}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
          >
            <option value="upvotes">Upvotes</option>
            <option value="downvotes">Downvotes</option>
            <option value="time">Most recent</option>
            <option value="oldest">Oldest</option>
          </select>
        </label>
      </div>

      <h2 style={{ marginTop: 0 }}>Generated captions</h2>
      {sortedGenerated.length === 0 ? (
        <p style={{ color: "#94a3b8" }}>
          None yet.{" "}
          <Link href="/generate" className="nav-inline-link">
            Generate captions
          </Link>
        </p>
      ) : (
        <div className="dashboard-caption-grid" style={{ marginBottom: "40px" }}>
          {sortedGenerated.map((c) => (
            <article
              key={c.id}
              style={{
                border: "1px solid #1f2937",
                borderRadius: "14px",
                padding: "12px",
                display: "grid",
                gap: "10px",
                background: "#0f172a",
                boxShadow: "0 10px 24px rgba(0, 0, 0, 0.35)",
                minWidth: 0,
              }}
            >
              {c.imageUrl ? (
                <div className="caption-card-image-frame dashboard-dash-image">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.imageUrl} alt="" />
                </div>
              ) : null}
              <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.45 }}>
                {c.content ?? "—"}
              </p>
              <div
                style={{
                  fontSize: "12px",
                  color: "#94a3b8",
                  display: "grid",
                  gap: "4px",
                }}
              >
                <span>{c.slug ?? "flavor"}</span>
                <span>
                  ▲ {c.upvotes} · ▼ {c.downvotes}
                </span>
                <span>{formatDate(c.createdAt)}</span>
              </div>
            </article>
          ))}
        </div>
      )}

      <h2>Votes</h2>
      {sortedVoted.length === 0 ? (
        <p style={{ color: "#94a3b8" }}>
          No votes yet.{" "}
          <Link href="/jokes" className="nav-inline-link">
            Browse captions
          </Link>
        </p>
      ) : (
        <div className="dashboard-caption-grid">
          {sortedVoted.map((c) => (
            <article
              key={c.id}
              style={{
                border: "1px solid #1f2937",
                borderRadius: "14px",
                padding: "12px",
                display: "grid",
                gap: "10px",
                background: "#0f172a",
                boxShadow: "0 10px 24px rgba(0, 0, 0, 0.35)",
                minWidth: 0,
              }}
            >
              {c.imageUrl ? (
                <div className="caption-card-image-frame dashboard-dash-image">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.imageUrl} alt="" />
                </div>
              ) : null}
              <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.45 }}>
                {c.content ?? (
                  <span style={{ color: "#64748b" }}>Caption unavailable</span>
                )}
              </p>
              <div
                style={{
                  fontSize: "12px",
                  color: "#94a3b8",
                  display: "grid",
                  gap: "4px",
                }}
              >
                <span>
                  {c.slug ?? "flavor"}
                  {c.myVote === 1 ? (
                    <span style={{ color: "#22c55e", marginLeft: "6px" }}>
                      · You ▲
                    </span>
                  ) : c.myVote === -1 ? (
                    <span style={{ color: "#f87171", marginLeft: "6px" }}>
                      · You ▼
                    </span>
                  ) : null}
                </span>
                <span>
                  ▲ {c.upvotes} · ▼ {c.downvotes}
                </span>
                <span>{formatDate(c.createdAt)}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
