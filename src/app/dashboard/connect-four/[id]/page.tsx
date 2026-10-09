import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ConnectFourClient from "./ConnectFourClient";

export const dynamic = "force-dynamic";

export default async function ConnectFourPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: game } = await supabase.from("connect_four_games").select("*, red:profiles!connect_four_games_red_player_id_fkey(id,full_name,avatar_url), yellow:profiles!connect_four_games_yellow_player_id_fkey(id,full_name,avatar_url)").eq("id", id).single();
  if (!game || (game.status === "waiting" && game.red_player_id !== user.id && game.yellow_player_id !== user.id)) redirect("/dashboard");
  return <ConnectFourClient initialGame={game} currentUserId={user.id} />;
}
