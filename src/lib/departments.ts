import { query } from "@/lib/db";

export type DepartmentOption = {
  id: string;
  name: string;
  is_active: boolean;
  sort_order: number;
};

export async function getActiveDepartments(): Promise<DepartmentOption[]> {
  const { rows } = await query<DepartmentOption>(
    "SELECT id, name, is_active, COALESCE(sort_order, 0)::int AS sort_order FROM departments WHERE is_active = true ORDER BY sort_order ASC, name ASC",
  );
  return rows;
}
