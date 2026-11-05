"use server";
import { requireAdmin } from "@/features/identity/public-server";

import { adminDepartmentsActionsQueries } from "@/features/administration/composition";
import { getCurrentUser } from "@/features/identity/public-server";
import { revalidatePath } from "next/cache";

const {
  selectProfilesForAddDepartment,
  selectDepartmentsForAddDepartment,
  insertDepartmentsForAddDepartment,
  selectProfilesForToggleDepartmentStatus,
  updateDepartmentsForToggleDepartmentStatus,
  selectProfilesForDeleteDepartment,
  selectDepartmentsForDeleteDepartment,
  selectProfilesForDeleteDepartment2,
  selectCompanyTriviaForDeleteDepartment,
  deleteDepartmentsForDeleteDepartment,
  selectProfilesForRenameDepartment,
  selectDepartmentsForRenameDepartment,
  selectDepartmentsForRenameDepartment2,
  updateDepartmentsForRenameDepartment,
  updateProfilesForRenameDepartment,
  updateCompanyTriviaForRenameDepartment,
  selectProfilesForUpdateDepartmentSortOrder,
  updateDepartmentsForUpdateDepartmentSortOrder,
} = adminDepartmentsActionsQueries;

export async function addDepartment(formData: FormData) {
  await requireAdmin();

  const user = await getCurrentUser();

  if (!user) throw new Error("Unauthorized");

  // Verify admin status
  const { rows: profiles } = await selectProfilesForAddDepartment<{
    role: string;
  }>([user.id]);
  const profile = profiles[0];

  if (profile?.role !== "admin") throw new Error("Unauthorized");

  const name = String(formData.get("name") || "")
    .trim()
    .replace(/\s+/g, " ");
  if (!name) {
    throw new Error("Department name is required.");
  }
  if (name.length > 80)
    throw new Error("Department name must be 80 characters or fewer.");

  const { rows: duplicateRows } = await selectDepartmentsForAddDepartment<{
    id: string;
  }>([name]);
  if (duplicateRows[0]) throw new Error("That department already exists.");

  await insertDepartmentsForAddDepartment([name]);

  revalidatePath("/admin/departments");
  revalidatePath("/register");
  revalidatePath("/profile");
  revalidatePath("/admin/users");
  revalidatePath("/admin/questions");
}

export async function toggleDepartmentStatus(id: string, isActive: boolean) {
  await requireAdmin();

  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const { rows: profiles } = await selectProfilesForToggleDepartmentStatus<{
    role: string;
  }>([user.id]);
  const profile = profiles[0];
  if (profile?.role !== "admin") throw new Error("Unauthorized");

  await updateDepartmentsForToggleDepartmentStatus([!isActive, id]);

  revalidatePath("/admin/departments");
  revalidatePath("/register");
  revalidatePath("/profile");
  revalidatePath("/admin/users");
  revalidatePath("/admin/questions");
}

export async function deleteDepartment(id: string) {
  await requireAdmin();

  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const { rows: profiles } = await selectProfilesForDeleteDepartment<{
    role: string;
  }>([user.id]);
  const profile = profiles[0];
  if (profile?.role !== "admin") throw new Error("Unauthorized");

  // Safety check: Don't delete if users are in it
  const { rows: deptRows } = await selectDepartmentsForDeleteDepartment<{
    name: string;
  }>([id]);
  const dept = deptRows[0];
  if (!dept) throw new Error("Department not found");

  const { rows: countRows } = await selectProfilesForDeleteDepartment2<{
    count: number;
  }>([dept.name]);
  const count = countRows[0]?.count ?? 0;
  if (count && count > 0) {
    throw new Error(
      `Cannot delete: ${count} players are still assigned to this department.`,
    );
  }

  const { rows: triviaRows } = await selectCompanyTriviaForDeleteDepartment<{
    count: number;
  }>([dept.name]);
  const triviaCount = triviaRows[0]?.count ?? 0;
  if (triviaCount > 0) {
    throw new Error(
      `Cannot delete: ${triviaCount} questions are targeted to this department. Reassign them first.`,
    );
  }

  await deleteDepartmentsForDeleteDepartment([id]);

  revalidatePath("/admin/departments");
  revalidatePath("/register");
  revalidatePath("/profile");
  revalidatePath("/admin/users");
}

export async function renameDepartment(id: string, newName: string) {
  await requireAdmin();

  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const { rows: profiles } = await selectProfilesForRenameDepartment<{
    role: string;
  }>([user.id]);
  const profile = profiles[0];
  if (profile?.role !== "admin") throw new Error("Unauthorized");

  const name = newName.trim().replace(/\s+/g, " ");
  if (!name) throw new Error("Department name is required.");
  if (name.length > 80)
    throw new Error("Department name must be 80 characters or fewer.");

  const { rows: oldDeptRows } = await selectDepartmentsForRenameDepartment<{
    name: string;
  }>([id]);
  const oldDept = oldDeptRows[0];
  if (!oldDept) throw new Error("Department not found");

  const { rows: duplicateRows } = await selectDepartmentsForRenameDepartment2<{
    id: string;
  }>([name, id]);
  if (duplicateRows[0]) throw new Error("That department already exists.");

  await updateDepartmentsForRenameDepartment([name, id]);

  // Cascade the rename to all users who had the old department name
  if (oldDept.name !== name) {
    await updateProfilesForRenameDepartment([name, oldDept.name]);
    await updateCompanyTriviaForRenameDepartment([name, oldDept.name]);
  }

  revalidatePath("/admin/departments");
  revalidatePath("/register");
  revalidatePath("/profile");
  revalidatePath("/admin/users");
  revalidatePath("/admin/questions");
}

export async function updateDepartmentSortOrder(
  updates: { id: string; sort_order: number }[],
) {
  await requireAdmin();

  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const { rows: profiles } = await selectProfilesForUpdateDepartmentSortOrder<{
    role: string;
  }>([user.id]);
  const profile = profiles[0];
  if (profile?.role !== "admin") throw new Error("Unauthorized");

  for (const update of updates) {
    await updateDepartmentsForUpdateDepartmentSortOrder([
      update.sort_order,
      update.id,
    ]);
  }

  revalidatePath("/admin/departments");
  revalidatePath("/register");
}
