import { dashboardTttIdPageQueries } from "@/features/lounge/composition";
import { getCurrentUser } from "@/features/identity/public-server";
import { redirect } from "next/navigation";
import TttBoardClient from "./TttBoardClient";

const { selectTttGamesForTttGamePage, selectTttGamesForTttGamePage2 } =
  dashboardTttIdPageQueries;

export const dynamic = "force-dynamic";

export default async function TttGamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch the game and verify the user is a participant
  const { rows: games } = await selectTttGamesForTttGamePage<any>([id]);
  const game = games[0];

  if (!game) {
    redirect("/dashboard");
  }

  const isParticipant =
    game.x_player_id === user.id || game.o_player_id === user.id;

  if (!isParticipant && game.status === "waiting") {
    redirect("/dashboard");
  }

  // Calculate Head-to-Head Rivalry Score
  const matchupScore = { xWins: 0, oWins: 0, draws: 0 };

  if (game.x_player_id && game.o_player_id) {
    const xId = game.x_player_id;
    const oId = game.o_player_id;

    const { rows: history } = await selectTttGamesForTttGamePage2<{
      status: string;
      x_player_id: string;
      o_player_id: string;
    }>([xId, oId]);

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
    <div>
      <TttBoardClient
        initialGame={game}
        currentUserId={user.id}
        matchupScore={matchupScore}
      />
    </div>
  );
}
