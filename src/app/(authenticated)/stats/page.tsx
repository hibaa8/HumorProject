import { redirect } from "next/navigation";
import StatsView from "./StatsView";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export default async function StatsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return <StatsView viewerId={user.id} />;
}
