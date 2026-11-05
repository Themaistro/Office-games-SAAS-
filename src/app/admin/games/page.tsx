import { requireAdminPage } from "@/features/identity/composition";
import { getGameManagement } from "@/features/missions/composition";
import {
  toggleGameStatus,
  updateGameRounds,
  updateDailyMissionSize,
} from "../actions";
import { Shield } from "lucide-react";
import GamesClient from "./GamesClient";

export const dynamic = "force-dynamic";

export default async function AdminGamesPage() {
  await requireAdminPage();

  const { groupedGames, activeGames, dailyGameCount } =
    await getGameManagement();
  // Wrapper for server action
  const handleToggle = async (gameId: string, currentStatus: boolean) => {
    "use server";
    await toggleGameStatus(gameId, currentStatus);
  };

  const handleUpdateRounds = async (
    gameId: string,
    easy: number,
    medium: number,
    hard: number,
  ) => {
    "use server";
    await updateGameRounds(gameId, easy, medium, hard);
  };

  const handleUpdateMissionGames = async (dailyGameCount: number) => {
    "use server";
    await updateDailyMissionSize(dailyGameCount);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Games Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Choose which games can enter the Daily Mission rotation and set
            their Easy, Medium, and Hard round mix.
          </p>
        </div>
        <Shield className="text-primary w-12 h-12 opacity-50" />
      </div>

      <div className="rounded-2xl border border-primary/15 bg-primary/[0.04] px-5 py-4 text-sm text-muted-foreground">
        <span className="font-bold text-foreground">How this works: </span>
        Availability controls the rotating daily route here. Round counts apply
        only when that game is selected. Set the daily game count below; add
        company-specific prompts in{" "}
        <span className="font-semibold text-foreground">Custom Questions</span>.
      </div>

      <GamesClient
        initialGroupedGames={groupedGames}
        toggleAction={handleToggle}
        updateRoundsAction={handleUpdateRounds}
        updateMissionGamesAction={handleUpdateMissionGames}
        missionPreview={{
          dailyGameCount,
          allActiveGames: activeGames,
        }}
      />
    </div>
  );
}
