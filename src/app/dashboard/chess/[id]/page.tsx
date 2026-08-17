import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ChessBoardClient from "./ChessBoardClient";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ChessGamePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const gameId = params.id;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, chess_elo')
    .eq('id', user.id)
    .single();

  const { data: game, error } = await supabase
    .from("chess_games")
    .select(`
      *,
      white:profiles!chess_games_white_player_id_fkey ( id, full_name, avatar_url, chess_elo ),
      black:profiles!chess_games_black_player_id_fkey ( id, full_name, avatar_url, chess_elo )
    `)
    .eq("id", gameId)
    .single();

  if (error || !game) {
    console.error("Error fetching game:", error);
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

      // Need service role to bypass RLS
      const { createClient: createSupabaseAdmin } = await import('@supabase/supabase-js');
      const adminClient = createSupabaseAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      
      await adminClient.from("chess_games").update(updateData).eq("id", gameId);

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
