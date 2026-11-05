"use server";
import { requireAdmin } from "@/features/identity/public-server";

import { adminPrizesActionsQueries } from "@/features/administration/composition";
import { getCurrentUser } from "@/features/identity/public-server";
import { revalidatePath } from "next/cache";

const {
  selectProfilesForAddPrize,
  insertPrizesForAddPrize,
  selectProfilesForDeletePrize,
  deletePrizesForDeletePrize,
} = adminPrizesActionsQueries;

export async function addPrize(formData: FormData) {
  await requireAdmin();

  const user = await getCurrentUser();

  if (!user) throw new Error("Unauthorized");

  const { rows: profiles } = await selectProfilesForAddPrize<{ role: string }>([
    user.id,
  ]);
  const profile = profiles[0];
  if (profile?.role !== "admin") throw new Error("Unauthorized");

  const title = formData.get("title") as string;
  const iconEmoji = (formData.get("icon_emoji") as string) || "🏆";
  const rankRequirement = Number(formData.get("rank_requirement"));

  if (
    !title?.trim() ||
    !Number.isInteger(rankRequirement) ||
    rankRequirement < 1 ||
    rankRequirement > 100
  ) {
    throw new Error("Title and Rank Requirement are required.");
  }
  if (title.trim().length > 120)
    throw new Error("Prize title must be 120 characters or fewer.");
  if (
    !/\p{Extended_Pictographic}/u.test(iconEmoji.trim()) ||
    iconEmoji.trim().length > 16
  )
    throw new Error("Choose one emoji icon for the prize.");

  await insertPrizesForAddPrize([
    title.trim(),
    iconEmoji.trim(),
    rankRequirement,
  ]);

  revalidatePath("/admin/prizes");
  revalidatePath("/leaderboard");
}

export async function deletePrize(id: string) {
  await requireAdmin();

  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const { rows: profiles } = await selectProfilesForDeletePrize<{
    role: string;
  }>([user.id]);
  const profile = profiles[0];
  if (profile?.role !== "admin") throw new Error("Unauthorized");

  await deletePrizesForDeletePrize([id]);

  revalidatePath("/admin/prizes");
  revalidatePath("/leaderboard");
}
