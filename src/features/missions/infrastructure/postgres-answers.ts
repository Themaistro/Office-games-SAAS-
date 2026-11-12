import "server-only";
import { query, withTransaction } from "../../../server/database/connection";
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
  complete: (id, values) =>
    withTransaction(async (client) => {
      // Use the same lock as settlement: an answer cannot arrive after the
      // finisher has read the questions and settled the mission.
      await client.query(
        `SELECT ds.id FROM daily_sessions ds JOIN session_questions sq ON sq.session_id=ds.id
         WHERE sq.id=$1 FOR UPDATE OF ds`,
        [id],
      );
      const saved = await client.query(
        `UPDATE session_questions sq SET is_completed=true,outcome=$1,earned_xp=$2,time_spent_seconds=$3
         FROM daily_sessions ds WHERE sq.id=$4 AND sq.is_completed=false AND ds.id=sq.session_id
         AND ds.status='in_progress'
         AND clock_timestamp()<ds.created_at+ds.allowed_duration_seconds*interval '1 second'
         AND NOT EXISTS (SELECT 1 FROM session_questions previous WHERE previous.session_id=sq.session_id
                         AND previous.order_index<sq.order_index AND previous.is_completed=false)
         RETURNING sq.id`,
        [values.outcome, values.earnedXp, values.seconds, id],
      );
      return Boolean(saved.rowCount);
    }),
};
