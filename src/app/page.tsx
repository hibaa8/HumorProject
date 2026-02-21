import { createSupabaseServerClient } from "@/lib/supabaseServer";

type FlavorStats = {
  id: number;
  slug: string | null;
  description: string | null;
  captionCount: number;
  upvotes: number;
  downvotes: number;
};

export default async function Home() {
  const supabase = await createSupabaseServerClient();

  const allowedSlugs = new Set([
    "nature-documentary",
    "gen-z-dark-roast",
    "social-justice-warrior",
    "corecore-man",
    "russ-hanemann",
    "gigachad",
    "erlich-bachman",
    "dwight-schrute",
    "columbia",
    "pov-pov",
  ]);

  const { data: allFlavors } = await supabase
    .from("humor_flavors")
    .select("id, slug, description")
    .order("id");

  const flavors = (allFlavors ?? []).filter((flavor) => {
    const slug = flavor.slug ?? "";
    return allowedSlugs.has(slug) || slug.startsWith("ter-re-");
  });

  const flavorIds = flavors.map((flavor) => flavor.id);

  const { data: mixRows } = await supabase
    .from("humor_flavor_mix")
    .select("humor_flavor_id, caption_count");

  const { data: captions } = await supabase
    .from("captions")
    .select("id, humor_flavor_id")
    .in("humor_flavor_id", flavorIds);

  const captionRows = captions ?? [];
  const captionToFlavor = new Map<string, number>();
  const flavorCounts = new Map<number, number>();
  captionRows.forEach((row) => {
    if (!row.humor_flavor_id) {
      return;
    }
    captionToFlavor.set(row.id, row.humor_flavor_id);
    flavorCounts.set(
      row.humor_flavor_id,
      (flavorCounts.get(row.humor_flavor_id) ?? 0) + 1
    );
  });

  const { data: voteRows } = await supabase
    .from("caption_votes")
    .select("caption_id, vote_value");

  const voteTotals = new Map<number, { up: number; down: number }>();
  (voteRows ?? []).forEach((row) => {
    const flavorId = captionToFlavor.get(row.caption_id);
    if (!flavorId) {
      return;
    }
    const current = voteTotals.get(flavorId) ?? { up: 0, down: 0 };
    if (row.vote_value === 1) {
      current.up += 1;
    } else if (row.vote_value === -1) {
      current.down += 1;
    }
    voteTotals.set(flavorId, current);
  });

  const mixTotals = new Map<number, number>();
  (mixRows ?? []).forEach((row) => {
    if (row.humor_flavor_id && flavorIds.includes(row.humor_flavor_id)) {
      mixTotals.set(row.humor_flavor_id, row.caption_count);
    }
  });

  const stats: FlavorStats[] = (flavors ?? []).map((flavor) => {
    const votes = voteTotals.get(flavor.id) ?? { up: 0, down: 0 };
    const mixCount = mixTotals.get(flavor.id) ?? 0;
    const captionCount = flavorCounts.get(flavor.id) ?? 0;
    return {
      id: flavor.id,
      slug: flavor.slug,
      description: flavor.description,
      captionCount: captionCount,
      mixCount,
      upvotes: votes.up,
      downvotes: votes.down,
    };
  });

  const mostPopular = [...stats].sort((a, b) => b.upvotes - a.upvotes)[0];
  const leastPopular = [...stats].sort((a, b) => a.upvotes - b.upvotes)[0];
  const mostCaptions = [...stats].sort(
    (a, b) => b.captionCount - a.captionCount
  )[0];
  const largestMix = [...stats].sort((a, b) => b.mixCount - a.mixCount)[0];

  return (
    <main
      style={{
        fontFamily: "system-ui, sans-serif",
        padding: "40px 24px",
        background: "linear-gradient(160deg, #0b0b0f, #111827)",
        minHeight: "100vh",
        color: "#f9fafb",
      }}
    >
      <section
        style={{
          maxWidth: "960px",
          margin: "0 auto",
          display: "grid",
          gap: "24px",
        }}
      >
        <header
          style={{
            background: "linear-gradient(140deg, #111827, #1f2937)",
            padding: "28px",
            borderRadius: "20px",
            border: "1px solid #1f2937",
            boxShadow: "0 18px 40px rgba(0, 0, 0, 0.4)",
          }}
        >
          <h1 style={{ marginBottom: "8px" }}>Humor Flavor Insights</h1>
          <p style={{ marginTop: 0, color: "#e5e7eb" }}>
            Explore how different humor flavors are performing and jump into the
            captions when you are ready.
          </p>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <a
              href="/auth/signin"
              style={{
                display: "inline-block",
                padding: "12px 20px",
                borderRadius: "999px",
                background: "#22c55e",
                color: "#0b0b0f",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              View captions
            </a>
          </div>
        </header>

        <section
          style={{
            display: "grid",
            gap: "16px",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          }}
        >
          <article
            style={{
              background: "#0f172a",
              padding: "16px",
              borderRadius: "14px",
              border: "1px solid #1f2937",
              boxShadow: "0 10px 24px rgba(0, 0, 0, 0.35)",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Most popular flavor</h3>
            <p style={{ margin: 0 }}>
              {mostPopular?.slug ?? "No data yet"}
            </p>
          </article>
          <article
            style={{
              background: "#0f172a",
              padding: "16px",
              borderRadius: "14px",
              border: "1px solid #1f2937",
              boxShadow: "0 10px 24px rgba(0, 0, 0, 0.35)",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Least popular flavor</h3>
            <p style={{ margin: 0 }}>
              {leastPopular?.slug ?? "No data yet"}
            </p>
          </article>
          <article
            style={{
              background: "#0f172a",
              padding: "16px",
              borderRadius: "14px",
              border: "1px solid #1f2937",
              boxShadow: "0 10px 24px rgba(0, 0, 0, 0.35)",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Most captions</h3>
            <p style={{ margin: 0 }}>
              {mostCaptions?.slug ?? "No data yet"}
            </p>
          </article>
          <article
            style={{
              background: "#0f172a",
              padding: "16px",
              borderRadius: "14px",
              border: "1px solid #1f2937",
              boxShadow: "0 10px 24px rgba(0, 0, 0, 0.35)",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Largest mix total</h3>
            <p style={{ margin: 0 }}>
              {largestMix?.slug ?? "No data yet"}
            </p>
          </article>
        </section>

        <section
          style={{
            background: "#0f172a",
            padding: "24px",
            borderRadius: "18px",
            border: "1px solid #1f2937",
            boxShadow: "0 16px 36px rgba(0, 0, 0, 0.4)",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Flavor leaderboard</h2>
          <div
            style={{
              display: "grid",
              gap: "12px",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            }}
          >
            {stats.map((flavor) => (
              <div
                key={flavor.id}
                style={{
                  padding: "12px",
                  border: "1px solid #1f2937",
                  borderRadius: "12px",
                  background: "#111827",
                }}
              >
                <strong>{flavor.slug ?? `Flavor ${flavor.id}`}</strong>
                <p style={{ margin: "4px 0", color: "#cbd5f5" }}>
                  {flavor.description ?? "No description"}
                </p>
                <p style={{ margin: "4px 0" }}>
                  Captions: {flavor.captionCount} · Mix: {flavor.mixCount}
                </p>
                <p style={{ margin: "4px 0" }}>
                  Upvotes: {flavor.upvotes} · Downvotes: {flavor.downvotes}
                </p>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
