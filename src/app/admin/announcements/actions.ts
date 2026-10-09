"use server";

import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function addAnnouncement(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) throw new Error("Unauthorized");
  
  const { rows: profiles } = await query<{ role: string }>("SELECT role FROM profiles WHERE id = $1", [user.id]);
  const profile = profiles[0];
  if (profile?.role !== "admin") throw new Error("Unauthorized");

  const message = formData.get("message") as string;
  const type = formData.get("type") as string || "info";
  const cta_text = formData.get("cta_text") as string | null;
  const cta_link = formData.get("cta_link") as string | null;

  if (!message || message.trim() === "") {
    throw new Error("Message is required.");
  }

  // Deactivate old ones if we only want one active at a time? Let's just leave it up to the admin to toggle them.
  await query("INSERT INTO announcements (message, type, cta_text, cta_link, is_active) VALUES ($1, $2, $3, $4, true)", [message.trim(), type, cta_text?.trim() || null, cta_link?.trim() || null]);

  revalidatePath("/admin/announcements");
  revalidatePath("/dashboard");
}

export async function toggleAnnouncementStatus(id: string, isActive: boolean) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  
  const { rows: profiles } = await query<{ role: string }>("SELECT role FROM profiles WHERE id = $1", [user.id]);
  const profile = profiles[0];
  if (profile?.role !== "admin") throw new Error("Unauthorized");

  await query("UPDATE announcements SET is_active = $1 WHERE id = $2", [!isActive, id]);

  revalidatePath("/admin/announcements");
  revalidatePath("/dashboard");
}

export async function deleteAnnouncement(id: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  
  const { rows: profiles } = await query<{ role: string }>("SELECT role FROM profiles WHERE id = $1", [user.id]);
  const profile = profiles[0];
  if (profile?.role !== "admin") throw new Error("Unauthorized");

  await query("DELETE FROM announcements WHERE id = $1", [id]);

  revalidatePath("/admin/announcements");
  revalidatePath("/dashboard");
}
