import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import LandingExperience from "@/components/landing/LandingExperience";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const user = await getCurrentUser();
  let member: { name: string; destination: "/dashboard" | "/admin" } | null = null;

  if (user) {
    try {
      const { rows } = await query<{ role: string; full_name: string | null }>(
        "SELECT role, full_name FROM profiles WHERE id = $1",
        [user.id],
      );
      const profile = rows[0];
      member = {
        name: profile?.full_name || user.email?.split("@")[0] || "there",
        destination: profile?.role === "admin" ? "/admin" : "/dashboard",
      };
    } catch {
      // Keep the public page usable if the profile lookup is temporarily unavailable.
      member = null;
    }
  }

  return <LandingExperience member={member} />;
}
