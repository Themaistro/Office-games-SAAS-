import { redirect } from "next/navigation";
import "server-only";
import { getCurrentAdmin, getCurrentUser } from "./authentication";

/** Pages protect their own reads as well as inheriting the admin layout. */
export async function requireAdminPage() {
  if (!(await getCurrentUser())) redirect("/login");
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/dashboard");
  return admin;
}
