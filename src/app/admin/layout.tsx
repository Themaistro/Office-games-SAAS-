import Link from "next/link";
import { Brain, LayoutDashboard, Users, UserPlus, HelpCircle, Settings, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    // For local dev preview, you might allow this, but for prod redirect.
    // Let's redirect to dashboard if not admin
    redirect("/dashboard");
  }

  const handleSignOut = async () => {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  };

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Brain size={20} />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">
              Admin Arena
            </span>
          </Link>
        </div>
        
        <nav className="flex-1 p-4 flex flex-col gap-2">
          <Link href="/admin" className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground font-medium transition-colors">
            <LayoutDashboard size={18} />
            Overview
          </Link>
          <Link href="/admin/users" className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground font-medium transition-colors">
            <Users size={18} />
            Player Roster
          </Link>
          <Link href="/admin/departments" className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground font-medium transition-colors">
            <LayoutDashboard size={18} />
            Departments
          </Link>
          <Link href="/admin/announcements" className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground font-medium transition-colors">
            <HelpCircle size={18} />
            Announcements
          </Link>
          <Link href="/admin/prizes" className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground font-medium transition-colors">
            <LayoutDashboard size={18} />
            Prizes
          </Link>
          <Link href="/admin/questions" className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground font-medium transition-colors">
            <HelpCircle size={18} />
            Custom Questions
          </Link>
          <Link href="/admin/games" className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground font-medium transition-colors">
            <Brain size={18} />
            Games Management
          </Link>
          <Link href="/admin/settings" className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground font-medium transition-colors">
            <Settings size={18} />
            Settings
          </Link>
          <div className="mt-4 pt-4 border-t border-border">
            <form action={handleSignOut}>
              <button type="submit" className="flex items-center justify-start gap-3 w-full px-3 py-2 rounded-lg text-destructive hover:bg-destructive/10 font-medium transition-colors">
                <LogOut size={18} />
                Sign Out
              </button>
            </form>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <header className="h-16 flex items-center px-6 border-b border-border bg-card md:hidden">
          <span className="font-bold">Admin Mobile View (Preview)</span>
        </header>
        <div className="flex-1 p-6 sm:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
