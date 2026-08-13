import Link from "next/link";
import { Brain, LogOut, User, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Navbar() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const handleSignOut = async () => {
    "use server";
    const supabase = createClient();
    await supabase.auth.signOut();
    redirect("/login");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Brain size={20} />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground hidden sm:inline-block">
              Daily Brain Arena
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link 
                href="/leaderboard" 
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <Trophy size={18} />
                <span className="hidden sm:inline-block">Leaderboard</span>
              </Link>
              <Link 
                href="/profile" 
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <User size={18} />
                <span className="hidden sm:inline-block">Profile</span>
              </Link>
              <form action={handleSignOut}>
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
                >
                  <LogOut size={16} />
                  <span className="hidden sm:inline-block">Sign Out</span>
                </button>
              </form>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
