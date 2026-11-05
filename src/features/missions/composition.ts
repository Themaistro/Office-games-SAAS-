import "server-only";
import { validateChallenge } from "../challenges/domain/challenge-validation";
import { withDatabaseLock } from "../../server/database/connection";
import { createMissionAnswerer } from "./application/answer-session";
import { createMissionConfigurationService } from "./application/configuration";
import { createDailyLineupService } from "./application/daily-lineup";
import { createMissionFinisher } from "./application/finish-session";
import { createGameManagementReader } from "./application/game-management";
import { createHintService } from "./application/hint-session";
import { createMissionStarter } from "./application/start-session";
import { postgresAnswers } from "./infrastructure/postgres-answers";
import { postgresConfiguration } from "./infrastructure/postgres-configuration";
import { postgresGameCatalog } from "./infrastructure/postgres-game-catalog";
import { postgresHints } from "./infrastructure/postgres-hints";
import { postgresLineups } from "./infrastructure/postgres-lineups";
import { postgresSettlement } from "./infrastructure/postgres-settlement";
import { postgresMissionStart } from "./infrastructure/postgres-start";

// Framework-facing wiring stays outside the application and domain layers.
export const getDailyMissionGames = createDailyLineupService(postgresLineups);
export const missionConfiguration = createMissionConfigurationService(
  postgresConfiguration,
);
export const getGameManagement =
  createGameManagementReader(postgresGameCatalog);
export const finishMissionFor = createMissionFinisher(postgresSettlement);
export const startMissionFor = createMissionStarter({
  repository: postgresMissionStart,
  lock: withDatabaseLock,
  now: Date.now,
  expire: (id, user) => finishMissionFor(id, user.id, "expired"),
});
export const answerMissionFor = createMissionAnswerer(
  postgresAnswers,
  validateChallenge,
);
export const hintMissionFor = createHintService(postgresHints);

export { resetDevelopmentMission } from "./infrastructure/development-reset";
export { readMissionQuestions } from "./infrastructure/postgres-session-read";

export * as apiMeGamesPlayedRouteQueries from "./infrastructure/api-me-games-played-route-queries";

export * as apiResetSessionRouteQueries from "./infrastructure/api-reset-session-route-queries";

export * as apiSoftResetRouteQueries from "./infrastructure/api-soft-reset-route-queries";

export * as dailyMissionPageQueries from "./infrastructure/daily-mission-page-queries";
