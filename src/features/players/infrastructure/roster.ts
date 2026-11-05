import "server-only";
import { query } from "../../../server/database/connection";

export async function loadPlayerRoster(input: {
  q?: string;
  department?: string;
  sort?: string;
  dir?: string;
  page?: string;
}) {
  const sortable: Record<string, string> = {
    name: "full_name",
    full_name: "full_name",
    department: "department",
    xp: "total_xp",
    total_xp: "total_xp",
    level: "current_level",
    streak: "current_streak",
    created_at: "created_at",
  };
  const column = sortable[input.sort ?? ""] ?? "total_xp",
    direction = input.dir === "asc" ? "ASC" : "DESC";
  const conditions = ["role='employee'"],
    values: unknown[] = [];
  if (input.q?.trim()) {
    values.push(`%${input.q.trim()}%`);
    conditions.push(`full_name ILIKE $${values.length}`);
  }
  if (input.department) {
    values.push(input.department);
    conditions.push(`department=$${values.length}`);
  }
  const where = conditions.join(" AND "),
    pageSize = 50;
  const page = Math.min(
    1_000_000,
    Math.max(1, Number.parseInt(input.page || "1", 10) || 1),
  );
  const [players, total, departments] = await Promise.all([
    query(
      `SELECT * FROM profiles WHERE ${where} ORDER BY ${column} ${direction} NULLS LAST,full_name ASC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, pageSize, (page - 1) * pageSize],
    ),
    query<{ count: number }>(
      `SELECT count(*)::int AS count FROM profiles WHERE ${where}`,
      values,
    ),
    query<{ id: string; name: string }>(
      "SELECT id,name FROM departments WHERE is_active=true ORDER BY sort_order,name",
    ),
  ]);
  return {
    users: players.rows,
    departments: departments.rows,
    totalUsers: total.rows[0]?.count ?? 0,
    page,
    totalPages: Math.ceil((total.rows[0]?.count ?? 0) / pageSize),
  };
}
