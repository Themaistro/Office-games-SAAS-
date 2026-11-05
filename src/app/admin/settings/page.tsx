import { requireAdminPage } from "@/features/identity/composition";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  await requireAdminPage();
  return <SettingsClient />;
}
