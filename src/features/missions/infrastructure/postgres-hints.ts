import "server-only";
import { withTransaction } from "../../../server/database/connection";
import type { HintRepository } from "../application/hint-session";
import type { DailyMissionSession } from "../domain/session";

export const postgresHints: HintRepository = {
  locked: (id, userId, work) =>
    withTransaction(async (client) => {
      const session =
        (
          await client.query<DailyMissionSession>(
            "SELECT ds.* FROM daily_sessions ds JOIN session_questions sq ON sq.session_id=ds.id WHERE sq.id=$1 AND ds.user_id=$2 FOR UPDATE OF ds",
            [id, userId],
          )
        ).rows[0] ?? null;
      const slug =
        (
          await client.query<{ slug: string }>(
            "SELECT gt.slug FROM session_questions sq JOIN questions q ON q.id=sq.question_id JOIN game_types gt ON gt.id=q.game_type_id WHERE sq.id=$1",
            [id],
          )
        ).rows[0]?.slug ?? "";
      const earlierPending = Boolean(
        (
          await client.query(
            "SELECT 1 FROM session_questions previous JOIN session_questions target ON target.session_id=previous.session_id WHERE target.id=$1 AND previous.order_index<target.order_index AND previous.is_completed=false LIMIT 1",
            [id],
          )
        ).rowCount,
      );
      const hintsUsed = session
        ? (
            await client.query<{ used: number }>(
              "SELECT count(*)::int AS used FROM session_questions WHERE session_id=$1 AND hint_used=true",
              [session.id],
            )
          ).rows[0].used
        : 0;
      return work({
        session,
        slug,
        earlierPending,
        hintsUsed,
        claim: async () =>
          Boolean(
            (
              await client.query(
                "UPDATE session_questions SET hint_used=true WHERE id=$1 AND is_completed=false AND hint_used=false",
                [id],
              )
            ).rowCount,
          ),
        async options() {
          const row = (
            await client.query<{ options: string[]; correct_answer: string }>(
              "SELECT q.options,q.correct_answer FROM questions q JOIN session_questions sq ON sq.question_id=q.id WHERE sq.id=$1",
              [id],
            )
          ).rows[0];
          return {
            options: row?.options ?? [],
            correctAnswer: row?.correct_answer ?? "",
          };
        },
      });
    }),
};
