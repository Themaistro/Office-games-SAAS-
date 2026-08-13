"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    options: {
      data: {
        full_name: formData.get("full_name") as string,
      }
    }
  };

  if (!data.email || !data.password || !data.options.data.full_name) {
    redirect("/register?error=Please fill out all fields");
  }

  const { data: authData, error } = await supabase.auth.signUp(data);

  if (error) {
    redirect("/register?error=" + encodeURIComponent(error.message));
  }

  if (!authData.session) {
    // Email confirmation is required
    redirect("/login?message=" + encodeURIComponent("Account created! Please check your email to verify your account."));
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
