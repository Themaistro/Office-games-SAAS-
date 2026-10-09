import { destroySession, getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { redirect } from "next/navigation";
import NavbarClient from "./NavbarClient";

export default async function Navbar() {
  const user = await getCurrentUser();

  let profile = null;
  if (user) {
    const { rows } = await query("SELECT * FROM profiles WHERE id = $1", [user.id]);
    profile = rows[0] ?? null;
  }

  const handleSignOut = async () => {
    "use server";
    await destroySession();
    redirect("/login");
  };

  return <NavbarClient user={user} profile={profile} onSignOut={handleSignOut} />;
}
