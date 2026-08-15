"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addDepartment(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");
  
  // Verify admin status
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Unauthorized");

  const name = formData.get("name") as string;
  if (!name || name.trim() === "") {
    throw new Error("Department name is required.");
  }

  const { error } = await supabase
    .from("departments")
    .insert({
      name: name.trim(),
      is_active: true
    });

  if (error) {
    console.error("Failed to add department:", error);
    throw new Error(error.message);
  }

  revalidatePath("/admin/departments");
  revalidatePath("/register");
}

export async function toggleDepartmentStatus(id: string, isActive: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Unauthorized");

  const { error } = await supabase
    .from("departments")
    .update({ is_active: !isActive })
    .eq("id", id);
    
  if (error) throw new Error(error.message);

  revalidatePath("/admin/departments");
  revalidatePath("/register");
}

export async function deleteDepartment(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Unauthorized");

  // Safety check: Don't delete if users are in it
  const { data: dept } = await supabase.from("departments").select("name").eq("id", id).single();
  if (!dept) throw new Error("Department not found");

  const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("department", dept.name);
  if (count && count > 0) {
    throw new Error(`Cannot delete: ${count} players are still assigned to this department.`);
  }

  const { error } = await supabase.from("departments").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/departments");
  revalidatePath("/register");
}

export async function renameDepartment(id: string, newName: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Unauthorized");

  const name = newName.trim();
  if (!name) throw new Error("Department name is required.");

  const { data: oldDept } = await supabase.from("departments").select("name").eq("id", id).single();
  if (!oldDept) throw new Error("Department not found");

  const { error } = await supabase
    .from("departments")
    .update({ name })
    .eq("id", id);
    
  if (error) throw new Error(error.message);

  // Cascade the rename to all users who had the old department name
  if (oldDept.name !== name) {
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ department: name })
      .eq("department", oldDept.name);
      
    if (profileError) console.error("Failed to update profiles", profileError);
  }

  revalidatePath("/admin/departments");
  revalidatePath("/register");
  revalidatePath("/admin/users");
}

export async function updateDepartmentSortOrder(updates: { id: string, sort_order: number }[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Unauthorized");

  for (const update of updates) {
    await supabase.from("departments").update({ sort_order: update.sort_order }).eq("id", update.id);
  }

  revalidatePath("/admin/departments");
  revalidatePath("/register");
}
