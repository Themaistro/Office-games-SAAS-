"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addAnnouncement(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");
  
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Unauthorized");

  const message = formData.get("message") as string;
  if (!message || message.trim() === "") {
    throw new Error("Message is required.");
  }

  // Deactivate old ones if we only want one active at a time? Let's just leave it up to the admin to toggle them.
  const { error } = await supabase
    .from("announcements")
    .insert({
      message: message.trim(),
      is_active: true
    });

  if (error) throw new Error(error.message);

  revalidatePath("/admin/announcements");
  revalidatePath("/dashboard");
}

export async function toggleAnnouncementStatus(id: string, isActive: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Unauthorized");

  const { error } = await supabase
    .from("announcements")
    .update({ is_active: !isActive })
    .eq("id", id);
    
  if (error) throw new Error(error.message);

  revalidatePath("/admin/announcements");
  revalidatePath("/dashboard");
}

export async function deleteAnnouncement(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Unauthorized");

  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/announcements");
  revalidatePath("/dashboard");
}
