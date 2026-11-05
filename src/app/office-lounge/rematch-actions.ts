"use server";
import { getCurrentUser } from "@/features/identity/public-server";
import {
  getGameDefinition,
  type GameType,
} from "@/features/lounge/domain/game-registry";
import { isUuid } from "@/features/lounge/domain/party-contract";
import type {
  RematchState,
  RematchResponse,
} from "@/features/lounge/domain/rematch";
import {
  requestRematch,
  readRematch,
  cancelRematch,
} from "@/features/lounge/composition";
async function actor(type: GameType, source: string, id?: string | null) {
  if (!getGameDefinition(type) || !isUuid(source) || (id && !isUuid(id)))
    throw new Error("Invalid rematch");
  const user = await getCurrentUser();
  if (!user) throw new Error("Please sign in");
  return user.id;
}
async function respond(
  work: () => Promise<RematchState>,
): Promise<RematchResponse> {
  try {
    return { ok: true, state: await work() };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return {
      ok: false,
      error:
        /^(Only the two players|Finish this match|Your opponent|That player|A player|Invalid rematch|Please sign in)/.test(
          message,
        )
          ? message
          : "Could not update the rematch. Please try again.",
    };
  }
}
export async function requestGameRematch(type: GameType, source: string) {
  return respond(async () =>
    requestRematch(type, source, await actor(type, source)),
  );
}
export async function readGameRematch(
  type: GameType,
  source: string,
  id?: string | null,
) {
  return respond(async () =>
    readRematch(type, source, await actor(type, source, id), id),
  );
}
export async function cancelGameRematch(
  type: GameType,
  source: string,
  id: string,
) {
  return respond(async () =>
    cancelRematch(type, source, await actor(type, source, id), id),
  );
}
