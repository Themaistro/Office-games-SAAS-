"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { 
  generateTypingChallenge, 
  generateWordUnscramble, 
  generateMentalMath, 
  generateSequence, 
  generateOddObject, 
  generateTrivia, 
  generateSudokuLite, 
  generateMemory 
} from "@/lib/game-content";
import { SessionQuestion } from "@/types/game";

// Note: In a real production app, we would perform strict date math to enforce 15 mins calendar day limits.
// For the MVP source code, we use a simpler model to demonstrate the architecture.

export async function startDailySession() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // Fetch the user's department for personalized content filtering
  const { data: profile } = await supabase
    .from("profiles")
    .select("department")
    .eq("id", user.id)
    .single();
  const userDept = profile?.department || "General";

  // 1. Check if they have an active (incomplete) session (could be normal or a test session)
  const { data: activeSessions } = await supabase
    .from("daily_sessions")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_completed", false);

  if (activeSessions && activeSessions.length > 0) {
    const activeSession = activeSessions[0];
    
    // Check if this session is broken (0 questions)
    const { count } = await supabase
      .from("session_questions")
      .select("*", { count: 'exact', head: true })
      .eq("session_id", activeSession.id);
      
    if (count && count > 0) {
      return { success: true, session: activeSession };
    } else {
      console.log("Broken session detected, deleting:", activeSession.id);
      await supabase.from("daily_sessions").delete().eq("id", activeSession.id);
      // Let it fall through to create a new session
    }
  }

  // 1.b Check if they already completed today's session
  const today = new Date().toISOString().split('T')[0];
  
  const { data: todaySession } = await supabase
    .from("daily_sessions")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", today)
    .maybeSingle();

  if (todaySession && todaySession.is_completed) {
    return { error: "Already completed today's session", session: todaySession };
  }

  // 2. Fetch active games and ensure today's question pool is generated
  const { data: activeGames } = await supabase.from("game_types").select("*").eq("is_active", true);
  const activeGameIds = activeGames?.map((g) => g.id) || [];

  if (activeGameIds.length === 0) {
    return { error: "No active games available right now. Please check back later." };
  }

  // Check if we have generated questions for today
  // TEMP FIX: We had an issue with difficulty missing in older questions. 
  // Let's only pull questions generated in the last 2 hours to bypass the broken pool from earlier today.
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  
  let { data: todaysQuestions, error: qError } = await supabase
    .from("questions")
    .select("id, game_type_id, difficulty, content, options, base_xp, game_types (id, name, slug, is_active)")
    .gte("created_at", twoHoursAgo)
    .in("game_type_id", activeGameIds);

  if (qError) {
    console.error("Error fetching questions:", qError);
    return { error: "Failed to fetch questions. Please try again." };
  }

  // If no questions exist for today, GENERATE the dynamic daily pool!
  if (!todaysQuestions || todaysQuestions.length === 0) {
    console.log("Generating dynamic daily pool for", today);
    const newQuestions = [];
    
    // Seed for today so we can deterministically generate questions if needed, 
    // or we just rely on random since it's saved in the DB once per day.
    for (const game of activeGames || []) {
      // Generate 15 questions per active game for the daily pool
      // Generate 15 questions per active game for the daily pool (5 Easy, 5 Medium, 5 Hard)
      const difficulties: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'hard'];
      let generatedBatch: any[] = [];
      
      for (const diff of difficulties) {
        let diffBatch: any[] = [];
        if (game.slug === "mental-math" || game.slug === "mental_math" || game.slug === "math") {
          diffBatch = generateMentalMath(5, diff);
        } else if (game.slug === "word-unscramble" || game.slug === "unscramble") {
          diffBatch = generateWordUnscramble(5, diff);
        } else if (game.slug === "typing-challenge" || game.slug === "typing") {
          diffBatch = generateTypingChallenge(5, diff);
        } else if (game.slug === "memory") {
          diffBatch = generateMemory(5, diff);
        } else if (game.slug === "sudoku-lite" || game.slug === "sudoku_lite") {
          diffBatch = generateSudokuLite(5, diff);
        } else if (game.slug === "odd-object" || game.slug === "odd_object") {
          diffBatch = generateOddObject(5, diff);
        } else if (game.slug === "logic") {
          diffBatch = generateSequence(5, diff);
        } else if (['reaction', 'stroop', 'card_match', 'card-match', 'sequence'].includes(game.slug)) {
          diffBatch = Array.from({ length: 5 }).map(() => ({
            correctAnswer: "none",
            content: {},
            options: []
          }));
        } else {
          // For trivia, generate a large pool (20 per difficulty = 60 total) to ensure department mix
          diffBatch = generateTrivia(20, diff);
        }

        // Attach difficulty to the generated items before flattening
        for (const gen of diffBatch) {
          generatedBatch.push({ ...gen, difficulty: diff });
        }
      }

      for (const gen of generatedBatch) {
        newQuestions.push({
          game_type_id: game.id,
          difficulty: gen.difficulty,
          content: gen.content,
          options: gen.options || [],
          correct_answer: gen.correctAnswer,
          base_xp: 100,
          is_active: true
        });
      }
    }

    if (newQuestions.length > 0) {
      // INJECT CUSTOM COMPANY TRIVIA HERE
      try {
        const { data: customTrivia } = await supabase
          .from("company_trivia")
          .select("*")
          .eq("target_date", today)
          .eq("is_active", true);

        if (customTrivia && customTrivia.length > 0) {
          const fallbackGameId = (activeGames || [])[0]?.id; // Just use any active game ID to satisfy the FK
          if (fallbackGameId) {
            for (const trivia of customTrivia) {
              newQuestions.push({
                game_type_id: fallbackGameId,
                difficulty: "medium",
                content: { question: trivia.question },
                options: trivia.options,
                correct_answer: trivia.correct_answer,
                base_xp: 200, // Bonus XP for company trivia!
                is_active: true
              });
            }
            console.log(`Injected ${customTrivia.length} custom company trivia questions!`);
          }
        }
      } catch (e) {
        console.error("Failed to inject custom trivia", e);
      }

      const { data: insertedQuestions, error: insertError } = await supabase
        .from("questions")
        .insert(newQuestions)
        .select("id, game_type_id, difficulty, content, options, base_xp, game_types (id, name, slug, is_active)");
        
      if (insertError) throw insertError;
      todaysQuestions = insertedQuestions || [];
    }
  }

  const allQuestions = todaysQuestions;

  if (!allQuestions || allQuestions.length === 0) {
    return { error: "No active questions available right now. Please check back later." };
  }

  // 3. We have questions! Let's create the session.
  const { data: session, error: sessionError } = await supabase
    .from("daily_sessions")
    .insert({
      user_id: user.id,
      date: today,
      allowed_duration_seconds: 600, // 10 mins
      is_completed: false
    })
    .select()
    .single();

  if (sessionError) throw sessionError;

  // 4. Group and assign questions
    // Group questions by game_type_id
    const questionsByGame: Record<string, any[]> = {};
    let cardMatchAdded = false;

    for (const q of allQuestions) {
      const gameTypes = q.game_types as any;
      const qSlug = Array.isArray(gameTypes) ? gameTypes[0]?.slug : gameTypes?.slug;

      // Department Filtering for Trivia
      if (qSlug === 'trivia') {
        const qDept = q.content?.department;
        // If the question has a department, it MUST be either General or match the user's department
        if (qDept && qDept !== "General" && qDept !== userDept) {
          continue;
        }
      }

      if (!questionsByGame[q.game_type_id]) {
        questionsByGame[q.game_type_id] = [];
      }
      
      // Limit concentration match to strictly 1 question per session total
      if (qSlug === 'card-match' || qSlug === 'card_match') {
        if (cardMatchAdded) continue;
        cardMatchAdded = true;
      }
      
      questionsByGame[q.game_type_id].push(q);
    }

    // Sort and select exactly 3 rounds per game (Easy -> Medium -> Hard)
    for (const gameId in questionsByGame) {
      const easyQs = questionsByGame[gameId].filter(q => q.difficulty === 'easy').sort(() => 0.5 - Math.random());
      const medQs = questionsByGame[gameId].filter(q => q.difficulty === 'medium').sort(() => 0.5 - Math.random());
      const hardQs = questionsByGame[gameId].filter(q => q.difficulty === 'hard').sort(() => 0.5 - Math.random());
      
      // Assign exactly 3 questions in escalating difficulty order
      questionsByGame[gameId] = [easyQs[0], medQs[0], hardQs[0]].filter(Boolean);
    }

    const selectedQuestions: any[] = [];
    // Shuffle the order of the games so it's not the exact same sequence every day
    const gameIds = Object.keys(questionsByGame).sort(() => 0.5 - Math.random());
    
    // Group them so the user plays Game A (Easy, Med, Hard), then Game B (Easy, Med, Hard)
    for (const gameId of gameIds) {
      selectedQuestions.push(...questionsByGame[gameId]);
    }

    const sessionQuestionsData = selectedQuestions.map((q, index) => ({
      session_id: session.id,
      question_id: q.id,
      order_index: index,
      is_completed: false
    }));

    await supabase.from("session_questions").insert(sessionQuestionsData);

  revalidatePath("/play");
  return { success: true, session };
}

export async function fetchSessionQuestions(sessionId: string) {
  const supabase = await createClient();
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

  // Map to the shape GameEngine expects, filtering out any missing joins
  const mappedQuestions = questions
    .filter((sq: any) => sq.questions && sq.questions.game_types)
    .map((sq: any) => ({
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
    
  // Dynamic Patching: Fix broken questions from older generation logic.
  return mappedQuestions.map(sq => {
    const slug = sq.question.game_type?.slug;
    if ((slug === "word-unscramble" || slug === "unscramble") && !sq.question.content?.scrambled) {
      sq.question.content = { scrambled: "YGNESRY" };
      sq.question.options = ["SYNERGY", "OFFICE", "LAPTOP", "MEETING"].sort(() => Math.random() - 0.5);
      sq.question.correct_answer = "SYNERGY";
    } else if (slug === "memory" && !sq.question.content?.text) {
      const seq = "3819";
      sq.question.content = { text: seq };
      sq.question.options = [];
      sq.question.correct_answer = seq;
    }
    return sq;
  });
}

export async function submitAnswer(
  sessionQuestionId: string, 
  answer: string, 
  timeSpentSeconds: number,
  options?: {
    customIsCorrect?: boolean;
    wasHintUsed?: boolean;
    isPerfect?: boolean;
    currentCombo?: number;
    isSkipped?: boolean;
    customScoreModifiers?: { mistakes?: number; customSpeedBonus?: number; accuracy?: number; baseScore?: number };
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Fetch the question details
  const { data: sq } = await supabase
    .from("session_questions")
    .select(`
      *,
      questions(correct_answer, base_xp, content, game_types(slug)),
      daily_sessions!inner(user_id)
    `)
    .eq("id", sessionQuestionId)
    .single();

  if (!sq) throw new Error("Question not found");
  if (sq.daily_sessions.user_id !== user.id) throw new Error("Unauthorized");
  if (sq.is_completed) return { error: "Already answered" };

  // Hotpatch check for correct answer
  const slug = sq.questions?.game_types?.slug;
  let dbCorrect = sq.questions.correct_answer.toString();
  
  if ((slug === "word-unscramble" || slug === "unscramble") && !(sq.questions.content as any)?.scrambled) {
    dbCorrect = "SYNERGY";
  } else if (slug === "memory" && !(sq.questions.content as any)?.text) {
    dbCorrect = "3819";
  }

  // Verify answer
  let isCorrect = false;
  if (options?.isSkipped) {
    isCorrect = false;
  } else if (options?.customIsCorrect !== undefined) {
    isCorrect = options.customIsCorrect;
  } else {
    isCorrect = dbCorrect.toLowerCase() === answer.toLowerCase();
  }
  
  // Advanced Scoring System
  let xpEarned = 0;
  const breakdown = {
    base: 0,
    speed: 0,
    noHint: 0,
    perfect: 0,
    combo: 0
  };

  if (options?.isSkipped) {
    xpEarned = -50;
    breakdown.base = -50;
  } else if (isCorrect) {
    const gameSlug = sq.questions.game_types?.slug;

    if (gameSlug === 'card-match' || gameSlug === 'card_match') {
      // 1. Base Score calculation (Base is 100, but subtract 5 for every mistake)
      const mistakes = options?.customScoreModifiers?.mistakes || 0;
      breakdown.base = Math.max(0, (sq.questions.base_xp || 100) - (mistakes * 5));

      // 2. Speed Bonus calculation
      const speedPoints = options?.customScoreModifiers?.customSpeedBonus !== undefined 
        ? options.customScoreModifiers.customSpeedBonus 
        : Math.max(0, 60 - timeSpentSeconds);
        
      breakdown.speed = Math.floor(speedPoints);
    } else if (gameSlug === 'typing-challenge' || gameSlug === 'typing') {
      // Typing Challenge: Calculate partial XP based on correct words percentage (accuracy)
      const accuracy = options?.customScoreModifiers?.accuracy !== undefined 
        ? options.customScoreModifiers.accuracy 
        : (options?.customScoreModifiers?.baseScore !== undefined ? options.customScoreModifiers.baseScore / 100 : 1);
        
      const maxBaseXp = sq.questions.base_xp || 100;
      breakdown.base = Math.max(0, Math.floor(maxBaseXp * accuracy));

      // Only give speed bonus if they got a perfect base score (100% accuracy)
      const speedPoints = options?.customScoreModifiers?.customSpeedBonus !== undefined 
        ? options.customScoreModifiers.customSpeedBonus 
        : (accuracy === 1 ? Math.max(0, 30 - timeSpentSeconds) : 0);
      breakdown.speed = Math.floor(speedPoints);
    } else {
      // Normal game logic
      breakdown.base = sq.questions.base_xp || 100;
      if (timeSpentSeconds <= 5) {
        breakdown.speed = 25;
      }
    }
    
    // No Hint: +20 XP (only for games that actually support hints)
    const noHintSlugs = ['reaction', 'stroop', 'typing', 'typing-challenge', 'card_match', 'card-match', 'sequence'];
    if (!options?.wasHintUsed && !noHintSlugs.includes(gameSlug)) {
      breakdown.noHint = 20;
    }

    // Perfect Puzzle: +50 XP
    if (options?.isPerfect) {
      breakdown.perfect = 50;
    }

    // Combo: +30 XP for stringing together correct answers
    if (options?.currentCombo && options.currentCombo > 0) {
      breakdown.combo = 30; // Alternatively, scale it: combo * 10
    }

    xpEarned = breakdown.base + breakdown.speed + breakdown.noHint + breakdown.perfect + breakdown.combo;
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

  return { 
    success: true, 
    isCorrect, 
    xpEarned, 
    correctAnswer: sq.questions.correct_answer,
    breakdown 
  };
}

export async function endSession(sessionId: string) {
  const supabase = await createClient();
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
      total_score: totalXp,
      total_xp_earned: totalXp,
      ended_at: new Date().toISOString()
    })
    .eq("id", sessionId);

  const { data: profile } = await supabase
    .from("profiles")
    .select("total_xp, current_streak, best_streak, games_played")
    .eq("id", user.id)
    .single();

  if (profile) {
    // If totalXp is negative, it's a penalty for skipping. Cap total_xp at 0.
    const newXp = Math.max(0, (profile.total_xp || 0) + totalXp);
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

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function startTestSession() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");
  
  // Mark any existing incomplete sessions as completed
  const { error: updateError } = await supabase
    .from("daily_sessions")
    .update({ is_completed: true })
    .eq("user_id", user.id)
    .eq("is_completed", false);
    
  if (updateError) throw new Error("Failed updating old sessions: " + JSON.stringify(updateError));

  const randomFutureDays = Math.floor(Math.random() * 10000) + 1;
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + randomFutureDays);
  const testDate = futureDate.toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];

  const { data: activeGames } = await supabase.from("game_types").select("*").eq("is_active", true);
  const activeGameIds = activeGames?.map((g) => g.id) || [];

  if (activeGameIds.length === 0) {
    return { error: "No active games available." };
  }

  // Fetch all questions for today
  let { data: todaysQuestions } = await supabase
    .from("questions")
    .select("id, game_type_id, difficulty, content, options, base_xp, game_types (id, name, slug, is_active)")
    .gte("created_at", `${today}T00:00:00Z`)
    .in("game_type_id", activeGameIds);

  if (!todaysQuestions || todaysQuestions.length === 0) {
    return { error: "No questions generated for today yet. Start a normal session first to generate them." };
  }

  const { data: session, error: sessionError } = await supabase
    .from("daily_sessions")
    .insert({
      user_id: user.id,
      date: testDate,
      allowed_duration_seconds: 3600,
      is_completed: false
    })
    .select()
    .single();

  if (sessionError) throw new Error("Failed creating test session: " + JSON.stringify(sessionError));

  const questionsByGame: Record<string, any[]> = {};
  for (const q of todaysQuestions) {
    if (!questionsByGame[q.game_type_id]) {
      questionsByGame[q.game_type_id] = [];
    }
    questionsByGame[q.game_type_id].push(q);
  }

  const selectedQuestions: any[] = [];
  const gameIds = Object.keys(questionsByGame).sort(() => 0.5 - Math.random());
  
  for (const gameId of gameIds) {
    if (questionsByGame[gameId].length > 0) {
      const randomIdx = Math.floor(Math.random() * questionsByGame[gameId].length);
      selectedQuestions.push(questionsByGame[gameId][randomIdx]);
    }
  }

  const sessionQuestionsData = selectedQuestions.map((q, index) => ({
    session_id: session.id,
    question_id: q.id,
    order_index: index,
    is_completed: false
  }));

  const { error: sqError } = await supabase.from("session_questions").insert(sessionQuestionsData);
  if (sqError) throw new Error("Failed inserting session questions: " + JSON.stringify(sqError));

  revalidatePath("/play");
  return { success: true, session };
}

export async function resetDailySession() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const today = new Date().toISOString().split('T')[0];
  
  // Delete the completed session for today
  await supabase
    .from("daily_sessions")
    .delete()
    .eq("user_id", user.id)
    .eq("date", today);
    
  revalidatePath("/dashboard");
  revalidatePath("/play");
  return { success: true };
}
