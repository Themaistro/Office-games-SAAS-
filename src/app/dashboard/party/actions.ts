"use server";

import { getCurrentUser } from "@/features/identity/public-server";
import type {
  PartyFormat,
  PartyMode,
} from "@/features/lounge/domain/party-contract";
import {
  answerParty,
  cancelPartyInvite,
  createParty,
  inviteParty,
  joinParty,
  leaveParty,
  partySnapshot,
  startParty,
} from "@/features/lounge/public-server";
import { publishGameEvent } from "@/server/realtime/publisher";
import { redirect } from "next/navigation";

async function player() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}
async function notify(id: string) {
  await publishGameEvent("party", id, { type: "room_updated" }).catch(
    () => undefined,
  );
}
export async function createPartyRoom(input: {
  format: PartyFormat;
  mode: PartyMode;
  rounds: number;
  visibility: "public" | "private";
}) {
  const user = await player();
  return createParty(user.id, input);
}
export async function joinPartyRoom(id: string, replace = false) {
  const user = await player();
  await joinParty(user.id, id, replace);
  await notify(id);
  return partySnapshot(user.id, id);
}
export async function acceptPartyInvitation(id: string, replace = false) {
  await joinPartyRoom(id, replace);
  redirect(`/dashboard/party/${id}`);
}
export async function inviteToParty(id: string, target: string) {
  const user = await player();
  await inviteParty(user.id, id, target);
  await notify(id);
  return partySnapshot(user.id, id);
}
export async function cancelPartyInvitation(id: string, target: string) {
  const user = await player();
  await cancelPartyInvite(user.id, id, target);
  await notify(id);
  return partySnapshot(user.id, id);
}
export async function startPartyRoom(id: string) {
  const user = await player();
  await startParty(user.id, id);
  await notify(id);
  return partySnapshot(user.id, id);
}
export async function submitPartyAnswer(
  id: string,
  position: number,
  answer: string,
  seconds?: number,
) {
  const user = await player();
  await answerParty(user.id, id, position, answer, seconds);
  await notify(id);
  return partySnapshot(user.id, id);
}
export async function leavePartyRoom(id: string) {
  const user = await player();
  await leaveParty(user.id, id);
  await notify(id);
}
