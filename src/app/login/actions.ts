"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { createSession } from "@/lib/auth";
import { query } from "@/lib/db";

export async function login(formData: FormData) {
  const data = {
    email: (formData.get("email") as string).trim().toLowerCase(),
    password: formData.get("password") as string,
  };

  const result = await query<{ id: string; password_hash: string | null; is_active: boolean }>(
    "SELECT u.id, u.password_hash, COALESCE(p.is_active, true) AS is_active FROM users u LEFT JOIN profiles p ON p.id = u.id WHERE u.email = $1",
    [data.email],
  );
  const user = result.rows[0];
  const valid = user?.password_hash ? await bcrypt.compare(data.password, user.password_hash) : false;

  if (!user || !valid || !user.is_active) {
    redirect("/login?error=Invalid email or password. Please try again.");
  }

  await createSession(user.id);
  await query(
    "INSERT INTO activity_feed (user_id, activity_type, metadata) VALUES ($1, $2, $3)",
    [user.id, "presence", JSON.stringify({ description: "just logged in and is ready to play" })],
  );
  revalidatePath("/", "layout");
  redirect("/dashboard");
}



