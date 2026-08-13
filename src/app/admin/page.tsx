import { Users, Target, Activity, Flame } from "lucide-react";

export default function AdminDashboardPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Overview</h1>
        <p className="text-muted-foreground mt-1">Monitor Daily Brain Arena performance and engagement.</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">Total Employees</h3>
            <Users size={16} className="text-primary" />
          </div>
          <span className="text-3xl font-bold">142</span>
          <span className="text-xs text-green-500 font-medium mt-2 flex items-center gap-1">
            +12 this month
          </span>
        </div>
        
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">Daily Participation</h3>
            <Activity size={16} className="text-blue-500" />
          </div>
          <span className="text-3xl font-bold">78%</span>
          <span className="text-xs text-green-500 font-medium mt-2 flex items-center gap-1">
            +4% from last week
          </span>
        </div>
        
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">Avg. Accuracy</h3>
            <Target size={16} className="text-accent" />
          </div>
          <span className="text-3xl font-bold">64%</span>
          <span className="text-xs text-muted-foreground font-medium mt-2 flex items-center gap-1">
            Steady
          </span>
        </div>
        
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">Highest Streak</h3>
            <Flame size={16} className="text-orange-500" />
          </div>
          <span className="text-3xl font-bold">21</span>
          <span className="text-xs text-muted-foreground font-medium mt-2 flex items-center gap-1">
            Sara (Sales)
          </span>
        </div>
      </div>

      {/* Charts/Content Area Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
          <h3 className="font-bold mb-4">Participation Over Time</h3>
          <div className="h-64 flex items-center justify-center bg-muted/50 rounded-lg border border-dashed border-border text-muted-foreground">
            Chart coming soon
          </div>
        </div>
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
          <h3 className="font-bold mb-4">Top Performing Teams</h3>
          <div className="space-y-4">
            {['Sales', 'Engineering', 'Marketing', 'Customer Care'].map((team, i) => (
              <div key={team} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                <span className="font-medium">{team}</span>
                <span className="text-sm text-primary font-bold">{Math.floor(8000 - i * 500)} XP Avg</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
