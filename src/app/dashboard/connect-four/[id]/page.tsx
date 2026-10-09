import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { redirect } from "next/navigation";
import ConnectFourClient from "./ConnectFourClient";

export const dynamic = "force-dynamic";

export default async function ConnectFourPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { rows } = await query<any>(`SELECT g.*, jsonb_build_object('id', r.id, 'full_name', r.full_name, 'avatar_url', r.avatar_url) AS red,
    jsonb_build_object('id', y.id, 'full_name', y.full_name, 'avatar_url', y.avatar_url) AS yellow
    FROM connect_four_games g LEFT JOIN profiles r ON r.id = g.red_player_id LEFT JOIN profiles y ON y.id = g.yellow_player_id WHERE g.id = $1`, [id]);
  const game = rows[0];
  if (!game || (game.status === "waiting" && game.red_player_id !== user.id && game.yellow_player_id !== user.id)) redirect("/dashboard");
  return <ConnectFourClient initialGame={game} currentUserId={user.id} />;
}

