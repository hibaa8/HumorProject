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

  return (
    <main
      style={{
        fontFamily: "system-ui, sans-serif",
        padding: "48px 24px",
        background: "radial-gradient(circle at top, #0f172a, #0b0b0f 55%)",
        minHeight: "100vh",
        color: "#f8fafc",
      }}
    >
      <section
        style={{
          maxWidth: "1080px",
          margin: "0 auto",
          display: "grid",
          gap: "32px",
        }}
      >
        <header
          style={{
            display: "grid",
            gap: "20px",
            background: "linear-gradient(145deg, #0f172a, #111827)",
            padding: "32px",
            borderRadius: "24px",
            border: "1px solid #1f2937",
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.45)",
          }}
        >
          <span style={{ color: "#22c55e", fontWeight: 600 }}>
            Humor Project
          </span>
          <h1 style={{ margin: 0 }}>Captions powered by flavor-driven humor</h1>
          <p style={{ margin: 0, color: "#cbd5f5", maxWidth: "720px" }}>
            This app explores how different humor flavors shape caption styles,
            from dry academic roast to chaotic meme logic. Dive into curated
            flavors, vote on your favorites, and discover what lands.
          </p>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", paddingTop: "8px" }}>
            <a
              href="/auth/signin"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 22px",
                borderRadius: "999px",
                background: "#22c55e",
                color: "#0b0b0f",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              View captions
            </a>
          </div>
        </header>

        <section
          style={{
            background: "#0f172a",
            padding: "24px",
            borderRadius: "20px",
            border: "1px solid #1f2937",
            boxShadow: "0 18px 36px rgba(0, 0, 0, 0.4)",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Flavor highlights</h2>
          <p style={{ color: "#cbd5f5", marginTop: 0 }}>
            Expect everything from documentary-style narration to sharp
            Silicon Valley satire. Each flavor shapes the tone, punchline style,
            and pacing of the caption.
          </p>
          <div
            style={{
              display: "grid",
              gap: "12px",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            }}
          >
            {flavors.map((flavor) => (
              <div
                key={flavor.id}
                style={{
                  padding: "14px",
                  borderRadius: "12px",
                  border: "1px solid #1f2937",
                  background: "#111827",
                }}
              >
                <strong>{flavor.slug ?? `Flavor ${flavor.id}`}</strong>
                <p style={{ margin: "6px 0 0", color: "#cbd5f5" }}>
                  {flavor.description ?? "No description available."}
                </p>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
