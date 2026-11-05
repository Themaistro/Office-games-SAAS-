import "server-only";
import { query } from "../../../server/database/connection";
import type {
  AnswerRepository,
  AttemptSnapshot,
} from "../application/answer-session";

export const postgresAnswers: AnswerRepository = {
  find: async (id) =>
    (
      await query<AttemptSnapshot>(
        `SELECT sq.id,sq.is_completed,sq.hint_used,q.id AS question_id,q.difficulty,q.correct_answer,q.base_xp,q.content,
    gt.slug AS game_slug,ds.user_id,ds.status AS session_status,ds.created_at AS session_created_at,ds.allowed_duration_seconds
    FROM session_questions sq JOIN questions q ON q.id=sq.question_id JOIN game_types gt ON gt.id=q.game_type_id
    JOIN daily_sessions ds ON ds.id=sq.session_id WHERE sq.id=$1`,
        [id],
      )
    ).rows[0] ?? null,
  earlierPending: async (id) =>
    Boolean(
      (
        await query(
          `SELECT 1 FROM session_questions previous JOIN session_questions target ON target.session_id=previous.session_id
    WHERE target.id=$1 AND previous.order_index<target.order_index AND previous.is_completed=false LIMIT 1`,
          [id],
        )
      ).rowCount,
    ),
  complete: async (id, values) =>
    Boolean(
      (
        await query(
          `UPDATE session_questions SET is_completed=true,outcome=$1,earned_xp=$2,time_spent_seconds=$3
    WHERE id=$4 AND is_completed=false RETURNING id`,
          [values.outcome, values.earnedXp, values.seconds, id],
        )
      ).rowCount,
    ),
};
