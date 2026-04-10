import { redirect } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import DashboardActivity from "./DashboardActivity";
import { loadDashboardActivity } from "@/lib/dashboardActivity";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { generated, voted } = await loadDashboardActivity(supabase, user.id);

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
      <h1 style={{ marginTop: 0, maxWidth: "1400px", margin: "0 auto 8px" }}>
        Your activity
      </h1>
      <p
        style={{
          color: "#94a3b8",
          maxWidth: "1400px",
          margin: "0 auto 24px",
        }}
      >
        Captions you generated and jokes you voted on. Sort matches the browse
        page: most upvotes, most downvotes, newest or oldest by caption date.
      </p>
      <DashboardActivity generated={generated} voted={voted} />
    </main>
  );
}
