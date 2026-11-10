"use server";

import { loginWithCredentials } from "@/features/identity/public-server";
import { parseCredentials } from "@/features/identity/domain/credentials";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function login(formData: FormData) {
  const input = parseCredentials(formData);
  if (!input)
    redirect("/login?error=Please provide a valid email and password.");
  const result = await loginWithCredentials(input);
  if ("error" in result)
    redirect("/login?error=" + encodeURIComponent(result.error));
  revalidatePath("/", "layout");
  redirect("/dashboard");
}
