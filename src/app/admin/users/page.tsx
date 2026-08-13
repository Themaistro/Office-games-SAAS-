import { createClient } from "@/lib/supabase/server";
import ClientExportButton from "./ClientExportButton";

export default async function UsersManagementPage() {
  const supabase = await createClient();

  const { data: users, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "employee")
    .order("total_xp", { ascending: false });

  if (error) {
    console.error("Error fetching users:", error);
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Employee Management</h1>
          <p className="text-muted-foreground mt-1">View and export employee leaderboard data.</p>
        </div>
        
        {/* We pass the data to a client component to handle the browser-based CSV download */}
        <ClientExportButton data={users || []} />
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-muted/50 border-b border-border text-muted-foreground">
              <tr>
                <th className="px-6 py-4 font-semibold">Employee</th>
                <th className="px-6 py-4 font-semibold">Department</th>
                <th className="px-6 py-4 font-semibold">Level</th>
                <th className="px-6 py-4 font-semibold">Total XP</th>
                <th className="px-6 py-4 font-semibold">Streak</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(users || []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    No employees found.
                  </td>
                </tr>
              ) : (
                users?.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-foreground">{u.full_name || "Unknown"}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-primary/5 text-primary border-primary/20">
                        {u.department || "Unassigned"}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium">{u.current_level || 1}</td>
                    <td className="px-6 py-4 font-bold text-primary">{u.total_xp || 0}</td>
                    <td className="px-6 py-4 font-medium text-orange-500">{u.current_streak || 0} 🔥</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
