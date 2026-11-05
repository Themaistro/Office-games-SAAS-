"use server";

import { profileActionsQueries } from "@/features/players/composition";
import { getCurrentUser } from "@/features/identity/public-server";
import { revalidatePath } from "next/cache";

const {
  selectDepartmentsForUpdateProfile,
  updateProfilesForUpdateProfile,
  updateProfilesForUpdateProfile2,
} = profileActionsQueries;

export async function updateProfile(
  fullName: string,
  avatarUrl: string,
  department?: string,
) {
  const user = await getCurrentUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  if (department !== undefined) {
    const { rows: matchingDepartments } =
      await selectDepartmentsForUpdateProfile<{ name: string }>([
        department.trim(),
      ]);
    if (!matchingDepartments[0]) {
      return { error: "Please select an active department." };
    }
    await updateProfilesForUpdateProfile([
      fullName,
      avatarUrl,
      department,
      user.id,
    ]);
  } else {
    await updateProfilesForUpdateProfile2([fullName, avatarUrl, user.id]);
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/leaderboard");
  return { success: true };
}
