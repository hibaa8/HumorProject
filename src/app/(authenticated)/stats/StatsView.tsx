"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import { getFlavorHowItWorks } from "@/lib/flavorContext";
import type { FlavorStatsPayload } from "@/lib/humorFlavorStatsServer";

const STORAGE_KEY = "humor-flavor-stats-v1";

const tableCell: CSSProperties = { padding: "10px 12px", textAlign: "left" };

function readCache(viewerId: string): FlavorStatsPayload | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      viewerId: string;
      payload: FlavorStatsPayload;
    };
    if (parsed.viewerId !== viewerId || !parsed.payload?.leaderboard) return null;
    return parsed.payload;
  } catch {
    return null;
  }
}

function writeCache(viewerId: string, payload: FlavorStatsPayload) {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ viewerId, payload })
    );
  } catch {
    /* ignore */
  }
}

type ViewState =
  | { status: "loading" }
  | { status: "ready"; payload: FlavorStatsPayload }
  | { status: "error"; message: string };

export default function StatsView({ viewerId }: { viewerId: string }) {
  const [state, setState] = useState<ViewState>(() => {
    const cached = readCache(viewerId);
    return cached
      ? { status: "ready", payload: cached }
      : { status: "loading" };
  });

  useEffect(() => {
    if (state.status === "ready") return;

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/stats/flavor-leaderboard", {
          credentials: "same-origin",
        });
        const body = (await res.json()) as FlavorStatsPayload & { error?: string };
        if (cancelled) return;
        if (!res.ok) {
          setState({
            status: "error",
            message: body.error ?? `HTTP ${res.status}`,
          });
          return;
        }
        const payload: FlavorStatsPayload = {
          leaderboard: body.leaderboard,
          topFlavor: body.topFlavor ?? null,
          examples: body.examples,
        };
        writeCache(viewerId, payload);
        setState({ status: "ready", payload });
      } catch (e) {
        if (cancelled) return;
        setState({
          status: "error",
          message: e instanceof Error ? e.message : "Failed to load stats",
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [viewerId, state.status]);

  if (state.status === "loading") {
    return (
      <main
        style={{
          padding: "32px 24px",
          fontFamily: "system-ui, sans-serif",
          background: "linear-gradient(160deg, #0b0b0f, #111827)",
          minHeight: "100vh",
          color: "#f9fafb",
        }}
      >
        <Navbar />
        <p style={{ color: "#94a3b8" }}>Loading flavor stats…</p>
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main
        style={{
          padding: "32px 24px",
          fontFamily: "system-ui, sans-serif",
          background: "linear-gradient(160deg, #0b0b0f, #111827)",
          minHeight: "100vh",
          color: "#f9fafb",
        }}
      >
        <Navbar />
        <p>Could not load stats: {state.message}</p>
        <p style={{ color: "#94a3b8" }}>
          If this persists, vote/caption rows may be restricted by RLS for bulk
          reads.
        </p>
      </main>
    );
  }

  const { leaderboard, topFlavor, examples } = state.payload;

  return (
    <main
      style={{
        padding: "32px 24px",
        fontFamily: "system-ui, sans-serif",
        background: "linear-gradient(160deg, #0b0b0f, #111827)",
        minHeight: "100vh",
        color: "#f9fafb",
      }}
    >
      <Navbar />
      <section style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <h1 style={{ marginTop: 0 }}>Humor flavor stats</h1>
        <p style={{ color: "#94a3b8", maxWidth: "680px" }}>
          Flavors ranked by average upvotes per caption (only captions with an
          image are counted, matching the browse view). After the first load in
          this browser tab, results are reused until you refresh the page or
          close the tab.
        </p>

        {leaderboard.length === 0 ? (
          <p style={{ color: "#94a3b8", marginTop: "24px" }}>
            No data yet. Generate and vote on captions to populate this page.
          </p>
        ) : (
          <div
            style={{
              marginTop: "24px",
              overflowX: "auto",
              borderRadius: "12px",
              border: "1px solid #1f2937",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                background: "#111827",
              }}
            >
              <thead>
                <tr style={{ background: "#0f172a" }}>
                  <th style={tableCell}>#</th>
                  <th style={tableCell}>Flavor</th>
                  <th style={tableCell}>Captions</th>
                  <th style={tableCell}>Upvotes</th>
                  <th style={tableCell}>Avg upvotes / caption</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((row, i) => (
                  <tr
                    key={row.flavorId}
                    style={{ borderTop: "1px solid #1f2937" }}
                  >
                    <td style={tableCell}>{i + 1}</td>
                    <td style={tableCell}>
                      <strong>{row.slug ?? row.flavorId}</strong>
                    </td>
                    <td style={tableCell}>{row.captionCount}</td>
                    <td style={tableCell}>{row.upvotes}</td>
                    <td style={tableCell}>
                      {row.upvotesPerCaption.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {topFlavor && examples.length > 0 && (
          <section style={{ marginTop: "40px" }}>
            <h2>Top examples — {topFlavor.slug ?? topFlavor.id}</h2>
            <p style={{ color: "#94a3b8", maxWidth: "720px" }}>
              {getFlavorHowItWorks(topFlavor.slug, topFlavor.description)}
            </p>
            <div
              style={{
                display: "grid",
                gap: "16px",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                marginTop: "16px",
              }}
            >
              {examples.map((ex) => (
                <article
                  key={ex.id}
                  style={{
                    borderRadius: "12px",
                    border: "1px solid #1f2937",
                    background: "#111827",
                    overflow: "hidden",
                  }}
                >
                  {ex.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={ex.imageUrl}
                      alt=""
                      style={{
                        width: "100%",
                        height: "160px",
                        objectFit: "cover",
                      }}
                    />
                  ) : null}
                  <div style={{ padding: "12px" }}>
                    <div style={{ fontSize: "12px", color: "#22c55e" }}>
                      {ex.upvotes} upvotes
                    </div>
                    <p style={{ margin: "8px 0 0", fontSize: "14px" }}>
                      {ex.content}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <p style={{ marginTop: "32px", fontSize: "14px" }}>
          <Link href="/jokes" className="nav-inline-link">
            Back to captions
          </Link>
        </p>
      </section>
    </main>
  );
}
