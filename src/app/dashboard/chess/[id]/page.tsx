import { dashboardChessIdPageQueries } from "@/features/lounge/composition";
import { getCurrentUser } from "@/features/identity/public-server";
import { redirect } from "next/navigation";
import ChessBoardClient from "./ChessBoardClient";
import { getMatchResult } from "@/features/lounge/public-server";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const {
  selectProfilesForChessGamePage,
  selectChessGamesForChessGamePage,
  updateChessGamesForChessGamePage,
} = dashboardChessIdPageQueries;

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ChessGamePage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const gameId = params.id;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const [{ rows: profiles }, { rows: games }] = await Promise.all([
    selectProfilesForChessGamePage<any>([user.id]),
    selectChessGamesForChessGamePage<any>([gameId]),
  ]);
  const profile = profiles[0];
  const game = games[0];

  if (!game) {
    console.error("Error fetching game");
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Game Not Found</h1>
        <p className="text-muted-foreground mb-8">
          This chess game doesn't exist or has been removed.
        </p>
        <Link
          href="/dashboard"
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium"
        >
          <ArrowLeft size={16} /> Return to Dashboard
        </Link>
      </div>
    );
  }

  // Determine player's color
  let playerColor: "white" | "black" | "spectator" = "spectator";
  if (game.white_player_id === user.id) playerColor = "white";
  else if (game.black_player_id === user.id) playerColor = "black";

  // Auto-join logic if someone links a waiting game directly
  if (game.status === "waiting" && playerColor === "spectator") {
    // Cannot join if it's full (shouldn't happen in waiting, but safe check)
    if (!game.white_player_id || !game.black_player_id) {
      const updateData: any = {
        status: "in_progress",
        updated_at: new Date().toISOString(),
        last_move_timestamp: new Date().toISOString(),
      };

      if (!game.white_player_id) {
        updateData.white_player_id = user.id;
        playerColor = "white";
      } else {
        updateData.black_player_id = user.id;
        playerColor = "black";
      }

      await updateChessGamesForChessGamePage([
        updateData.white_player_id ?? null,
        updateData.black_player_id ?? null,
        gameId,
      ]);

      // Update local game object so child component has the new player
      if (playerColor === "white") {
        game.white_player_id = user.id;
        game.white = profile;
      }
      if (playerColor === "black") {
        game.black_player_id = user.id;
        game.black = profile;
      }
      game.status = "in_progress";
    }
  }

  game.result = await getMatchResult("chess", gameId);
  return (
    <div>
      <ChessBoardClient
        game={game}
        currentUserId={user.id}
        currentUserProfile={{
          full_name:
            profile?.full_name || user.email?.split("@")[0] || "Spectator",
          avatar_url: profile?.avatar_url,
        }}
        playerColor={playerColor}
      />
    </div>
  );
}
