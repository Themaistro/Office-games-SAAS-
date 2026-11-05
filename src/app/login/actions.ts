"use server";

import { loginActionsQueries } from "@/features/identity/composition";
import { createSession } from "@/features/identity/public-server";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const { selectUsersForLogin, insertActivityFeedForLogin } = loginActionsQueries;

export async function login(formData: FormData) {
  const data = {
    email: (formData.get("email") as string).trim().toLowerCase(),
    password: formData.get("password") as string,
  };

  const result = await selectUsersForLogin<{
    id: string;
    password_hash: string | null;
    is_active: boolean;
  }>([data.email]);
  const user = result.rows[0];
  const valid = user?.password_hash
    ? await bcrypt.compare(data.password, user.password_hash)
    : false;

  if (!user || !valid || !user.is_active) {
    redirect("/login?error=Invalid email or password. Please try again.");
  }

  await createSession(user.id);
  await insertActivityFeedForLogin([
    user.id,
    "presence",
    JSON.stringify({ description: "just logged in and is ready to play" }),
  ]);
  revalidatePath("/", "layout");
  redirect("/dashboard");
}
