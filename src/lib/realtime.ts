import { getPublicCompanyId } from "./company-config";

/** Client-safe channel naming; publisher credentials live only on the server. */
export function getGameChannelName(gameType: string, gameId: string) {
  return `company:${getPublicCompanyId()}:game:${gameType}:${gameId}`;
}
