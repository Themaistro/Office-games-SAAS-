import "server-only";
import { query } from "@/server/database/connection";
import type { QueryResultRow } from "pg";

async function read<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  values: unknown[] = [],
) {
  try {
    return { data: (await query<T>(sql, values)).rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
}
export function findGameTypes(ids: string[]) {
  return read(
    "SELECT id,name,slug,is_active,easy_rounds,medium_rounds,hard_rounds FROM game_types WHERE id=ANY($1::uuid[])",
    [ids],
  );
}
export function findDailyPool(
  date: string,
  ids: string[],
  offset: number,
  limit: number,
) {
  return read(
    "SELECT id,game_type_id,difficulty,content,options,base_xp,pool_date FROM questions WHERE pool_date=$1 AND game_type_id=ANY($2::uuid[]) AND is_active=true ORDER BY id LIMIT $3 OFFSET $4",
    [date, ids, limit, offset],
  );
}
export function findFallbackPool(ids: string[]) {
  return read(
    "SELECT id,game_type_id,difficulty,content,options,base_xp FROM questions WHERE game_type_id=ANY($1::uuid[]) AND is_active=true",
    [ids],
  );
}
export const findTriviaBank = () =>
  read<QueryResultRow & { department: string }>(
    "SELECT * FROM master_trivia_bank",
  );
export const findWordBank = () => read("SELECT * FROM master_word_bank");
export const findTypingBank = () => read("SELECT * FROM master_typing_bank");
export const findOddObjectBank = () =>
  read("SELECT * FROM master_odd_object_bank");
export async function findGenerationSettings() {
  const result = await read("SELECT * FROM system_settings LIMIT 1");
  return { ...result, data: result.data?.[0] ?? null };
}
export function findCompanyTrivia(date: string | null, department: string) {
  return read(
    "SELECT * FROM company_trivia WHERE target_date IS NOT DISTINCT FROM $1::date AND department=ANY($2::text[]) AND is_active=true",
    [date, ["General", department]],
  );
}
export function findQuestionHistory(userId: string, since: string) {
  return read<{ question_id: string; content_key: string }>(
    "SELECT question_id,content_key FROM question_history WHERE user_id=$1 AND served_at >= $2",
    [userId, since],
  );
}
export function insertPoolQuestions(rows: QueryResultRow[]) {
  if (!rows.length) return Promise.resolve({ data: [], error: null });
  return read(
    `INSERT INTO questions(game_type_id,difficulty,content,options,correct_answer,base_xp,is_active,pool_date)
    SELECT game_type_id,difficulty,content,options,correct_answer,base_xp,is_active,pool_date
    FROM jsonb_to_recordset($1::jsonb) AS item(game_type_id uuid,difficulty text,content jsonb,options jsonb,correct_answer text,base_xp integer,is_active boolean,pool_date date)
    RETURNING id,game_type_id,difficulty,content,options,base_xp`,
    [JSON.stringify(rows)],
  );
}
