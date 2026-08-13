import { createClient } from "@/lib/supabase/server";
import { Users as UsersIcon, Plus, UserPlus, MoreVertical, Flame } from "lucide-react";

export default async function AdminUsersPage() {
  const supabase = createClient();
  
  // Fetch users and teams
  const { data: profiles } = await supabase
    .from("profiles")
    .select(`
      id, email, full_name, current_level, current_streak, total_xp,
      teams(name)
    `)
    .order("created_at", { ascending: false });

  const { data: teams } = await supabase.from("teams").select("*").order("name");

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Employee Management</h1>
          <p className="text-muted-foreground mt-1">Manage active players and assign them to departments.</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors border border-border">
            <Plus size={18} />
            New Department
          </button>
          <a href="/admin/onboarding" className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors">
            <UserPlus size={18} />
            Bulk Invite
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Teams Sidebar */}
        <div className="md:col-span-1 space-y-4">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Departments</h3>
          <div className="space-y-1">
            <button className="w-full text-left px-3 py-2 bg-primary/10 text-primary font-medium rounded-lg transition-colors">
              All Employees ({profiles?.length || 0})
            </button>
            {teams?.map((team: any) => (
              <button key={team.id} className="w-full text-left px-3 py-2 hover:bg-muted text-muted-foreground hover:text-foreground font-medium rounded-lg transition-colors flex justify-between items-center">
                <span>{team.name}</span>
                <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                  {profiles?.filter((p: any) => p.teams?.name === team.name).length || 0}
                </span>
              </button>
            ))}
            {!teams || teams.length === 0 && (
              <div className="text-sm text-muted-foreground px-3 py-2 italic">No departments created.</div>
            )}
          </div>
        </div>

        {/* Users Table */}
        <div className="md:col-span-3 bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-3 font-semibold">Employee</th>
                  <th className="px-6 py-3 font-semibold">Department</th>
                  <th className="px-6 py-3 font-semibold">Level</th>
                  <th className="px-6 py-3 font-semibold">Streak</th>
                  <th className="px-6 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {profiles?.map((profile: any) => (
                  <tr key={profile.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">{profile.full_name || 'Anonymous Player'}</span>
                        <span className="text-xs text-muted-foreground">{profile.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {profile.teams?.name ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                          {profile.teams.name}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono font-medium text-primary">
                      Lvl {profile.current_level}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-orange-500 font-medium">
                        <Flame size={14} />
                        {profile.current_streak}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-muted-foreground hover:text-foreground transition-colors p-1">
                        <MoreVertical size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                
                {!profiles || profiles.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      <UsersIcon className="w-8 h-8 mx-auto mb-3 opacity-50" />
                      <p>No employees registered yet.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
