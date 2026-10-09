// @ts-nocheck
"use server";

import { createAdminClient, createClient } from "@/lib/pg-client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  generateTrivia,
  generateSudokuLite,
  generateCardMatch,
  generateSequence,
  generateWordUnscramble,
  generateTypingChallenge,
  generateMentalMath,
  generateTargetNumber,
  generateMissingLetters,
  generateOddObject,
  generateMemory
} from '@/lib/game-content';
import { SessionQuestion } from "@/types/game";
import { query as pgQuery } from "@/lib/db";

function getDateInTimezone(timezone?: string | null, date = new Date()) {
  const safeTimezone = timezone || "UTC";
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: safeTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }
}

async function attachQuestionGameTypes(dbClient: any, questions: any[] | null) {
  const rows = questions || [];
  const ids = [...new Set(rows.map((question) => question.game_type_id).filter(Boolean))];
  if (ids.length === 0) return rows;
  const { data: gameTypes } = await dbClient.from("game_types")
    .select("id, name, slug, is_active, easy_rounds, medium_rounds, hard_rounds")
    .in("id", ids);
  const byId = new Map((gameTypes || []).map((gameType: any) => [gameType.id, gameType]));
  return rows.map((question) => ({ ...question, game_types: byId.get(question.game_type_id) || null }));
}

export async function startDailySession() {
  const dbClient = await createClient();
  const { data: { user } } = await dbClient.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // Fetch the user's department for personalized content filtering
  const { data: profile } = await dbClient
    .from("profiles")
    .select("department, timezone, daily_time_limit_minutes, session_time_limit_minutes")
    .eq("id", user.id)
    .single();
  const userDept = profile?.department || "General";

  const today = getDateInTimezone(profile?.timezone);

  // 1.c Check if they reached their daily time limit
  const { data: todaysSessions } = await dbClient
    .from("daily_sessions")
    .select("time_spent_seconds")
    .eq("user_id", user.id)
    .gte("created_at", `${today}T00:00:00Z`);

  const totalTimeSpentTodaySeconds = todaysSessions?.reduce((acc, curr) => acc + (curr.time_spent_seconds || 0), 0) || 0;
  const totalTimeSpentTodayMinutes = Math.floor(totalTimeSpentTodaySeconds / 60);
  
  if (profile?.daily_time_limit_minutes && totalTimeSpentTodayMinutes >= profile.daily_time_limit_minutes) {
      return { 
        error: "daily_limit_reached", 
        message: `You have reached your daily limit of ${profile.daily_time_limit_minutes} minutes. Come back tomorrow!`,
      };
  }

  // 1.d Check if they have an active chess game
  const { data: activeChess } = await dbClient
    .from('chess_games')
    .select('id')
    .in('status', ['waiting', 'in_progress'])
    .or(`white_player_id.eq.${user.id},black_player_id.eq.${user.id}`)
    .limit(1);

  if (activeChess && activeChess.length > 0) {
    return { 
      error: "active_chess_game", 
      message: "You have an active chess game. Please finish or abandon it before starting a Daily Mission." 
    };
  }

  // 1. Check if they have an active (incomplete) session (could be normal or a test session)
  const { data: activeSessions } = await dbClient
    .from("daily_sessions")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_completed", false);

  if (activeSessions && activeSessions.length > 0) {
    const activeSession = activeSessions[0];
    
    // Check if this session is broken (0 questions)
    const { count } = await dbClient
      .from("session_questions")
      .select("*", { count: 'exact', head: true })
      .eq("session_id", activeSession.id);
      
    if (count && count > 0) {
      return { success: true, session: activeSession };
    } else {
      console.log("Broken session detected, deleting:", activeSession.id);
      await dbClient.from("daily_sessions").delete().eq("id", activeSession.id);
      // Let it fall through to create a new session
    }
  }

  // 1.b Check if they already completed a session within the last 24 hours
  const { data: lastSession } = await dbClient
    .from("daily_sessions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: settings } = await dbClient.from("system_settings").select("*").maybeSingle();

  if (lastSession && lastSession.is_completed) {
    const cooldownHours = settings?.cooldown_hours ?? 24;

    const createdAtTime = new Date(lastSession.created_at).getTime();
    const now = Date.now();
    const cooldownMs = cooldownHours * 60 * 60 * 1000;
    
    if (cooldownMs > 0 && now - createdAtTime < cooldownMs) {
      return { 
        error: "24_hour_cooldown", 
        message: `You must wait ${cooldownHours} hours between challenges.`,
        session: lastSession 
      };
    }
  }

  // 2. Fetch active games and ensure today's question pool is generated
  const { data: activeGames } = await dbClient.from("game_types").select("*").eq("is_active", true);
  const activeGameIds = activeGames?.map((g) => g.id) || [];

  if (activeGameIds.length === 0) {
    return { error: "No active games available right now. Please check back later." };
  }

  // Daily pools are explicitly tied to the player's local calendar date.
  
  let todaysQuestions: any[] = [];
  let page = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data, error: qError } = await dbClient
      .from("questions")
      .select("id, game_type_id, difficulty, content, options, base_xp, pool_date")
      .eq("pool_date", today)
      .in("game_type_id", activeGameIds)
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (qError) {
      console.error("Error fetching questions:", qError);
      return { error: "Failed to fetch questions. Please try again." };
    }

    if (data) {
      todaysQuestions.push(...data);
    }
    
    if (!data || data.length < pageSize) {
      break;
    }
    page++;
  }

  todaysQuestions = await attachQuestionGameTypes(dbClient, todaysQuestions);

  // Find which active games do NOT have any questions generated today
  const existingGameIds = new Set(todaysQuestions?.map(q => q.game_type_id) || []);
  const missingGames = activeGames?.filter(g => !existingGameIds.has(g.id)) || [];

  // If any active games are missing questions, GENERATE them!
  if (missingGames.length > 0) {
    console.log(`Generating dynamic daily pool for ${missingGames.length} missing games for`, today);
    const newQuestions = [];
    
    // Fetch master banks and system settings
    const [{ data: masterTrivia }, { data: masterWords }, { data: masterTyping }, { data: masterOdd }, { data: settings }] = await Promise.all([
      dbClient.from('master_trivia_bank').select('*'),
      dbClient.from('master_word_bank').select('*'),
      dbClient.from('master_typing_bank').select('*'),
      dbClient.from('master_odd_object_bank').select('*'),
      dbClient.from('system_settings').select('*').single()
    ]);

    const currentSeason = settings?.current_season || 1;
    const seasonStart = settings?.season_start_date ? new Date(settings.season_start_date) : new Date();
    const daysSinceSeasonStart = Math.floor((new Date().getTime() - seasonStart.getTime()) / (1000 * 60 * 60 * 24));
    
    // Offset calculation: (Season Number - 1) * 30 days + Days into current season
    const dayOffset = Math.max(0, ((currentSeason - 1) * 30) + daysSinceSeasonStart);

    for (const game of missingGames) {
      const difficulties: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'hard'];
      const generatedBatch: any[] = [];
      
      difficulties.forEach((diff, diffIndex) => {
        let diffBatch: any[] = [];
        // Offset the dayOffset by diffIndex so easy/medium/hard don't pull the exact same slice if they fall back to the same master bank
        const sliceIndex = dayOffset * 3 + diffIndex; 

        // Use a deterministic sort (by UUID) so that the sliceIndex correctly cycles through the bank day-by-day without random repeats
        const deterministicSort = (a: any, b: any) => (a.id > b.id ? 1 : -1);

        if (game.slug === "mental-math" || game.slug === "mental_math") {
          diffBatch = generateMentalMath(10, diff);
        } else if (game.slug === "word-unscramble" || game.slug === "unscramble" || game.slug === "word_unscramble") {
          const sortedWords = [...(masterWords || [])].sort(deterministicSort);
          diffBatch = generateWordUnscramble(sortedWords, 25, diff, sliceIndex);
        } else if (game.slug === "typing-challenge" || game.slug === "typing" || game.slug === "typing_challenge") {
          const sortedTyping = [...(masterTyping || [])].sort(deterministicSort);
          diffBatch = generateTypingChallenge(sortedTyping, 25, diff, sliceIndex);
        } else if (game.slug === "memory") {
          diffBatch = generateMemory(25, diff);
        } else if (game.slug === "sudoku_lite" || game.slug === "sudoku-lite") {
          diffBatch = generateSudokuLite(10, diff);
        } else if (game.slug === "target-number" || game.slug === "math") {
          diffBatch = generateTargetNumber(10, diff);
        } else if (game.slug === "word") {
          const sortedWords = [...(masterWords || [])].sort(deterministicSort);
          diffBatch = generateMissingLetters(sortedWords, 10, diff, sliceIndex);
        } else if (game.slug === "odd-object" || game.slug === "odd_object") {
          const sortedOdd = [...(masterOdd || [])].sort(deterministicSort);
          diffBatch = generateOddObject(sortedOdd, 25, diff, sliceIndex);
        } else if (game.slug === "logic") {
          diffBatch = generateSequence(25, diff);
        } else if (['reaction', 'stroop', 'card_match', 'card-match', 'sequence'].includes(game.slug)) {
          diffBatch = Array.from({ length: 25 }).map(() => ({
            correctAnswer: "none",
            content: {},
            options: []
          }));
        } else if (game.slug === "coding") {
          const codingTrivia = (masterTrivia || []).filter(t => ['IT', 'Engineering', 'Product'].includes(t.department));
          const sortedCoding = [...codingTrivia].sort(deterministicSort);
          diffBatch = generateTrivia(sortedCoding, 25, diff, sliceIndex);
        } else {
          const sortedTrivia = [...(masterTrivia || [])].sort(deterministicSort);
          diffBatch = generateTrivia(sortedTrivia, 50, diff, sliceIndex);
        }

        for (const gen of diffBatch) {
          generatedBatch.push({ ...gen, difficulty: diff });
        }
      });

      for (const gen of generatedBatch) {
        newQuestions.push({
          game_type_id: game.id,
          difficulty: gen.difficulty,
          content: gen.content,
          options: gen.options || [],
          correct_answer: gen.correctAnswer,
          base_xp: 100,
          is_active: true
          ,pool_date: today
        });
      }
    }

    if (newQuestions.length > 0) {
      // Use admin client to bypass RLS for inserting questions (since regular users can't create questions)
      const { createClient: createDbClient } = await import('@/lib/pg-client');
      const adminClient = createDbClient();

      const { data: insertedQuestions, error: insertError } = await adminClient
        .from("questions")
        .insert(newQuestions)
        .select("id, game_type_id, difficulty, content, options, base_xp");
        
      if (insertError) {
        console.error("Failed inserting new questions:", insertError);
        throw new Error("Failed generating today's questions due to database error.");
      }
      
      // Append the newly generated questions to our pool for the session
      if (insertedQuestions) {
        todaysQuestions = [...(todaysQuestions || []), ...(await attachQuestionGameTypes(dbClient, insertedQuestions))];
      }
    }
  }

  // A generator bank may be empty in a fresh installation. Keep every active
  // game playable by falling back to its validated seed questions instead of
  // silently dropping that game from the daily mission.
  const pooledGameIds = new Set(todaysQuestions.map(q => q.game_type_id));
  const fallbackGameIds = activeGameIds.filter(id => !pooledGameIds.has(id));
  if (fallbackGameIds.length > 0) {
    const { data: fallbackQuestions } = await dbClient
      .from("questions")
      .select("id, game_type_id, difficulty, content, options, base_xp")
      .in("game_type_id", fallbackGameIds)
      .eq("is_active", true);
    todaysQuestions = [...todaysQuestions, ...(await attachQuestionGameTypes(dbClient, fallbackQuestions))];
  }

  // ==========================================
  // INJECT CUSTOM COMPANY TRIVIA HERE
  // We do this every time to catch any trivia added AFTER the daily generation
  // ==========================================
  try {
    const { createClient: createDbClient } = await import('@/lib/pg-client');
    const adminClient = createDbClient();
    
    const { data: triviaGameType } = await dbClient.from("game_types").select("*").eq("slug", "trivia").single();
    
    const { data: profile } = await dbClient.from("profiles").select("department").eq("id", user.id).single();
    const userDept = profile?.department || "General";
    
    const existingCompanyTriviaIds = new Set(
      todaysQuestions
        .filter(q => q.content?.isCompanyTrivia && q.content?.companyTriviaId)
        .map(q => q.content.companyTriviaId)
    );

    const { data: todayTrivia } = await adminClient
      .from("company_trivia")
      .select("*")
      .eq("target_date", today)
      .in("department", ["General", userDept])
      .eq("is_active", true);

    const { data: anytimeTrivia } = await adminClient
      .from("company_trivia")
      .select("*")
      .is("target_date", null)
      .in("department", ["General", userDept])
      .eq("is_active", true);

    const customTrivia = [...(todayTrivia || [])];
    
    if (anytimeTrivia && anytimeTrivia.length > 0) {
      const randomAnytime = anytimeTrivia[Math.floor(Math.random() * anytimeTrivia.length)];
      customTrivia.push(randomAnytime);
    }

    const missingCustomTrivia = customTrivia.filter(t => !existingCompanyTriviaIds.has(t.id));

    if (missingCustomTrivia.length > 0) {
      const newCompanyQs = [];
      
      if (activeGames && activeGames.length > 0) {
        for (const trivia of missingCustomTrivia) {
          // Match by game_slug, fallback to trivia, then to the first active game
          let targetGame = activeGames.find(g => g.slug === trivia.game_slug);
          if (!targetGame) targetGame = activeGames.find(g => g.slug === 'trivia') || activeGames[0];

          if (targetGame) {
            newCompanyQs.push({
              game_type_id: targetGame.id,
              difficulty: "medium",
              content: {
                question: trivia.question,
                text: trivia.question, // Support for math/logic games that expect .text
                isCompanyTrivia: true,
                companyTriviaId: trivia.id
              },
              options: trivia.options.sort(() => 0.5 - Math.random()),
              correct_answer: trivia.correct_answer,
              base_xp: 200,
              is_active: true,
              pool_date: today
            });
          }
        }
        
        // adminClient is already created above

        const { data: insertedQs, error: insertError } = await adminClient
          .from("questions")
          .insert(newCompanyQs)
          .select("id, game_type_id, difficulty, content, options, base_xp");
          
        if (!insertError && insertedQs) {
          console.log(`Injected ${insertedQs.length} new custom company trivia questions!`);
          todaysQuestions = [...(todaysQuestions || []), ...(await attachQuestionGameTypes(dbClient, insertedQs))];
        } else if (insertError) {
          console.error("PostgreSQL insert error for company trivia:", insertError);
        }
      }
    }
  } catch (e) {
    console.error("Failed to inject custom trivia", e);
  }

  const allQuestions = todaysQuestions;

  if (!allQuestions || allQuestions.length === 0) {
    return { error: "No active questions available right now. Please check back later." };
  }

  // Prefer questions this player has not seen in the last year. The fallback
  // is intentionally per game, so a small bank for one game cannot remove
  // that game from the daily mission entirely.
  const historySince = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
  const { data: historyRows, error: historyError } = await dbClient
    .from("question_history")
    .select("question_id")
    .eq("user_id", user.id)
    .gte("served_at", historySince);

  if (historyError) {
    console.error("Failed to read question history:", historyError);
    return { error: "Could not prepare a fresh mission. Please try again." };
  }

  const seenQuestionIds = new Set((historyRows || []).map((row) => row.question_id));

  // 3. We have questions! Let's create the session.
  
  // If we reached here and there's already a session for today (which means cooldown is 0 for testing),
  // we must delete it to prevent a PostgreSQL unique constraint violation (23505) on (user_id, date).
  // We use adminClient because normal users do not have DELETE permissions via RLS on daily_sessions.
  const { createClient: createDbClient } = await import('@/lib/pg-client');
  const adminClient = createDbClient();
  await adminClient.from("daily_sessions").delete().eq("user_id", user.id).eq("date", today);

  const { data: session, error: sessionError } = await dbClient
    .from("daily_sessions")
    .insert({
      user_id: user.id,
      date: today,
      allowed_duration_seconds: profile?.session_time_limit_minutes ? (profile.session_time_limit_minutes * 60) : ((settings?.daily_time_limit_minutes ?? 15) * 60),
      is_completed: false
    })
    .select()
    .single();

  if (sessionError) throw sessionError;

  // 4. Group and assign questions
    // Group questions by game_type_id
    const questionsByGame: Record<string, any[]> = {};
    const cardMatchAdded = false;

    for (const q of allQuestions) {
      const gameTypes = q.game_types as any;
      const qSlug = Array.isArray(gameTypes) ? gameTypes[0]?.slug : gameTypes?.slug;

      // Department filtering is disabled to prevent repeating questions
      if (qSlug === 'trivia') {
        // We now allow all trivia questions into the global pool
      }

      if (!questionsByGame[q.game_type_id]) {
        questionsByGame[q.game_type_id] = [];
      }
      questionsByGame[q.game_type_id].push(q);
    }

    for (const gameId in questionsByGame) {
      const gameQuestions = questionsByGame[gameId];
      const freshQuestions = gameQuestions.filter(q => !seenQuestionIds.has(q.id));
      const eligibleQuestions = freshQuestions.length > 0 ? freshQuestions : gameQuestions;
      const easyQs = eligibleQuestions.filter(q => q.difficulty === 'easy').sort(() => 0.5 - Math.random());
      const medQs = eligibleQuestions.filter(q => q.difficulty === 'medium').sort(() => 0.5 - Math.random());
      const hardQs = eligibleQuestions.filter(q => q.difficulty === 'hard').sort(() => 0.5 - Math.random());
      const sampleQ = easyQs[0] || medQs[0] || hardQs[0];
      const gameTypes = sampleQ?.game_types as any;
      const gameTypesObj = Array.isArray(gameTypes) ? gameTypes[0] : gameTypes;
      
      const easyRounds = gameTypesObj?.easy_rounds ?? 1;
      const medRounds = gameTypesObj?.medium_rounds ?? 1;
      const hardRounds = gameTypesObj?.hard_rounds ?? 1;

      questionsByGame[gameId] = [
        ...easyQs.slice(0, easyRounds),
        ...medQs.slice(0, medRounds),
        ...hardQs.slice(0, hardRounds)
      ].filter(Boolean);
    }

    const selectedQuestions: any[] = [];
    const companyTriviaQuestions: any[] = [];
    
    // Shuffle the order of the games completely randomly for every single session!
    const gameIds = Object.keys(questionsByGame).sort(() => 0.5 - Math.random());
    
    // Play all active games instead of limiting to 10
    // gameIds = gameIds.slice(0, 10);
    
    // Group them so the user plays Game A (Easy, Med, Hard), then Game B (Easy, Med, Hard)
    for (const gameId of gameIds) {
      for (const q of questionsByGame[gameId]) {
        // If it's a company trivia question, separate it so it doesn't get limited out
        if (q.content?.isCompanyTrivia) {
          companyTriviaQuestions.push(q);
        } else {
          selectedQuestions.push(q);
        }
      }
    }

    // Now scan through ALL questions to find any company trivia that was missed because its gameId was sliced out
    for (const q of allQuestions) {
      if (q.content?.isCompanyTrivia && !seenQuestionIds.has(q.id) && !companyTriviaQuestions.some(ct => ct.id === q.id)) {
        companyTriviaQuestions.push(q);
      }
    }

    // Randomly disperse the company trivia questions throughout the sequence 
    // rather than forcing them at the beginning.
    for (const companyQ of companyTriviaQuestions) {
      const randomIndex = Math.floor(Math.random() * (selectedQuestions.length + 1));
      selectedQuestions.splice(randomIndex, 0, companyQ);
    }

    const sessionQuestionsData = selectedQuestions.map((q, index) => ({
      session_id: session.id,
      question_id: q.id,
      order_index: index,
      is_completed: false
    }));

    const { error: questionInsertError } = await dbClient.from("session_questions").insert(sessionQuestionsData);
    if (questionInsertError) {
      await adminClient.from("daily_sessions").delete().eq("id", session.id).eq("user_id", user.id);
      throw questionInsertError;
    }

    const { error: historyInsertError } = await adminClient.from("question_history").insert(
      selectedQuestions.map((q) => ({
        user_id: user.id,
        question_id: q.id,
        session_id: session.id,
      }))
    );
    if (historyInsertError) {
      await adminClient.from("daily_sessions").delete().eq("id", session.id).eq("user_id", user.id);
      throw new Error("Could not record question history");
    }

  revalidatePath("/play");
  return { success: true, session };
}

export async function fetchSessionQuestions(sessionId: string) {
  const { rows: questions } = await pgQuery(`
    SELECT sq.id, sq.session_id, sq.order_index, sq.is_completed, sq.question_id,
           q.id AS q_id, q.difficulty, q.content, q.options, q.base_xp, q.correct_answer,
           gt.id AS game_type_id, gt.name AS game_type_name, gt.slug AS game_type_slug,
           gt.description AS game_type_description
    FROM session_questions sq
    JOIN questions q ON q.id = sq.question_id
    JOIN game_types gt ON gt.id = q.game_type_id
    WHERE sq.session_id = $1
    ORDER BY sq.order_index ASC
  `, [sessionId]);

  // Map to the shape GameEngine expects, filtering out any missing joins
  const mappedQuestions = questions.map((sq: any) => ({
      id: sq.id,
      session_id: sq.session_id,
      order_index: sq.order_index,
      is_completed: sq.is_completed,
      question_id: sq.question_id,
      question: {
        id: sq.q_id,
        game_type_id: sq.game_type_id,
        game_type: { id: sq.game_type_id, name: sq.game_type_name, slug: sq.game_type_slug, description: sq.game_type_description },
        difficulty: sq.difficulty,
        content: sq.content,
        options: sq.options,
        correct_answer: sq.correct_answer,
        base_xp: sq.base_xp,
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
  const dbClient = await createClient();
  const { data: { user } } = await dbClient.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Fetch the question details with explicit joins. The local PostgreSQL adapter
  // does not support Supabase's nested relation projection syntax.
  const { rows } = await pgQuery<{
    id: string;
    is_completed: boolean;
    correct_answer: string;
    base_xp: number;
    content: Record<string, unknown> | null;
    game_slug: string;
    user_id: string;
  }>(
    `SELECT sq.id, sq.is_completed, q.correct_answer, q.base_xp, q.content,
            gt.slug AS game_slug, ds.user_id
     FROM session_questions sq
     JOIN questions q ON q.id = sq.question_id
     JOIN game_types gt ON gt.id = q.game_type_id
     JOIN daily_sessions ds ON ds.id = sq.session_id
     WHERE sq.id = $1
     LIMIT 1`,
    [sessionQuestionId]
  );
  const row = rows[0];
  const sq = row ? {
    ...row,
    questions: {
      correct_answer: row.correct_answer,
      base_xp: row.base_xp,
      content: row.content,
      game_types: { slug: row.game_slug },
    },
    daily_sessions: { user_id: row.user_id },
  } : null;

  if (!sq) throw new Error("Question not found");
  if (sq.daily_sessions.user_id !== user.id) throw new Error("Unauthorized");
  if (sq.is_completed) return { error: "Already answered" };
  if (!Number.isFinite(timeSpentSeconds) || timeSpentSeconds < 0 || timeSpentSeconds > 3600) {
    throw new Error("Invalid answer timing");
  }
  // Browser timers can report fractional seconds, while PostgreSQL stores this
  // column as an integer. Keep scoring precise but persist a safe whole number.
  const persistedTimeSpentSeconds = Math.round(timeSpentSeconds);

  // Hotpatch check for correct answer
  const slug = sq.questions?.game_types?.slug;
  let dbCorrect = sq.questions.correct_answer.toString();
  
  if ((slug === "word-unscramble" || slug === "unscramble") && !(sq.questions.content as any)?.scrambled) {
    dbCorrect = "SYNERGY";
  } else if (slug === "memory" && !(sq.questions.content as any)?.text) {
    dbCorrect = "3819";
  }

  // Interaction-driven games do not have a meaningful textual answer. Their
  // game component reports the validated result of the interaction instead.
  const interactionGames = new Set([
    "reaction", "stroop", "typing", "typing-challenge", "sequence",
    "card_match", "card-match", "sudoku_lite", "sudoku-lite",
    "odd_object", "odd-object", "memory", "mental_math", "mental-math",
    "math", "logic", "word", "unscramble", "word-unscramble"
  ]);
  let isCorrect = false;
  if (options?.isSkipped) {
    isCorrect = false;
  } else if (interactionGames.has(slug)) {
    isCorrect = options?.customIsCorrect === true;
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
      const mistakes = Math.min(100, Math.max(0, Math.floor(options?.customScoreModifiers?.mistakes || 0)));
      breakdown.base = Math.max(0, (sq.questions.base_xp || 100) - (mistakes * 5));

      // 2. Speed Bonus calculation
      breakdown.speed = Math.floor(Math.max(0, 60 - timeSpentSeconds));
    } else if (gameSlug === 'typing-challenge' || gameSlug === 'typing') {
      // Typing Challenge: Calculate partial XP based on correct words percentage (accuracy)
      const accuracy = Math.min(1, Math.max(0, Number(options?.customScoreModifiers?.accuracy ?? 1)));
        
      const maxBaseXp = sq.questions.base_xp || 100;
      breakdown.base = Math.max(0, Math.floor(maxBaseXp * accuracy));

      // Only give speed bonus if they got a perfect base score (100% accuracy)
      breakdown.speed = accuracy === 1 ? Math.floor(Math.max(0, 30 - timeSpentSeconds)) : 0;
    } else {
      // Normal game logic
      breakdown.base = sq.questions.base_xp || 100;
      if (timeSpentSeconds <= 5) {
        breakdown.speed = 25;
      }
    }
    
    // No Hint: +20 XP (only for games that actually support hints)
    const noHintSlugs = ['reaction', 'stroop', 'typing', 'typing-challenge', 'sequence'];
    if (!options?.wasHintUsed && !noHintSlugs.includes(gameSlug)) {
      breakdown.noHint = 20;
    }

    // Perfect Puzzle: +50 XP
    if (options?.isPerfect && !options?.wasHintUsed) {
      breakdown.perfect = 50;
    }

    // Combo: Scale +15 XP for stringing together correct answers
    if (options?.currentCombo && options.currentCombo > 0) {
      breakdown.combo = Math.min(5, Math.floor(options.currentCombo)) * 15;
    }

    xpEarned = breakdown.base + breakdown.speed + breakdown.noHint + breakdown.perfect + breakdown.combo;
  }

  // Update session_questions
  const { data: completedQuestion, error: completeError } = await dbClient
    .from("session_questions")
    .update({
      is_completed: true,
      earned_xp: xpEarned,
      time_spent_seconds: persistedTimeSpentSeconds
    })
    .eq("id", sessionQuestionId)
    .eq("is_completed", false)
    .select("id")
    .maybeSingle();

  if (completeError) throw new Error("Could not save answer");
  if (!completedQuestion) return { error: "Already answered" };

  return { 
    success: true, 
    isCorrect, 
    xpEarned, 
    correctAnswer: sq.questions.correct_answer,
    breakdown 
  };
}

export async function endSession(sessionId: string) {
  const dbClient = await createClient();
  const { data: { user } } = await dbClient.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: session } = await dbClient
    .from("daily_sessions")
    .select("id, user_id, is_completed")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!session) throw new Error("Session not found");
  if (session.is_completed) return { error: "Session already completed" };

  const { data: questions } = await dbClient
    .from("session_questions")
    .select("earned_xp, is_completed")
    .eq("session_id", sessionId);

  const { data: profile } = await dbClient
    .from("profiles")
    .select("total_xp, current_streak, best_streak, games_played")
    .eq("id", user.id)
    .single();

  const baseTotalXp = questions?.reduce((sum, q) => sum + (q.earned_xp || 0), 0) || 0;

  let newStreak = 1;
  let streakBonus = 0;
  if (profile) {
    newStreak = (profile.current_streak || 0) + 1;
    // Award 50 XP per day of the streak (e.g., 2-day streak = 100 XP, 3-day = 150 XP)
    streakBonus = newStreak > 1 ? newStreak * 50 : 0;
  }

  const finalTotalXp = baseTotalXp + streakBonus;

  const { data: completedSession, error: completeSessionError } = await dbClient
    .from("daily_sessions")
    .update({
      is_completed: true,
      total_score: baseTotalXp,
      total_xp_earned: finalTotalXp,
      ended_at: new Date().toISOString()
    })
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .eq("is_completed", false)
    .select("id")
    .maybeSingle();

  if (completeSessionError) throw new Error("Could not complete session");
  if (!completedSession) return { error: "Session already completed" };

  if (profile) {
    // If finalTotalXp is negative, it's a penalty for skipping. Cap total_xp at 0.
    const newXp = Math.max(0, (profile.total_xp || 0) + finalTotalXp);
    const newGamesPlayed = (profile.games_played || 0) + 1;
    const newBestStreak = Math.max(profile.best_streak || 0, newStreak);
    const newLevel = Math.floor(newXp / 1200) + 1;

    const adminClient = createAdminClient();
    const { error: profileUpdateError } = await adminClient
      .from("profiles")
      .update({
        total_xp: newXp,
        games_played: newGamesPlayed,
        current_streak: newStreak,
        best_streak: newBestStreak,
        current_level: newLevel,
        last_played_at: new Date().toISOString()
      })
      .eq("id", user.id);

    if (profileUpdateError) {
      throw new Error("Could not update player progress");
    }
      
    const activityRows = [{
      user_id: user.id,
      activity_type: "mission",
      metadata: { description: `completed a Daily Mission with a score of ${baseTotalXp} and earned ${finalTotalXp} XP`, score: baseTotalXp, xp: finalTotalXp, streak: newStreak, session_id: sessionId }
    }];
    if (baseTotalXp >= 4000) activityRows.push({
      user_id: user.id,
      activity_type: "achievement",
      metadata: { description: `finished a Daily Mission with a high score of ${baseTotalXp}`, score: baseTotalXp }
    });
    if (newLevel > (Math.floor((profile.total_xp || 0) / 1200) + 1)) activityRows.push({
      user_id: user.id,
      activity_type: "achievement",
      metadata: { description: `reached Level ${newLevel}`, level: newLevel }
    });
    await adminClient.from("activity_feed").insert(activityRows);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function resetDailySession() {
  const dbClient = await createClient();
  const { data: { user } } = await dbClient.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data: resetProfile } = await dbClient
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .maybeSingle();
  const today = getDateInTimezone(resetProfile?.timezone);
  
  // Use service role key to bypass RLS for deletion
  const { createClient: createDbClient } = await import('@/lib/pg-client');
  const adminClient = createDbClient();
  
  // Fetch the session before we delete it to see if we need to roll back stats
  const { data: sessionToReset } = await adminClient
    .from("daily_sessions")
    .select("is_completed, total_xp_earned")
    .eq("user_id", user.id)
    .eq("date", today)
    .maybeSingle();

  if (sessionToReset && sessionToReset.is_completed) {
    const { data: profile } = await adminClient.from("profiles").select("*").eq("id", user.id).single();
    if (profile) {
      const xpToDeduct = sessionToReset.total_xp_earned || 0;
      await adminClient.from("profiles").update({
        total_xp: Math.max(0, (profile.total_xp || 0) - xpToDeduct),
        games_played: Math.max(0, (profile.games_played || 0) - 1),
        current_streak: Math.max(0, (profile.current_streak || 0) - 1)
      }).eq("id", user.id);
    }
  }

  // Delete the session for today
  await adminClient
    .from("daily_sessions")
    .delete()
    .eq("user_id", user.id)
    .eq("date", today);
    
  revalidatePath("/dashboard");
  revalidatePath("/play");
  return { success: true };
}

