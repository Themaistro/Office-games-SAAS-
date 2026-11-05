import LandingExperience from "@/components/landing/LandingExperience";
import { pageQueries } from "@/features/workspace/composition";
import { getCurrentUser } from "@/features/identity/public-server";

const { selectProfilesForLandingPage } = pageQueries;

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const user = await getCurrentUser();
  let member: { name: string; destination: "/dashboard" | "/admin" } | null =
    null;

  if (user) {
    try {
      const { rows } = await selectProfilesForLandingPage<{
        role: string;
        full_name: string | null;
      }>([user.id]);
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
