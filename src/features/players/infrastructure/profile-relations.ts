import { query } from "@/server/database/connection";
import "server-only";
export async function attachGameProfiles(
  games: any[] | null,
  pairs: { left: string; right: string; leftKey: string; rightKey: string }[],
) {
  const rows = games || [];
  const ids = [
    ...new Set(
      rows.flatMap((game) =>
        pairs
          .flatMap((pair) => [game[pair.left], game[pair.right]])
          .filter(Boolean),
      ),
    ),
  ];
  if (ids.length === 0) return rows;
  const { rows: profiles } = await query(
    "SELECT id,full_name,avatar_url,chess_elo FROM profiles WHERE id=ANY($1::uuid[])",
    [ids],
  );
  const byId = new Map(
    (profiles || []).map((profile: any) => [profile.id, profile]),
  );
  return rows.map((game) => {
    const result = { ...game };
    for (const pair of pairs) {
      result[pair.leftKey] = byId.get(game[pair.left]) || null;
      result[pair.rightKey] = byId.get(game[pair.right]) || null;
    }
    return result;
  });
}

export async function attachQuestionDetails(rows: any[] | null) {
  const questions = rows || [];
  const ids = [
    ...new Set(questions.map((row) => row.question_id).filter(Boolean)),
  ];
  if (!ids.length) return questions;
  const { rows: data } = await query<{ id: string; game_type_id: string }>(
    "SELECT id,game_type_id FROM questions WHERE id=ANY($1::uuid[])",
    [ids],
  );
  const gameTypeIds = [
    ...new Set(
      (data || [])
        .map((question: any) => question.game_type_id)
        .filter(Boolean),
    ),
  ];
  const { rows: gameTypes } = await query(
    "SELECT id,name FROM game_types WHERE id=ANY($1::uuid[])",
    [gameTypeIds],
  );
  const questionMap = new Map<string, { game_type_id: string }>(
    (data || []).map((question: any) => [question.id, question]),
  );
  const gameTypeMap = new Map(
    (gameTypes || []).map((gameType: any) => [gameType.id, gameType]),
  );
  return questions.map((row) => ({
    ...row,
    questions: {
      game_types:
        gameTypeMap.get(questionMap.get(row.question_id)?.game_type_id) || null,
    },
  }));
}
