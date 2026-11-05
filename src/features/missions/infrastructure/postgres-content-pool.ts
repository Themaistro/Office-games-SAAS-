import type { MissionGame } from "@/features/missions/domain/rotation";
import { freshCandidatesFirst } from "@/features/content/domain/content-selection";
import { withTransaction } from "@/server/database/connection";
import {
  generateMemory,
  generateMentalMath,
  generateMissingLetters,
  generateOddObject,
  generateSequence,
  generateSudokuLite,
  generateTargetNumber,
  generateTrivia,
  generateTypingChallenge,
  generateWordUnscramble,
} from "@/features/content/domain/game-content";
import * as pool from "./content-pool-queries";
import { randomUUID } from "node:crypto";
import "server-only";
import { createDailyLineupService } from "../application/daily-lineup";
import type { MissionStartRepository } from "../application/start-session";
import { postgresLineups } from "./postgres-lineups";
const getDailyMissionGames = createDailyLineupService(postgresLineups);

async function attachQuestionGameTypes(questions: any[] | null) {
  const rows = questions || [];
  const ids = [
    ...new Set(rows.map((question) => question.game_type_id).filter(Boolean)),
  ];
  if (ids.length === 0) return rows;
  const { data: gameTypes } = await pool.findGameTypes(ids);
  const byId = new Map(
    (gameTypes || []).map((gameType: any) => [gameType.id, gameType]),
  );
  return rows.map((question) => ({
    ...question,
    game_types: byId.get(question.game_type_id) || null,
  }));
}

export const assembleMissionContent: MissionStartRepository["assemble"] =
  async ({ user, profile, today, settings, games }) => {
    const userDept = profile?.department || "General";
    // Reuse this player's stable daily selection; recent routes guide rotation.
    const activeGames = games;

    if (!activeGames || activeGames.length === 0) {
      return {
        error: "No active games available right now. Please check back later.",
      };
    }

    const eligibleGames = activeGames;
    if (eligibleGames.length < (settings?.daily_game_count ?? 5)) {
      return {
        error:
          "The mission size exceeds the active game pool. Please ask an administrator to review game settings.",
      };
    }
    const missionGames = await getDailyMissionGames(
      today,
      eligibleGames as MissionGame[],
      settings?.daily_game_count ?? 5,
      user.id,
    );
    const activeGameIds = missionGames.map((game) => game.id);

    if (activeGameIds.length === 0) {
      return {
        error: "No active games available right now. Please check back later.",
      };
    }

    // Daily pools are explicitly tied to the player's local calendar date.

    let todaysQuestions: any[] = [];
    let page = 0;
    const pageSize = 1000;

    while (true) {
      const { data, error: qError } = await pool.findDailyPool(
        today,
        activeGameIds,
        page * pageSize,
        pageSize,
      );

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

    todaysQuestions = await attachQuestionGameTypes(todaysQuestions);

    // Find which games in today's route do NOT have any questions generated today.
    const existingGameIds = new Set(
      todaysQuestions?.map((q) => q.game_type_id) || [],
    );
    const missingGames = missionGames.filter(
      (game) => !existingGameIds.has(game.id),
    );

    // If any active games are missing questions, GENERATE them!
    if (missingGames.length > 0) {
      console.log(
        `Generating dynamic daily pool for ${missingGames.length} missing games for`,
        today,
      );
      const newQuestions = [];

      // Fetch master banks and system settings
      const [
        { data: masterTrivia },
        { data: masterWords },
        { data: masterTyping },
        { data: masterOdd },
        { data: generationSettings },
      ] = await Promise.all([
        pool.findTriviaBank(),
        pool.findWordBank(),
        pool.findTypingBank(),
        pool.findOddObjectBank(),
        pool.findGenerationSettings(),
      ]);

      const currentSeason = generationSettings?.current_season || 1;
      const seasonStart = generationSettings?.season_start_date
        ? new Date(generationSettings.season_start_date)
        : new Date();
      const daysSinceSeasonStart = Math.floor(
        (new Date().getTime() - seasonStart.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Offset calculation: (Season Number - 1) * 30 days + Days into current season
      const dayOffset = Math.max(
        0,
        (currentSeason - 1) * 30 + daysSinceSeasonStart,
      );

      for (const game of missingGames) {
        const difficulties: ("easy" | "medium" | "hard")[] = [
          "easy",
          "medium",
          "hard",
        ];
        const generatedBatch: any[] = [];

        difficulties.forEach((diff, diffIndex) => {
          let diffBatch: any[] = [];
          // Offset the dayOffset by diffIndex so easy/medium/hard don't pull the exact same slice if they fall back to the same master bank
          const sliceIndex = dayOffset * 3 + diffIndex;

          // Use a deterministic sort (by UUID) so that the sliceIndex correctly cycles through the bank day-by-day without random repeats
          const deterministicSort = (a: any, b: any) => (a.id > b.id ? 1 : -1);

          if (game.slug === "mental-math" || game.slug === "mental_math") {
            diffBatch = generateMentalMath(10, diff);
          } else if (
            game.slug === "word-unscramble" ||
            game.slug === "unscramble" ||
            game.slug === "word_unscramble"
          ) {
            const sortedWords = [...(masterWords || [])].sort(
              deterministicSort,
            );
            diffBatch = generateWordUnscramble(
              sortedWords,
              25,
              diff,
              sliceIndex,
            );
          } else if (
            game.slug === "typing-challenge" ||
            game.slug === "typing" ||
            game.slug === "typing_challenge"
          ) {
            const sortedTyping = [...(masterTyping || [])].sort(
              deterministicSort,
            );
            // Offer the entire tier so history can choose unseen passages rather
            // than repeating a small daily slice while fresh passages remain.
            diffBatch = generateTypingChallenge(
              sortedTyping,
              sortedTyping.length,
              diff,
              sliceIndex,
            );
          } else if (game.slug === "memory") {
            diffBatch = generateMemory(25, diff);
          } else if (
            game.slug === "sudoku_lite" ||
            game.slug === "sudoku-lite"
          ) {
            diffBatch = generateSudokuLite(10, diff);
          } else if (game.slug === "target-number" || game.slug === "math") {
            diffBatch = generateTargetNumber(10, diff);
          } else if (game.slug === "word") {
            const sortedWords = [...(masterWords || [])].sort(
              deterministicSort,
            );
            diffBatch = generateMissingLetters(
              sortedWords,
              10,
              diff,
              sliceIndex,
            );
          } else if (game.slug === "odd-object" || game.slug === "odd_object") {
            const sortedOdd = [...(masterOdd || [])].sort(deterministicSort);
            diffBatch = generateOddObject(
              sortedOdd,
              sortedOdd.length,
              diff,
              sliceIndex,
            );
          } else if (game.slug === "logic") {
            diffBatch = generateSequence(25, diff);
          } else if (
            [
              "reaction",
              "stroop",
              "card_match",
              "card-match",
              "sequence",
            ].includes(game.slug)
          ) {
            diffBatch = Array.from({ length: 25 }).map((_, index) => ({
              correctAnswer: "none",
              content: {
                seed: `${today}:${game.slug}:${diff}:${index}`,
                sourceKey: `${game.slug}:${today}:${diff}:${index}`,
                generated: true,
              },
              options: [],
            }));
          } else if (game.slug === "coding") {
            const codingTrivia = (masterTrivia || []).filter(
              (t: { department: string }) =>
                ["IT", "Engineering", "Product"].includes(t.department),
            );
            const sortedCoding = [...codingTrivia].sort(deterministicSort);
            diffBatch = generateTrivia(sortedCoding, 25, diff, sliceIndex);
          } else {
            // Specialist Coding items belong only to Coding. Keeping the pools
            // separate avoids a programming question appearing in General Trivia
            // and preserves the intended content variety across the mission.
            const generalTrivia = (masterTrivia || []).filter(
              (t: { department: string }) =>
                !["IT", "Engineering", "Product"].includes(t.department),
            );
            const sortedTrivia = [...generalTrivia].sort(deterministicSort);
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
            is_active: true,
            pool_date: today,
          });
        }
      }

      if (newQuestions.length > 0) {
        const { data: insertedQuestions, error: insertError } =
          await pool.insertPoolQuestions(newQuestions);

        if (insertError) {
          console.error("Failed inserting new questions:", insertError);
          throw new Error(
            "Failed generating today's questions due to database error.",
          );
        }

        // Append the newly generated questions to our pool for the session
        if (insertedQuestions) {
          todaysQuestions = [
            ...(todaysQuestions || []),
            ...(await attachQuestionGameTypes(insertedQuestions)),
          ];
        }
      }
    }

    // A generator bank may be empty in a fresh installation. Keep every active
    // game playable by falling back to its validated seed questions instead of
    // silently dropping that game from the daily mission.
    const pooledGameIds = new Set(todaysQuestions.map((q) => q.game_type_id));
    const fallbackGameIds = activeGameIds.filter(
      (id) => !pooledGameIds.has(id),
    );
    if (fallbackGameIds.length > 0) {
      const { data: fallbackQuestions } =
        await pool.findFallbackPool(fallbackGameIds);
      todaysQuestions = [
        ...todaysQuestions,
        ...(await attachQuestionGameTypes(fallbackQuestions)),
      ];
    }

    // ==========================================
    // INJECT CUSTOM COMPANY TRIVIA HERE
    // We do this every time to catch any trivia added AFTER the daily generation
    // ==========================================
    try {
      const existingCompanyTriviaIds = new Set(
        todaysQuestions
          .filter(
            (q) => q.content?.isCompanyTrivia && q.content?.companyTriviaId,
          )
          .map((q) => q.content.companyTriviaId),
      );

      const { data: todayTrivia } = await pool.findCompanyTrivia(
        today,
        userDept,
      );

      const { data: anytimeTrivia } = await pool.findCompanyTrivia(
        null,
        userDept,
      );

      // A mission has one company-trivia bonus. Scheduled items are preferred;
      // otherwise pick one eligible evergreen item and insert it at a random spot.
      const candidates =
        todayTrivia && todayTrivia.length > 0
          ? todayTrivia
          : anytimeTrivia || [];
      const existingBonus = todaysQuestions.find(
        (question) => question.content?.isCompanyTrivia,
      );
      const selectedBonus = existingBonus
        ? null
        : candidates[Math.floor(Math.random() * candidates.length)];
      const missingCustomTrivia =
        selectedBonus && !existingCompanyTriviaIds.has(selectedBonus.id)
          ? [selectedBonus]
          : [];

      if (missingCustomTrivia.length > 0) {
        const newCompanyQs = [];

        if (missionGames.length > 0) {
          for (const trivia of missingCustomTrivia) {
            // A company prompt belongs inside today's route, never as an extra
            // unplanned game. Prefer its configured game, then Trivia, then the
            // first game in the route.
            let targetGame = missionGames.find(
              (game) => game.slug === trivia.game_slug,
            );
            if (!targetGame)
              targetGame =
                missionGames.find((game) => game.slug === "trivia") ||
                missionGames[0];

            if (targetGame) {
              newCompanyQs.push({
                game_type_id: targetGame.id,
                difficulty: "medium",
                content: {
                  question: trivia.question,
                  text: trivia.question, // Support for math/logic games that expect .text
                  isCompanyTrivia: true,
                  companyTriviaId: trivia.id,
                  sourceKey: `company-trivia:${trivia.id}`,
                },
                options: trivia.options.sort(() => 0.5 - Math.random()),
                correct_answer: trivia.correct_answer,
                base_xp: 200,
                is_active: true,
                pool_date: today,
              });
            }
          }

          const { data: insertedQs, error: insertError } =
            await pool.insertPoolQuestions(newCompanyQs);

          if (!insertError && insertedQs) {
            console.log(
              `Injected ${insertedQs.length} new custom company trivia questions!`,
            );
            todaysQuestions = [
              ...(todaysQuestions || []),
              ...(await attachQuestionGameTypes(insertedQs)),
            ];
          } else if (insertError) {
            console.error(
              "PostgreSQL insert error for company trivia:",
              insertError,
            );
          }
        }
      }
    } catch (e) {
      console.error("Failed to inject custom trivia", e);
    }

    const allQuestions = todaysQuestions;

    if (!allQuestions || allQuestions.length === 0) {
      return {
        error:
          "No active questions available right now. Please check back later.",
      };
    }

    // Prefer questions this player has not seen in the last year. The fallback
    // is intentionally per game, so a small bank for one game cannot remove
    // that game from the daily mission entirely.
    const historySince = new Date(
      Date.now() - 365 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const { data: historyRows, error: historyError } =
      await pool.findQuestionHistory(user.id, historySince);

    if (historyError) {
      console.error("Failed to read question history:", historyError);
      return { error: "Could not prepare a fresh mission. Please try again." };
    }

    const seenQuestionIds = new Set<string>(
      (historyRows || []).map(
        (row: { question_id: string }) => row.question_id,
      ),
    );
    const seenContentKeys = new Set<string>(
      (historyRows || [])
        .map((row: { content_key: string }) => row.content_key)
        .filter(Boolean),
    );

    // 3. We have questions! Let's create the session.

    let session = {
      id: randomUUID(),
      user_id: user.id,
      date: today,
      allowed_duration_seconds: profile?.session_time_limit_minutes
        ? profile.session_time_limit_minutes * 60
        : (settings?.daily_time_limit_minutes ?? 15) * 60,
      is_completed: false,
      status: "in_progress",
      created_at: new Date().toISOString(),
    };

    // 4. Group and assign questions
    // Group questions by game_type_id
    const questionsByGame: Record<string, any[]> = {};
    const companyTriviaQuestions: any[] = [];
    const capacityErrors: string[] = [];

    for (const q of allQuestions) {
      if (q.content?.isCompanyTrivia) {
        companyTriviaQuestions.push(q);
        continue;
      }

      if (!questionsByGame[q.game_type_id]) {
        questionsByGame[q.game_type_id] = [];
      }
      questionsByGame[q.game_type_id].push(q);
    }

    for (const gameId in questionsByGame) {
      const orderedQuestions = freshCandidatesFirst(
        questionsByGame[gameId],
        seenQuestionIds,
        seenContentKeys,
      );
      const easyQs = orderedQuestions.filter((q) => q.difficulty === "easy");
      const medQs = orderedQuestions.filter((q) => q.difficulty === "medium");
      const hardQs = orderedQuestions.filter((q) => q.difficulty === "hard");
      const sampleQ = easyQs[0] || medQs[0] || hardQs[0];
      const gameTypes = sampleQ?.game_types as any;
      const gameTypesObj = Array.isArray(gameTypes) ? gameTypes[0] : gameTypes;

      const easyRounds = gameTypesObj?.easy_rounds ?? 1;
      const medRounds = gameTypesObj?.medium_rounds ?? 1;
      const hardRounds = gameTypesObj?.hard_rounds ?? 1;

      for (const [label, requested, available] of [
        ["easy", easyRounds, easyQs.length],
        ["medium", medRounds, medQs.length],
        ["hard", hardRounds, hardQs.length],
      ] as const) {
        if (requested > available)
          capacityErrors.push(
            `${gameTypesObj?.name || "Game"}: needs ${requested} ${label}, has ${available}`,
          );
      }

      questionsByGame[gameId] = [
        ...easyQs.slice(0, easyRounds),
        ...medQs.slice(0, medRounds),
        ...hardQs.slice(0, hardRounds),
      ].filter(Boolean);
    }

    if (capacityErrors.length > 0) {
      return {
        error: `Mission settings cannot be fulfilled. ${capacityErrors.join("; ")}`,
      };
    }

    const selectedQuestions: any[] = [];

    for (const game of missionGames) {
      if (!questionsByGame[game.id]?.length)
        capacityErrors.push(`${game.name}: no playable rounds available`);
    }
    if (capacityErrors.length > 0) {
      return {
        error: `Mission settings cannot be fulfilled. ${capacityErrors.join("; ")}`,
      };
    }

    // Preserve the engine's saved daily order.
    const gameIds = missionGames
      .map((game) => game.id)
      .filter((id) => questionsByGame[id]?.length);

    // Group them so the user plays Game A (Easy, Med, Hard), then Game B (Easy, Med, Hard)
    for (const gameId of gameIds) {
      selectedQuestions.push(...questionsByGame[gameId]);
    }

    // One company-trivia bonus appears at a random point without consuming a
    // configured round for Trivia or any other game.
    const freshCompanyTrivia = companyTriviaQuestions.filter(
      (question) => !seenQuestionIds.has(question.id),
    );
    const companyQuestion = freshCompanyTrivia[0] || companyTriviaQuestions[0];
    if (companyQuestion) {
      const randomIndex = Math.floor(
        Math.random() * (selectedQuestions.length + 1),
      );
      selectedQuestions.splice(randomIndex, 0, companyQuestion);
    }

    if (selectedQuestions.length === 0) {
      return {
        error:
          "No playable questions are available right now. Please ask an administrator to check the active game question pools.",
      };
    }

    const sessionQuestionsData = selectedQuestions.map((q, index) => ({
      session_id: session.id,
      question_id: q.id,
      order_index: index,
      is_completed: false,
    }));

    session = await withTransaction(async (client) => {
      // Assignments and their history either all exist or none exist.
      const { rows } = await client.query(
        "INSERT INTO daily_sessions(id,user_id,date,allowed_duration_seconds,is_completed) VALUES($1,$2,$3,$4,false) RETURNING *",
        [session.id, user.id, today, session.allowed_duration_seconds],
      );
      for (const item of sessionQuestionsData)
        await client.query(
          "INSERT INTO session_questions(session_id,question_id,order_index,is_completed) VALUES($1,$2,$3,false)",
          [session.id, item.question_id, item.order_index],
        );
      for (const q of selectedQuestions)
        await client.query(
          "INSERT INTO question_history(user_id,question_id,session_id,content_key) VALUES($1,$2,$3,$4)",
          [
            user.id,
            q.id,
            session.id,
            q.content?.sourceKey || q.content?.seed || `question:${q.id}`,
          ],
        );
      return rows[0];
    });

    return { success: true, session };
  };
