import { redirect } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import DashboardLanding from "./DashboardLanding";
import { computeFlavorStatsForViewer } from "@/lib/humorFlavorStatsServer";
import { getFlavorHowItWorks } from "@/lib/flavorContext";
import { isFlavorIncluded } from "@/lib/humorFlavorFilters";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const [statsResult, flavorRes, captionRes, profileRes] = await Promise.all([
    computeFlavorStatsForViewer(supabase, user.id),
    supabase.from("humor_flavors").select("id, slug, description").order("id"),
    supabase.from("captions").select("humor_flavor_id"),
    supabase
      .from("profiles")
      .select("first_name")
      .eq("id", user.id)
      .maybeSingle<{ first_name: string | null }>(),
  ]);

  const allFlavorRows = flavorRes.data ?? [];
  const flavorIdsWithCaptions = new Set(
    (captionRes.data ?? [])
      .map((row) => row.humor_flavor_id)
      .filter((id): id is number => Boolean(id))
  );

  const includedFlavors = allFlavorRows
    .filter((f) => isFlavorIncluded(f.slug, f.id, flavorIdsWithCaptions))
    .map((f) => ({
      id: f.id,
      slug: f.slug,
      description: getFlavorHowItWorks(f.slug, f.description),
    }));

  const leaderboard = statsResult.ok ? statsResult.payload.leaderboard : [];
  const flavorMetaById = new Map(includedFlavors.map((f) => [f.id, f]));
  const topFlavors = leaderboard
    .map((row) => {
      const meta = flavorMetaById.get(row.flavorId);
      if (!meta) return null;
      return {
        id: meta.id,
        slug: meta.slug,
        description: meta.description,
        upvotesPerCaption: row.upvotesPerCaption,
        captionCount: row.captionCount,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .slice(0, 3);

  const firstName = profileRes.data?.first_name ?? null;

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

      <DashboardLanding
        firstName={firstName}
        topFlavors={topFlavors}
        allFlavors={includedFlavors}
      />
    </main>
  );
}
