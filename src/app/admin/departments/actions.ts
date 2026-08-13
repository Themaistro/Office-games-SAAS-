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
  return { success: true };
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

  const { error } = await supabase.from("departments").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/departments");
  revalidatePath("/register");
}
