import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NavbarClient from "./NavbarClient";

export default async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    profile = data;
  }

  const handleSignOut = async () => {
    "use server";
    const supabaseClient = await createClient();
    await supabaseClient.auth.signOut();
    redirect("/login");
  };

  return <NavbarClient user={user} profile={profile} onSignOut={handleSignOut} />;
}
