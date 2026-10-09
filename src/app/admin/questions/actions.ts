"use server";

import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function addCompanyTrivia(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) throw new Error("Unauthorized");
  
  // Verify admin status
  const { rows: profiles } = await query<{ role: string }>("SELECT role FROM profiles WHERE id = $1", [user.id]);
  const profile = profiles[0];

  if (profile?.role !== "admin") throw new Error("Unauthorized");

  const question = formData.get("question") as string;
  const gameSlug = formData.get("gameSlug") as string;
  const opt1 = formData.get("option1") as string;
  const opt2 = formData.get("option2") as string;
  const opt3 = formData.get("option3") as string;
  const opt4 = formData.get("option4") as string;
  const correctOptIndex = formData.get("correctOption") as string; // 1, 2, 3, or 4
  const targetDateRaw = formData.get("targetDate") as string; // YYYY-MM-DD or empty
  const department = formData.get("department") as string;

  const isMC = ['general-trivia', 'trivia'].includes(gameSlug);
  const isTarget = ['typing', 'typing-challenge'].includes(gameSlug);
  const isPzl = false;

  if (!question || !gameSlug) {
    throw new Error("Question and game type are required.");
  }

  let finalOptions: string[] = [];
  let finalCorrectAnswer = "";

  if (isMC) {
    if (!opt1 || !opt2 || !opt3 || !opt4 || !correctOptIndex) {
      throw new Error("Options and correct answer are required for multiple choice games.");
    }
    finalOptions = [opt1, opt2, opt3, opt4];
    finalCorrectAnswer = finalOptions[parseInt(correctOptIndex) - 1];
  } else if (isTarget) {
    finalOptions = [];
    finalCorrectAnswer = question; // Target text is its own answer
  } else if (isPzl) {
    const directAnswer = formData.get("correctAnswerDirect") as string;
    if (!directAnswer) throw new Error("Correct answer is required for puzzle games.");
    finalOptions = [];
    finalCorrectAnswer = directAnswer;
  }

  const targetDate = targetDateRaw ? targetDateRaw : null;
  const dept = department || "General";

  await query("INSERT INTO company_trivia (game_slug, question, options, correct_answer, target_date, department, is_active) VALUES ($1, $2, $3, $4, $5, $6, true)", [gameSlug, question, JSON.stringify(finalOptions), finalCorrectAnswer, targetDate, dept]);

  revalidatePath("/admin/questions");
}

export async function editCompanyTrivia(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) throw new Error("Unauthorized");
  
  // Verify admin status
  const { rows: profiles } = await query<{ role: string }>("SELECT role FROM profiles WHERE id = $1", [user.id]);
  const profile = profiles[0];

  if (profile?.role !== "admin") throw new Error("Unauthorized");

  const id = formData.get("id") as string;
  const question = formData.get("question") as string;
  const gameSlug = formData.get("gameSlug") as string;
  const opt1 = formData.get("option1") as string;
  const opt2 = formData.get("option2") as string;
  const opt3 = formData.get("option3") as string;
  const opt4 = formData.get("option4") as string;
  const correctOptIndex = formData.get("correctOption") as string; 
  const targetDateRaw = formData.get("targetDate") as string;
  const department = formData.get("department") as string;

  const isMC = ['general-trivia', 'trivia'].includes(gameSlug);
  const isTarget = ['typing', 'typing-challenge'].includes(gameSlug);
  const isPzl = false;

  if (!id || !question || !gameSlug) {
    throw new Error("Missing required fields.");
  }

  let finalOptions: string[] = [];
  let finalCorrectAnswer = "";

  if (isMC) {
    if (!opt1 || !opt2 || !opt3 || !opt4 || !correctOptIndex) {
      throw new Error("Options and correct answer are required for multiple choice games.");
    }
    finalOptions = [opt1, opt2, opt3, opt4];
    finalCorrectAnswer = finalOptions[parseInt(correctOptIndex) - 1];
  } else if (isTarget) {
    finalOptions = [];
    finalCorrectAnswer = question;
  } else if (isPzl) {
    const directAnswer = formData.get("correctAnswerDirect") as string;
    if (!directAnswer) throw new Error("Correct answer is required for puzzle games.");
    finalOptions = [];
    finalCorrectAnswer = directAnswer;
  }

  const targetDate = targetDateRaw ? targetDateRaw : null;
  const dept = department || "General";

  await query("UPDATE company_trivia SET game_slug = $1, question = $2, options = $3, correct_answer = $4, target_date = $5, department = $6 WHERE id = $7", [gameSlug, question, JSON.stringify(finalOptions), finalCorrectAnswer, targetDate, dept, id]);

  revalidatePath("/admin/questions");
}

export async function deleteTrivia(id: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  
  // Admin only
  const { rows: profiles } = await query<{ role: string }>("SELECT role FROM profiles WHERE id = $1", [user.id]);
  const profile = profiles[0];
  if (profile?.role !== "admin") throw new Error("Unauthorized");

  await query("DELETE FROM company_trivia WHERE id = $1", [id]);

  revalidatePath("/admin/questions");
}

export async function toggleTriviaStatus(id: string, currentStatus: boolean) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  
  // Admin only
  const { rows: profiles } = await query<{ role: string }>("SELECT role FROM profiles WHERE id = $1", [user.id]);
  const profile = profiles[0];
  if (profile?.role !== "admin") throw new Error("Unauthorized");

  await query("UPDATE company_trivia SET is_active = $1 WHERE id = $2", [!currentStatus, id]);

  revalidatePath("/admin/questions");
}
