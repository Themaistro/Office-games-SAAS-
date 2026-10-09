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

  const result = await query<{ id: string; password_hash: string | null }>(
    "SELECT id, password_hash FROM users WHERE email = $1",
    [data.email],
  );
  const user = result.rows[0];
  const valid = user?.password_hash ? await bcrypt.compare(data.password, user.password_hash) : false;

  if (!user || !valid) {
    redirect("/login?error=Invalid email or password. Please try again.");
  }

  await createSession(user.id);
  revalidatePath("/", "layout");
  redirect("/dashboard");
}



