import "server-only";
import { query } from "@/server/database/connection";
type MissionHistory = {
  date: string;
  total_score: number;
  total_xp_earned: number;
  is_completed: boolean;
};

export async function findProfile(userId: string) {
  const { rows } = await query("SELECT * FROM profiles WHERE id=$1", [userId]);
  return { data: rows[0] ?? null };
}

export async function findChessHistory(userId: string, statuses: string[]) {
  const { rows } = await query(
    "SELECT * FROM chess_games WHERE (white_player_id=$1 OR black_player_id=$1) AND status=ANY($2::text[]) ORDER BY updated_at DESC",
    [userId, statuses],
  );
  return { data: rows };
}

export async function findTttHistory(userId: string, statuses: string[]) {
  const { rows } = await query(
    "SELECT * FROM ttt_games WHERE (x_player_id=$1 OR o_player_id=$1) AND status=ANY($2::text[]) ORDER BY updated_at DESC",
    [userId, statuses],
  );
  return { data: rows };
}

async function count(sql: string, values: unknown[]) {
  const { rows } = await query<{ count: number }>(sql, values);
  return { count: rows[0].count };
}

export function countHigherXp(xp: number) {
  return count(
    "SELECT count(*)::int AS count FROM profiles WHERE role <> 'admin' AND total_xp > $1",
    [xp],
  );
}
export function countEqualXpBeforeName(xp: number, name: string) {
  return count(
    "SELECT count(*)::int AS count FROM profiles WHERE role <> 'admin' AND total_xp=$1 AND full_name < $2",
    [xp, name],
  );
}
export function countDepartmentHigherXp(department: string, xp: number) {
  return count(
    "SELECT count(*)::int AS count FROM profiles WHERE role <> 'admin' AND department=$1 AND total_xp > $2",
    [department, xp],
  );
}
export function countDepartmentEqualXpBeforeName(
  department: string,
  xp: number,
  name: string,
) {
  return count(
    "SELECT count(*)::int AS count FROM profiles WHERE role <> 'admin' AND department=$1 AND total_xp=$2 AND full_name < $3",
    [department, xp, name],
  );
}
async function completedHistory(userId: string, limit: number) {
  const { rows } = await query<MissionHistory>(
    "SELECT date,total_score,total_xp_earned,is_completed FROM daily_sessions WHERE user_id=$1 AND is_completed=true ORDER BY created_at DESC LIMIT $2",
    [userId, limit],
  );
  return { data: rows };
}
export const findRecentMissions = (userId: string) =>
  completedHistory(userId, 10);
export const findMissionHeatmap = (userId: string) =>
  completedHistory(userId, 35);
export async function findCompletedMissionIds(userId: string) {
  const { rows } = await query<{ id: string }>(
    "SELECT id FROM daily_sessions WHERE user_id=$1 AND is_completed=true",
    [userId],
  );
  return { data: rows };
}
export async function findMissionAnswers(sessionIds: string[]) {
  const { rows } = await query(
    "SELECT earned_xp,is_completed,question_id FROM session_questions WHERE session_id=ANY($1::uuid[])",
    [sessionIds],
  );
  return { data: rows };
}
