import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TttBoardClient from "./TttBoardClient";

export const dynamic = "force-dynamic";

export default async function TttGamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch the game and verify the user is a participant
  const { data: game, error } = await supabase
    .from("ttt_games")
    .select(`
      *,
      x_player:profiles!ttt_games_x_player_id_fkey ( id, full_name, avatar_url, ttt_elo ),
      o_player:profiles!ttt_games_o_player_id_fkey ( id, full_name, avatar_url, ttt_elo )
    `)
    .eq("id", id)
    .single();

  if (error || !game) {
    redirect("/dashboard");
  }

  const isParticipant = game.x_player_id === user.id || game.o_player_id === user.id;

  if (!isParticipant && game.status === "waiting") {
    redirect("/dashboard");
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <TttBoardClient 
        initialGame={game} 
        currentUserId={user.id} 
      />
    </div>
  );
}
