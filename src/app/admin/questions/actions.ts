"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addCompanyTrivia(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");
  
  // Verify admin status
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Unauthorized");

  const question = formData.get("question") as string;
  const opt1 = formData.get("option1") as string;
  const opt2 = formData.get("option2") as string;
  const opt3 = formData.get("option3") as string;
  const opt4 = formData.get("option4") as string;
  const correctOptIndex = formData.get("correctOption") as string; // 1, 2, 3, or 4
  const targetDate = formData.get("targetDate") as string; // YYYY-MM-DD

  if (!question || !opt1 || !opt2 || !opt3 || !opt4 || !correctOptIndex || !targetDate) {
    throw new Error("All fields are required.");
  }

  const options = [opt1, opt2, opt3, opt4];
  const correctAnswer = options[parseInt(correctOptIndex) - 1];

  const { error } = await supabase
    .from("company_trivia")
    .insert({
      question,
      options,
      correct_answer: correctAnswer,
      target_date: targetDate,
      is_active: true
    });

  if (error) {
    console.error("Failed to add trivia:", error);
    throw new Error(error.message);
  }

  revalidatePath("/admin/questions");
}

export async function deleteTrivia(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  // Admin only
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Unauthorized");

  const { error } = await supabase.from("company_trivia").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/questions");
}

export async function toggleTriviaStatus(id: string, currentStatus: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  // Admin only
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Unauthorized");

  const { error } = await supabase.from("company_trivia").update({ is_active: !currentStatus }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/questions");
}
