import type { CSSProperties } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: voteRows } = await supabase
    .from("caption_votes")
    .select("caption_id, vote_value, created_datetime_utc")
    .eq("profile_id", user.id)
    .order("created_datetime_utc", { ascending: false })
    .limit(200);

  const voteCaptionIds = [
    ...new Set((voteRows ?? []).map((r) => r.caption_id)),
  ];

  let votedDetails: {
    id: string;
    content: string | null;
    humor_flavor_id: number | null;
    images: { url: string | null } | { url: string | null }[] | null;
  }[] = [];

  if (voteCaptionIds.length > 0) {
    const { data: caps } = await supabase
      .from("captions")
      .select("id, content, humor_flavor_id, images!inner(url)")
      .in("id", voteCaptionIds);
    votedDetails = caps ?? [];
  }

  const detailById = new Map(votedDetails.map((c) => [c.id, c]));

  const { data: myCaptions } = await supabase
    .from("captions")
    .select("id, content, humor_flavor_id, like_count, created_datetime_utc, images!inner(url)")
    .eq("profile_id", user.id)
    .order("created_datetime_utc", { ascending: false })
    .limit(100);

  const flavorIds = [
    ...new Set([
      ...(myCaptions ?? []).map((c) => c.humor_flavor_id).filter(Boolean),
      ...(votedDetails ?? []).map((c) => c.humor_flavor_id).filter(Boolean),
    ]),
  ] as number[];

  const { data: flavorRows } =
    flavorIds.length > 0
      ? await supabase.from("humor_flavors").select("id, slug").in("id", flavorIds)
      : { data: [] as { id: number; slug: string | null }[] };

  const slugByFlavorId = new Map(
    (flavorRows ?? []).map((f) => [f.id, f.slug])
  );

  const cardStyle: CSSProperties = {
    padding: "14px",
    borderRadius: "12px",
    border: "1px solid #1f2937",
    background: "#111827",
  };

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
      <section style={{ maxWidth: "960px", margin: "0 auto" }}>
        <h1 style={{ marginTop: 0 }}>Your activity</h1>
        <p style={{ color: "#94a3b8", maxWidth: "640px" }}>
          Captions you generated and jokes you voted on (from recent history).
        </p>

        <h2 style={{ marginTop: "32px" }}>Generated captions</h2>
        {(!myCaptions || myCaptions.length === 0) && (
          <p style={{ color: "#94a3b8" }}>
            None yet.{" "}
            <Link href="/generate" className="nav-inline-link">
              Generate captions
            </Link>
          </p>
        )}
        <div style={{ display: "grid", gap: "12px" }}>
          {(myCaptions ?? []).map((c) => {
            const img = Array.isArray(c.images) ? c.images[0] : c.images;
            const slug = c.humor_flavor_id
              ? slugByFlavorId.get(c.humor_flavor_id)
              : null;
            return (
              <article key={c.id} style={cardStyle}>
                <div style={{ fontSize: "12px", color: "#64748b" }}>
                  {slug ?? "flavor"} · likes {c.like_count ?? 0}
                </div>
                <p style={{ margin: "8px 0" }}>{c.content}</p>
                {img?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img.url}
                    alt=""
                    style={{
                      maxWidth: "100%",
                      maxHeight: "200px",
                      borderRadius: "8px",
                      objectFit: "contain",
                    }}
                  />
                ) : null}
              </article>
            );
          })}
        </div>

        <h2 style={{ marginTop: "40px" }}>Votes</h2>
        {(!voteRows || voteRows.length === 0) && (
          <p style={{ color: "#94a3b8" }}>
            No votes yet.{" "}
            <Link href="/jokes" className="nav-inline-link">
              Browse captions
            </Link>
          </p>
        )}
        <div style={{ display: "grid", gap: "12px" }}>
          {(voteRows ?? []).map((v) => {
            const cap = detailById.get(v.caption_id);
            const img = cap?.images
              ? Array.isArray(cap.images)
                ? cap.images[0]
                : cap.images
              : null;
            const slug = cap?.humor_flavor_id
              ? slugByFlavorId.get(cap.humor_flavor_id)
              : null;
            if (!cap) {
              return (
                <div key={`${v.caption_id}-${v.created_datetime_utc}`} style={cardStyle}>
                  <span style={{ color: "#64748b" }}>Caption unavailable</span>
                  <span
                    style={{
                      marginLeft: "12px",
                      color: v.vote_value === 1 ? "#22c55e" : "#f87171",
                    }}
                  >
                    {v.vote_value === 1 ? "▲ up" : "▼ down"}
                  </span>
                </div>
              );
            }
            return (
              <article key={`${v.caption_id}-${v.created_datetime_utc}`} style={cardStyle}>
                <div style={{ fontSize: "12px", color: "#64748b" }}>
                  {slug ?? "flavor"}{" "}
                  <span
                    style={{
                      color: v.vote_value === 1 ? "#22c55e" : "#f87171",
                    }}
                  >
                    {v.vote_value === 1 ? "▲ upvoted" : "▼ downvoted"}
                  </span>
                </div>
                <p style={{ margin: "8px 0" }}>{cap.content}</p>
                {img?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img.url}
                    alt=""
                    style={{
                      maxWidth: "100%",
                      maxHeight: "160px",
                      borderRadius: "8px",
                      objectFit: "contain",
                    }}
                  />
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
