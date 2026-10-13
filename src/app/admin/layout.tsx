import { Activity } from "lucide-react";
import { destroySession, getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { redirect } from "next/navigation";

import AdminMobileMenu from "./AdminMobileMenu";
import AdminSidebar from "./AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { rows } = await query<{ role: string }>("SELECT role FROM profiles WHERE id = $1", [user.id]);
  const profile = rows[0];

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  const handleSignOut = async () => {
    "use server";
    await destroySession();
    redirect("/login");
  };

  return (
    <div className="flex min-h-screen bg-muted/30">
      <AdminSidebar onSignOut={handleSignOut} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="flex h-16 items-center justify-between border-b border-border/70 bg-card px-4 sm:px-6 md:hidden">
          <AdminMobileMenu onSignOut={handleSignOut} />
          <span className="font-black tracking-tight">Admin workspace</span>
          <Activity size={18} className="text-emerald-500" />
        </header>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10">
          {children}
        </div>
      </main>
    </div>
  );
}

