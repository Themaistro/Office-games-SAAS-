import { createClient } from "@/lib/supabase/server";
import ClientExportButton from "./ClientExportButton";
import { resetUserStreak, updateUserDepartment } from "./actions";

export default async function UsersManagementPage() {
  const supabase = await createClient();

  const { data: users, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "employee")
    .order("total_xp", { ascending: false });

  const { data: departments } = await supabase
    .from("departments")
    .select("*")
    .order("name", { ascending: true });

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
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
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
                      <form action={updateUserDepartment} className="flex items-center gap-2">
                        <input type="hidden" name="userId" value={u.id} />
                        <select 
                          name="department" 
                          defaultValue={u.department || ""}
                          className="text-xs rounded-md border border-input bg-transparent px-2 py-1 shadow-sm"
                        >
                          <option value="">Unassigned</option>
                          {departments?.map(d => (
                            <option key={d.id} value={d.name}>{d.name}</option>
                          ))}
                        </select>
                        <button type="submit" className="text-xs bg-primary/10 text-primary hover:bg-primary/20 px-2 py-1 rounded">
                          Save
                        </button>
                      </form>
                    </td>
                    <td className="px-6 py-4 font-medium">{u.current_level || 1}</td>
                    <td className="px-6 py-4 font-bold text-primary">{u.total_xp || 0}</td>
                    <td className="px-6 py-4 font-medium text-orange-500">{u.current_streak || 0} 🔥</td>
                    <td className="px-6 py-4 text-right">
                      <form action={async () => {
                        "use server";
                        await resetUserStreak(u.id);
                      }}>
                        <button 
                          type="submit" 
                          className="text-xs text-destructive hover:bg-destructive/10 px-2 py-1 rounded transition-colors"
                          title="Reset Streak to 0"
                        >
                          Reset Streak
                        </button>
                      </form>
                    </td>
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
