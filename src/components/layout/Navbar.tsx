import {
  destroySession,
  getCurrentUser,
} from "@/features/identity/public-server";
import { navigationProfile } from "@/features/players/composition";
import { redirect } from "next/navigation";
import NavbarClient from "./NavbarClient";

export default async function Navbar({
  adminView = false,
}: {
  adminView?: boolean;
}) {
  const user = await getCurrentUser();

  let profile = null;
  if (user) {
    profile = await navigationProfile(user.id);
  }

  const handleSignOut = async () => {
    "use server";
    await destroySession();
    redirect("/login");
  };

  return (
    <NavbarClient
      user={user}
      profile={profile}
      onSignOut={handleSignOut}
      adminView={adminView}
    />
  );
}
