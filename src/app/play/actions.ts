"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { SessionQuestion } from "@/components/game/types/game";

// Note: In a real production app, we would perform strict date math to enforce 15 mins calendar day limits.
// For the MVP source code, we use a simpler model to demonstrate the architecture.

export async function startDailySession() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // 1. Check if they already have an active or completed session for today
  const today = new Date().toISOString().split('T')[0];
  
  const { data: existingSession } = await supabase
    .from("daily_sessions")
    .select("*")
    .eq("user_id", user.id)
    .gte("created_at", `${today}T00:00:00Z`)
    .single();

  if (existingSession && existingSession.is_completed) {
    return { error: "Already completed today's session", session: existingSession };
  }

  if (existingSession && !existingSession.is_completed) {
    return { success: true, session: existingSession };
  }

  // 2. No session today. Let's create one.
  const { data: session, error: sessionError } = await supabase
    .from("daily_sessions")
    .insert({
      user_id: user.id,
      allowed_duration_seconds: 900, // 15 mins
      is_completed: false
    })
    .select()
    .single();

  if (sessionError) throw sessionError;

  // 3. Fetch 4 random questions to assign to this session
  const { data: randomQuestions } = await supabase
    .from("questions")
    .select(`
      id, game_type_id, difficulty, content, options, base_xp,
      game_types (id, name, slug)
    `)
    .limit(4);

  if (randomQuestions && randomQuestions.length > 0) {
    const sessionQuestionsData = randomQuestions.map((q, index) => ({
      session_id: session.id,
      question_id: q.id,
      order_index: index,
      is_completed: false
    }));

    await supabase.from("session_questions").insert(sessionQuestionsData);
  }

  revalidatePath("/play");
  return { success: true, session };
}

export async function fetchSessionQuestions(sessionId: string) {
  const supabase = createClient();
  const { data: questions } = await supabase
    .from("session_questions")
    .select(`
      id, session_id, order_index, is_completed, question_id,
      questions (
        id, difficulty, content, options, base_xp, correct_answer,
        game_types (id, name, slug, description)
      )
    `)
    .eq("session_id", sessionId)
    .order("order_index", { ascending: true });

  if (!questions) return [];

  // Map to the shape GameEngine expects
  return questions.map((sq: any) => ({
    id: sq.id,
    session_id: sq.session_id,
    order_index: sq.order_index,
    is_completed: sq.is_completed,
    question_id: sq.question_id,
    question: {
      id: sq.questions.id,
      game_type_id: sq.questions.game_types.id,
      game_type: sq.questions.game_types,
      difficulty: sq.questions.difficulty,
      content: sq.questions.content,
      options: sq.questions.options,
      correct_answer: sq.questions.correct_answer,
      base_xp: sq.questions.base_xp,
    }
  })) as SessionQuestion[];
}

export async function submitAnswer(sessionQuestionId: string, answer: string, timeSpentSeconds: number) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Fetch the question details
  const { data: sq } = await supabase
    .from("session_questions")
    .select(`
      *,
      questions(correct_answer, base_xp),
      daily_sessions!inner(user_id)
    `)
    .eq("id", sessionQuestionId)
    .single();

  if (!sq) throw new Error("Question not found");
  if (sq.daily_sessions.user_id !== user.id) throw new Error("Unauthorized");
  if (sq.is_completed) return { error: "Already answered" };

  // Verify answer
  const isCorrect = sq.questions.correct_answer.toString().toLowerCase() === answer.toLowerCase();
  
  // Calculate XP
  let xpEarned = 0;
  if (isCorrect) {
    xpEarned = sq.questions.base_xp;
    const speedMultiplier = Math.max(0, (30 - timeSpentSeconds) / 30);
    const speedBonus = Math.round((xpEarned * 0.5) * speedMultiplier);
    xpEarned += speedBonus;
  }

  // Update session_questions
  await supabase
    .from("session_questions")
    .update({
      is_completed: true,
      earned_xp: xpEarned,
      time_spent_seconds: timeSpentSeconds
    })
    .eq("id", sessionQuestionId);

  return { success: true, isCorrect, xpEarned, correctAnswer: sq.questions.correct_answer };
}

export async function endSession(sessionId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: questions } = await supabase
    .from("session_questions")
    .select("earned_xp, is_completed")
    .eq("session_id", sessionId);

  const totalXp = questions?.reduce((sum, q) => sum + (q.earned_xp || 0), 0) || 0;

  await supabase
    .from("daily_sessions")
    .update({
      is_completed: true,
      total_score: totalXp
    })
    .eq("id", sessionId);

  if (totalXp > 0) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("total_xp, current_streak, best_streak, games_played")
      .eq("id", user.id)
      .single();

    if (profile) {
      const newXp = (profile.total_xp || 0) + totalXp;
      const newGamesPlayed = (profile.games_played || 0) + 1;
      const newStreak = (profile.current_streak || 0) + 1;
      const newBestStreak = Math.max(profile.best_streak || 0, newStreak);
      const newLevel = Math.floor(newXp / 1200) + 1;

      await supabase
        .from("profiles")
        .update({
          total_xp: newXp,
          games_played: newGamesPlayed,
          current_streak: newStreak,
          best_streak: newBestStreak,
          current_level: newLevel
        })
        .eq("id", user.id);
    }
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
