"use server";

import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function addDepartment(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) throw new Error("Unauthorized");
  
  // Verify admin status
  const { rows: profiles } = await query<{ role: string }>("SELECT role FROM profiles WHERE id = $1", [user.id]);
  const profile = profiles[0];

  if (profile?.role !== "admin") throw new Error("Unauthorized");

  const name = formData.get("name") as string;
  if (!name || name.trim() === "") {
    throw new Error("Department name is required.");
  }

  await query("INSERT INTO departments (name, is_active) VALUES ($1, true)", [name.trim()]);

  revalidatePath("/admin/departments");
  revalidatePath("/register");
}

export async function toggleDepartmentStatus(id: string, isActive: boolean) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  
  const { rows: profiles } = await query<{ role: string }>("SELECT role FROM profiles WHERE id = $1", [user.id]);
  const profile = profiles[0];
  if (profile?.role !== "admin") throw new Error("Unauthorized");

  await query("UPDATE departments SET is_active = $1 WHERE id = $2", [!isActive, id]);

  revalidatePath("/admin/departments");
  revalidatePath("/register");
}

export async function deleteDepartment(id: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  
  const { rows: profiles } = await query<{ role: string }>("SELECT role FROM profiles WHERE id = $1", [user.id]);
  const profile = profiles[0];
  if (profile?.role !== "admin") throw new Error("Unauthorized");

  // Safety check: Don't delete if users are in it
  const { rows: deptRows } = await query<{ name: string }>("SELECT name FROM departments WHERE id = $1", [id]);
  const dept = deptRows[0];
  if (!dept) throw new Error("Department not found");

  const { rows: countRows } = await query<{ count: number }>("SELECT count(*)::int AS count FROM profiles WHERE department = $1", [dept.name]);
  const count = countRows[0]?.count ?? 0;
  if (count && count > 0) {
    throw new Error(`Cannot delete: ${count} players are still assigned to this department.`);
  }

  await query("DELETE FROM departments WHERE id = $1", [id]);

  revalidatePath("/admin/departments");
  revalidatePath("/register");
}

export async function renameDepartment(id: string, newName: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  
  const { rows: profiles } = await query<{ role: string }>("SELECT role FROM profiles WHERE id = $1", [user.id]);
  const profile = profiles[0];
  if (profile?.role !== "admin") throw new Error("Unauthorized");

  const name = newName.trim();
  if (!name) throw new Error("Department name is required.");

  const { rows: oldDeptRows } = await query<{ name: string }>("SELECT name FROM departments WHERE id = $1", [id]);
  const oldDept = oldDeptRows[0];
  if (!oldDept) throw new Error("Department not found");

  await query("UPDATE departments SET name = $1 WHERE id = $2", [name, id]);

  // Cascade the rename to all users who had the old department name
  if (oldDept.name !== name) {
    await query("UPDATE profiles SET department = $1 WHERE department = $2", [name, oldDept.name]);
  }

  revalidatePath("/admin/departments");
  revalidatePath("/register");
  revalidatePath("/admin/users");
}

export async function updateDepartmentSortOrder(updates: { id: string, sort_order: number }[]) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  
  const { rows: profiles } = await query<{ role: string }>("SELECT role FROM profiles WHERE id = $1", [user.id]);
  const profile = profiles[0];
  if (profile?.role !== "admin") throw new Error("Unauthorized");

  for (const update of updates) {
    await query("UPDATE departments SET sort_order = $1 WHERE id = $2", [update.sort_order, update.id]);
  }

  revalidatePath("/admin/departments");
  revalidatePath("/register");
}

