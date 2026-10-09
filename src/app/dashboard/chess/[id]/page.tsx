import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { redirect } from "next/navigation";
import ChessBoardClient from "./ChessBoardClient";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ChessGamePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const gameId = params.id;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const [{ rows: profiles }, { rows: games }] = await Promise.all([
    query<any>("SELECT id, full_name, avatar_url, chess_elo FROM profiles WHERE id = $1", [user.id]),
    query<any>(`SELECT g.*, jsonb_build_object('id', w.id, 'full_name', w.full_name, 'avatar_url', w.avatar_url, 'chess_elo', w.chess_elo) AS white,
      jsonb_build_object('id', b.id, 'full_name', b.full_name, 'avatar_url', b.avatar_url, 'chess_elo', b.chess_elo) AS black
      FROM chess_games g LEFT JOIN profiles w ON w.id = g.white_player_id LEFT JOIN profiles b ON b.id = g.black_player_id WHERE g.id = $1`, [gameId]),
  ]);
  const profile = profiles[0];
  const game = games[0];

  if (!game) {
    console.error("Error fetching game");
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Game Not Found</h1>
        <p className="text-muted-foreground mb-8">This chess game doesn't exist or has been removed.</p>
        <Link href="/dashboard" className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium">
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
        last_move_timestamp: new Date().toISOString()
      };
      
      if (!game.white_player_id) {
        updateData.white_player_id = user.id;
        playerColor = "white";
      } else {
        updateData.black_player_id = user.id;
        playerColor = "black";
      }

      await query("UPDATE chess_games SET status = 'in_progress', white_player_id = COALESCE(white_player_id, $1), black_player_id = COALESCE(black_player_id, $2), updated_at = now(), last_move_timestamp = now() WHERE id = $3 AND status = 'waiting'", [updateData.white_player_id ?? null, updateData.black_player_id ?? null, gameId]);

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

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
          <ArrowLeft size={16} /> Back to Lounge
        </Link>
      </div>

      <ChessBoardClient 
        game={game} 
        currentUserId={user.id}
        currentUserProfile={{
          full_name: profile?.full_name || user.email?.split('@')[0] || "Spectator",
          avatar_url: profile?.avatar_url
        }}
        playerColor={playerColor} 
      />
    </div>
  );
}
