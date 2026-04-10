import { redirect } from "next/navigation";
import CaptionBrowser from "@/app/CaptionBrowser";
import Navbar from "@/app/components/Navbar";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export default async function JokesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

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
      <CaptionBrowser />
    </main>
  );
}
