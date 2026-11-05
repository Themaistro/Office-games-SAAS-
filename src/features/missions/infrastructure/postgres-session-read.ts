import "server-only";
import { query as pgQuery } from "../../../server/database/connection";
import type { SessionQuestion } from "../../../types/game";
import {
  parseQuestionContent,
  parseAnswerOptions,
} from "../../challenges/domain/question-content";

export async function readMissionQuestions(sessionId: string, userId: string) {
  const { rows: questions } = await pgQuery(
    `
    SELECT sq.id, sq.session_id, sq.order_index, sq.is_completed, sq.outcome, sq.hint_used, sq.earned_xp, sq.question_id,
           q.id AS q_id, q.difficulty, q.content, q.options, q.base_xp, q.correct_answer,
           gt.id AS game_type_id, gt.name AS game_type_name, gt.slug AS game_type_slug,
           gt.description AS game_type_description
    FROM session_questions sq
    JOIN questions q ON q.id = sq.question_id
    JOIN game_types gt ON gt.id = q.game_type_id
    JOIN daily_sessions ds ON ds.id = sq.session_id
    WHERE sq.session_id = $1 AND ds.user_id = $2
    ORDER BY sq.order_index ASC
  `,
    [sessionId, userId],
  );

  // Map to the shape GameEngine expects, filtering out any missing joins
  const mappedQuestions = questions.map((sq: any) => ({
    id: sq.id,
    session_id: sq.session_id,
    order_index: sq.order_index,
    is_completed: sq.is_completed,
    outcome: sq.outcome,
    hint_used: sq.hint_used,
    earned_xp: sq.earned_xp,
    question_id: sq.question_id,
    question: {
      id: sq.q_id,
      game_type_id: sq.game_type_id,
      game_type: {
        id: sq.game_type_id,
        name: sq.game_type_name,
        slug: sq.game_type_slug,
        description: sq.game_type_description,
      },
      difficulty: sq.difficulty,
      content: parseQuestionContent(sq.content),
      options: parseAnswerOptions(sq.options),
      correct_answer: "",
      hint_options: sq.hint_used
        ? (sq.options || [])
            .filter((option: string) => option !== sq.correct_answer)
            .slice(0, 2)
        : [],
      base_xp: sq.base_xp,
    },
  })) as SessionQuestion[];

  // Dynamic Patching: Fix broken questions from older generation logic.
  return mappedQuestions.map((sq) => {
    const slug = sq.question.game_type?.slug;
    if (
      (slug === "word-unscramble" || slug === "unscramble") &&
      !sq.question.content?.scrambled
    ) {
      sq.question.content = { scrambled: "YGNESRY" };
      sq.question.options = ["SYNERGY", "OFFICE", "LAPTOP", "MEETING"].sort(
        () => Math.random() - 0.5,
      );
      sq.question.correct_answer = "";
    } else if (slug === "memory" && !sq.question.content?.text) {
      const seq = "3819";
      sq.question.content = { text: seq };
      sq.question.options = [];
      sq.question.correct_answer = "";
    }
    return sq;
  });
}
