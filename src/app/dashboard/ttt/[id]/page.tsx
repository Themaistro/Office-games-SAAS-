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

  // Calculate Head-to-Head Rivalry Score
  let matchupScore = { xWins: 0, oWins: 0, draws: 0 };
  
  if (game.x_player_id && game.o_player_id) {
    const xId = game.x_player_id;
    const oId = game.o_player_id;

    const { data: history } = await supabase
      .from("ttt_games")
      .select("status, x_player_id, o_player_id")
      .in("status", ["x_won", "o_won", "draw"])
      .or(`and(x_player_id.eq.${xId},o_player_id.eq.${oId}),and(x_player_id.eq.${oId},o_player_id.eq.${xId})`);

    if (history) {
      for (const h of history) {
        if (h.status === "draw") {
          matchupScore.draws++;
        } else if (h.status === "x_won") {
          if (h.x_player_id === xId) matchupScore.xWins++;
          else matchupScore.oWins++;
        } else if (h.status === "o_won") {
          if (h.o_player_id === xId) matchupScore.xWins++;
          else matchupScore.oWins++;
        }
      }
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <TttBoardClient 
        initialGame={game} 
        currentUserId={user.id} 
        matchupScore={matchupScore}
      />
    </div>
  );
}
