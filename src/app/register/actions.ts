"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signup(formData: FormData) {
  const rawEmail = formData.get("email") as string;
  const rawPassword = formData.get("password") as string;
  const rawFullName = formData.get("full_name") as string;
  const rawDepartment = formData.get("department") as string;
  const rawPosition = formData.get("position") as string;

  if (!rawEmail || !rawPassword || !rawFullName || !rawDepartment || !rawPosition) {
    redirect("/register?error=Please fill out all required fields.");
  }

  const email = rawEmail.trim();
  const password = rawPassword;
  const fullName = rawFullName.trim();
  const department = rawDepartment.trim();
  const position = rawPosition.trim();

  // 1. Email Validation (Basic RFC 5322 regex check)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    redirect("/register?error=Please provide a valid email address.");
  }

  // 2. Password Strength (Supabase requires at least 6, but we can enforce more rules if desired)
  if (password.length < 6) {
    redirect("/register?error=Password must be at least 6 characters long.");
  }

  // 3. String Length Limits (UI & Database Quality)
  if (fullName.length < 2 || fullName.length > 50) {
    redirect("/register?error=Full Name must be between 2 and 50 characters.");
  }
  if (position.length < 2 || position.length > 50) {
    redirect("/register?error=Position must be between 2 and 50 characters.");
  }


  const supabase = await createClient();

  const { data: authData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        department: department,
        position: position,
      },
    },
  });

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
