import { requireAdminPage } from "@/features/identity/composition";
import { destroySession } from "@/features/identity/public-server";
import { Activity } from "lucide-react";
import { redirect } from "next/navigation";
import AdminMobileMenu from "./AdminMobileMenu";
import AdminSidebar from "./AdminSidebar";

// Admin pages must always be rendered against the current session and role.
// This prevents a cached admin shell from being reused after a role changes.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminPage();

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
