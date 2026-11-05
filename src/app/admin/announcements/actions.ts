"use server";
import { requireAdmin } from "@/features/identity/public-server";

import { adminAnnouncementsActionsQueries } from "@/features/administration/composition";
import { getCurrentUser } from "@/features/identity/public-server";
import { revalidatePath } from "next/cache";

const {
  selectProfilesForAddAnnouncement,
  insertAnnouncementsForAddAnnouncement,
  selectProfilesForToggleAnnouncementStatus,
  updateAnnouncementsForToggleAnnouncementStatus,
  selectProfilesForDeleteAnnouncement,
  deleteAnnouncementsForDeleteAnnouncement,
} = adminAnnouncementsActionsQueries;

export async function addAnnouncement(formData: FormData) {
  await requireAdmin();

  const user = await getCurrentUser();

  if (!user) throw new Error("Unauthorized");

  const { rows: profiles } = await selectProfilesForAddAnnouncement<{
    role: string;
  }>([user.id]);
  const profile = profiles[0];
  if (profile?.role !== "admin") throw new Error("Unauthorized");

  const message = formData.get("message") as string;
  const type = String(formData.get("type") || "info");
  const cta_text = formData.get("cta_text") as string | null;
  const cta_link = formData.get("cta_link") as string | null;

  if (!message || message.trim() === "") {
    throw new Error("Message is required.");
  }
  if (message.trim().length > 500)
    throw new Error("Announcement must be 500 characters or fewer.");
  if (!["info", "success", "warning", "error"].includes(type))
    throw new Error("Invalid announcement type.");
  if (cta_link && !/^\/(?!\/)|^https:\/\//i.test(cta_link.trim())) {
    throw new Error("CTA links must be internal paths or HTTPS URLs.");
  }

  // Deactivate old ones if we only want one active at a time? Let's just leave it up to the admin to toggle them.
  await insertAnnouncementsForAddAnnouncement([
    message.trim(),
    type,
    cta_text?.trim() || null,
    cta_link?.trim() || null,
  ]);

  revalidatePath("/admin/announcements");
  revalidatePath("/dashboard");
}

export async function toggleAnnouncementStatus(id: string, isActive: boolean) {
  await requireAdmin();

  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const { rows: profiles } = await selectProfilesForToggleAnnouncementStatus<{
    role: string;
  }>([user.id]);
  const profile = profiles[0];
  if (profile?.role !== "admin") throw new Error("Unauthorized");

  await updateAnnouncementsForToggleAnnouncementStatus([!isActive, id]);

  revalidatePath("/admin/announcements");
  revalidatePath("/dashboard");
}

export async function deleteAnnouncement(id: string) {
  await requireAdmin();

  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const { rows: profiles } = await selectProfilesForDeleteAnnouncement<{
    role: string;
  }>([user.id]);
  const profile = profiles[0];
  if (profile?.role !== "admin") throw new Error("Unauthorized");

  await deleteAnnouncementsForDeleteAnnouncement([id]);

  revalidatePath("/admin/announcements");
  revalidatePath("/dashboard");
}
