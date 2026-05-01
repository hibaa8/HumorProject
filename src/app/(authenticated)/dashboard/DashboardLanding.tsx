import type { CSSProperties } from "react";
import Link from "next/link";

type FlavorSummary = {
  id: number;
  slug: string | null;
  description: string;
};

type TopFlavor = FlavorSummary & {
  upvotesPerCaption: number;
  captionCount: number;
};

type Props = {
  firstName: string | null;
  topFlavors: TopFlavor[];
  allFlavors: FlavorSummary[];
};

const cardBase: CSSProperties = {
  background: "#0f172a",
  border: "1px solid #1f2937",
  borderRadius: "16px",
  padding: "20px",
  display: "grid",
  gap: "10px",
};

const sectionWrap: CSSProperties = {
  maxWidth: "1400px",
  margin: "0 auto 32px",
};

function formatSlug(slug: string | null): string {
  if (!slug) return "Flavor";
  return slug.replace(/-/g, " ");
}

export default function DashboardLanding({
  firstName,
  topFlavors,
  allFlavors,
}: Props) {
  return (
    <>
      <section style={sectionWrap}>
        <div
          style={{
            ...cardBase,
            background: "linear-gradient(145deg, #0f172a, #1e293b)",
            padding: "28px",
            gap: "14px",
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.45)",
          }}
        >
          <span style={{ color: "#22c55e", fontWeight: 600, fontSize: "13px" }}>
            Welcome{firstName ? `, ${firstName}` : ""}
          </span>
          <h1 style={{ margin: 0, fontSize: "28px" }}>
            The Humor Lab — research on what makes AI funny
          </h1>
          <p
            style={{
              margin: 0,
              color: "#cbd5f5",
              maxWidth: "780px",
              lineHeight: 1.55,
            }}
          >
            We&apos;re Columbia students teaching AI to be funnier. Each{" "}
            <strong>humor flavor</strong> below is a different recipe (prompts,
            models, persona) for generating captions. Your votes help us learn
            which flavors land with the 20-something Columbia crowd — and you can
            also drop in an image to make your own joke. AI lets all of us be
            comedians.
          </p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              marginTop: "8px",
            }}
          >
            <Link href="/jokes" className="home-cta-primary">
              Browse &amp; vote
            </Link>
            <Link href="/generate" className="nav-pill-outline">
              Generate your own
            </Link>
            <Link href="/stats" className="nav-pill-outline">
              See flavor stats
            </Link>
          </div>
        </div>
      </section>

      <section style={sectionWrap}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: "12px",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <h2 style={{ margin: 0 }}>Top humor flavors right now</h2>
          <Link
            href="/stats"
            className="nav-inline-link"
            style={{ fontSize: "14px" }}
          >
            View full leaderboard →
          </Link>
        </div>
        {topFlavors.length === 0 ? (
          <p style={{ color: "#94a3b8" }}>
            No vote data yet — head to{" "}
            <Link href="/jokes" className="nav-inline-link">
              Browse &amp; vote
            </Link>{" "}
            to be one of the first.
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "14px",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            }}
          >
            {topFlavors.map((f, idx) => (
              <article key={f.id} style={cardBase}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <span
                    style={{
                      background: "#22c55e",
                      color: "#0b0b0f",
                      fontWeight: 700,
                      fontSize: "13px",
                      borderRadius: "999px",
                      padding: "2px 10px",
                    }}
                  >
                    #{idx + 1}
                  </span>
                  <strong
                    style={{
                      textTransform: "capitalize",
                      fontSize: "16px",
                    }}
                  >
                    {formatSlug(f.slug)}
                  </strong>
                </div>
                <p
                  style={{
                    margin: 0,
                    color: "#cbd5f5",
                    fontSize: "14px",
                    lineHeight: 1.5,
                  }}
                >
                  {f.description}
                </p>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#94a3b8",
                  }}
                >
                  ▲ {f.upvotesPerCaption.toFixed(2)} avg upvotes ·{" "}
                  {f.captionCount} captions
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section style={sectionWrap}>
        <h2 style={{ marginTop: 0, marginBottom: "12px" }}>
          What you can do here
        </h2>
        <div
          style={{
            display: "grid",
            gap: "14px",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          }}
        >
          <Link
            href="/jokes"
            style={{ ...cardBase, textDecoration: "none", color: "inherit" }}
          >
            <strong style={{ fontSize: "16px" }}>🗳️ Vote on captions</strong>
            <p style={{ margin: 0, color: "#cbd5f5", fontSize: "14px" }}>
              Browse captions across all flavors and upvote what you find funny.
              Your votes are the research data we use to tune each pipeline.
            </p>
          </Link>
          <Link
            href="/generate"
            style={{ ...cardBase, textDecoration: "none", color: "inherit" }}
          >
            <strong style={{ fontSize: "16px" }}>📸 Make your own joke</strong>
            <p style={{ margin: 0, color: "#cbd5f5", fontSize: "14px" }}>
              Upload an image, pick a flavor, and the AI writes captions in that
              voice. AI lets all of us be comedians.
            </p>
          </Link>
          <Link
            href="/stats"
            style={{ ...cardBase, textDecoration: "none", color: "inherit" }}
          >
            <strong style={{ fontSize: "16px" }}>📊 Explore flavor stats</strong>
            <p style={{ margin: 0, color: "#cbd5f5", fontSize: "14px" }}>
              See which flavors are landing best with the Columbia crowd, ranked
              by average upvotes per caption with sample captions.
            </p>
          </Link>
        </div>
      </section>

      <section style={sectionWrap}>
        <h2 style={{ marginTop: 0, marginBottom: "12px" }}>
          All humor flavors
        </h2>
        <p
          style={{
            margin: "0 0 16px",
            color: "#94a3b8",
            fontSize: "14px",
            maxWidth: "780px",
          }}
        >
          Each flavor is a different prompt + model recipe. Pick a flavor when
          generating to lock in that voice; pick one in browse to see only its
          captions.
        </p>
        <div
          style={{
            display: "grid",
            gap: "12px",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          }}
        >
          {allFlavors.map((f) => (
            <div
              key={f.id}
              style={{
                ...cardBase,
                padding: "14px",
                gap: "6px",
              }}
            >
              <strong style={{ textTransform: "capitalize", fontSize: "15px" }}>
                {formatSlug(f.slug)}
              </strong>
              <p
                style={{
                  margin: 0,
                  color: "#cbd5f5",
                  fontSize: "13.5px",
                  lineHeight: 1.5,
                }}
              >
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
