import { dashboardConnectFourIdPageQueries } from "@/features/lounge/composition";
import { getCurrentUser } from "@/features/identity/public-server";
import { redirect } from "next/navigation";
import ConnectFourClient from "./ConnectFourClient";

const { selectConnectFourGamesForConnectFourPage } =
  dashboardConnectFourIdPageQueries;

export const dynamic = "force-dynamic";

export default async function ConnectFourPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { rows } = await selectConnectFourGamesForConnectFourPage<any>([id]);
  const game = rows[0];
  if (
    !game ||
    (game.status === "waiting" &&
      game.red_player_id !== user.id &&
      game.yellow_player_id !== user.id)
  )
    redirect("/dashboard");
  return <ConnectFourClient initialGame={game} currentUserId={user.id} />;
}
