import Link from "next/link";
import { redirect } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import DashboardActivity from "../../dashboard/DashboardActivity";
import {
  ACTIVITY_FULL_GENERATED_LIMIT,
  ACTIVITY_FULL_VOTE_ROWS_LIMIT,
  loadDashboardActivity,
} from "@/lib/dashboardActivity";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export default async function ActivityAllPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { generated, voted } = await loadDashboardActivity(supabase, user.id, {
    generatedQueryLimit: ACTIVITY_FULL_GENERATED_LIMIT,
    voteRowsQueryLimit: ACTIVITY_FULL_VOTE_ROWS_LIMIT,
  });

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
      <section style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <p style={{ marginTop: 0, marginBottom: "8px" }}>
          <Link href="/activity" className="nav-inline-link">
            ← Back to recent activity
          </Link>
        </p>
        <h1 style={{ marginTop: 0, marginBottom: "8px" }}>
          All your activity
        </h1>
        <p
          style={{
            color: "#94a3b8",
            margin: "0 0 24px",
            maxWidth: "780px",
          }}
        >
          Every caption you generated and every caption you voted on (up to
          large limits for performance). Use the sort control to reorder both
          sections.
        </p>
        <DashboardActivity
          generated={generated}
          voted={voted}
          variant="full"
        />
      </section>
    </main>
  );
}
