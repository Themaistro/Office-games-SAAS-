import { requireAdminPage } from "@/features/identity/composition";
import OnboardingClient from "./OnboardingClient";

export default async function OnboardingPage() {
  await requireAdminPage();
  return <OnboardingClient />;
}
