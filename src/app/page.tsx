import { getFlavorHowItWorks } from "@/lib/flavorContext";
import { isFlavorIncluded } from "@/lib/humorFlavorFilters";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export default async function Home() {
  const supabase = await createSupabaseServerClient();

  const { data: allFlavors } = await supabase
    .from("humor_flavors")
    .select("id, slug, description")
    .order("id");

  const { data: captionRows } = await supabase
    .from("captions")
    .select("humor_flavor_id");

  const flavorIdsWithCaptions = new Set(
    (captionRows ?? [])
      .map((row) => row.humor_flavor_id)
      .filter((id): id is number => Boolean(id))
  );

  const flavors = (allFlavors ?? []).filter((flavor) =>
    isFlavorIncluded(flavor.slug, flavor.id, flavorIdsWithCaptions)
  );

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
            Each humor flavor runs a different caption pipeline—tone, persona, and
            punchline style change with the flavor. Sign in to browse and vote on
            captions, upload an image to generate new lines, open your dashboard
            to see what you voted on and created, and check stats to compare how
            flavors perform.
          </p>
          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              paddingTop: "8px",
            }}
          >
            <a href="/login?next=/jokes" className="home-cta-primary">
              View captions
            </a>
          </div>
        </header>

        <details
          style={{
            background: "#0f172a",
            padding: "20px 24px",
            borderRadius: "16px",
            border: "1px solid #1f2937",
          }}
        >
          <summary
            style={{
              cursor: "pointer",
              fontWeight: 600,
              color: "#e2e8f0",
            }}
          >
            Why this page matters (user research)
          </summary>
          <div
            style={{
              marginTop: "16px",
              color: "#cbd5f5",
              display: "grid",
              gap: "16px",
              fontSize: "15px",
              lineHeight: 1.55,
            }}
          >
            <div>
              <strong style={{ color: "#f8fafc" }}>What we observed</strong>
              <ul style={{ margin: "8px 0 0", paddingLeft: "1.25rem" }}>
                <li>
                  Most people jump straight to “generate captions” and skim the
                  home page—they explore quickly to understand the app.
                </li>
                <li>
                  Generate can feel slow; newcomers needed more context for what
                  the app is for.
                </li>
                <li>
                  Some controls did not read as buttons until we improved
                  affordance.
                </li>
              </ul>
            </div>
            <div>
              <strong style={{ color: "#f8fafc" }}>What we changed</strong>
              <ul style={{ margin: "8px 0 0", paddingLeft: "1.25rem" }}>
                <li>
                  Clearer per-flavor explanations below (how each pipeline tends
                  to behave).
                </li>
                <li>
                  A dashboard for your votes and generated captions, plus a stats
                  page ranking flavors by average upvotes per caption with top
                  examples.
                </li>
                <li>
                  Stronger button styling for key actions (including “Show more”
                  in the browser).
                </li>
              </ul>
            </div>
          </div>
        </details>

        <section
          style={{
            background: "#0f172a",
            padding: "24px",
            borderRadius: "20px",
            border: "1px solid #1f2937",
            boxShadow: "0 18px 36px rgba(0, 0, 0, 0.4)",
          }}
        >
          <h2 style={{ marginTop: 0 }}>How each humor flavor differs</h2>
          <p style={{ color: "#cbd5f5", marginTop: 0 }}>
            Names alone were confusing in testing—these notes describe what each
            flavor is trying to do so you can pick intentionally.
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
                  {getFlavorHowItWorks(flavor.slug, flavor.description)}
                </p>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
