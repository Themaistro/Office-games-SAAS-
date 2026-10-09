import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { redirect } from "next/navigation";
import TttBoardClient from "./TttBoardClient";

export const dynamic = "force-dynamic";

export default async function TttGamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch the game and verify the user is a participant
  const { rows: games } = await query<any>(`SELECT g.*,
    jsonb_build_object('id', x.id, 'full_name', x.full_name, 'avatar_url', x.avatar_url, 'ttt_elo', x.ttt_elo) AS x_player,
    jsonb_build_object('id', o.id, 'full_name', o.full_name, 'avatar_url', o.avatar_url, 'ttt_elo', o.ttt_elo) AS o_player
    FROM ttt_games g LEFT JOIN profiles x ON x.id = g.x_player_id LEFT JOIN profiles o ON o.id = g.o_player_id WHERE g.id = $1`, [id]);
  const game = games[0];

  if (!game) {
    redirect("/dashboard");
  }

  const isParticipant = game.x_player_id === user.id || game.o_player_id === user.id;

  if (!isParticipant && game.status === "waiting") {
    redirect("/dashboard");
  }

  // Calculate Head-to-Head Rivalry Score
  const matchupScore = { xWins: 0, oWins: 0, draws: 0 };
  
  if (game.x_player_id && game.o_player_id) {
    const xId = game.x_player_id;
    const oId = game.o_player_id;

    const { rows: history } = await query<{ status: string; x_player_id: string; o_player_id: string }>(`SELECT status, x_player_id, o_player_id FROM ttt_games WHERE status IN ('x_won', 'o_won', 'draw') AND ((x_player_id = $1 AND o_player_id = $2) OR (x_player_id = $2 AND o_player_id = $1))`, [xId, oId]);

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
