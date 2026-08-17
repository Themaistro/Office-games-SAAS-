"use client";

import { clsx } from "clsx";

interface SessionData {
  date: string;
  total_score: number | null;
  total_xp_earned: number | null;
  is_completed: boolean;
}

export default function ActivityHeatmap({ history }: { history: SessionData[] }) {
  // Generate the last 35 days (5 weeks x 7 days)
  const days = [];
  const today = new Date();
  
  for (let i = 34; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    // Format as YYYY-MM-DD to match DB
    const dateStr = d.toISOString().split("T")[0];
    days.push(dateStr);
  }

  // Create a quick lookup map for history
  const historyMap = new Map<string, SessionData>();
  history.forEach(h => historyMap.set(h.date, h));

  return (
    <div className="bg-card/50 backdrop-blur-md border border-border/50 p-6 rounded-3xl shadow-sm">
      <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex justify-between items-center">
        <span>35-Day Activity</span>
        <span className="text-xs text-muted-foreground/70">{history.length} missions</span>
      </h3>
      
      <div className="flex gap-2 justify-center">
        {/* Split into 5 columns of 7 days */}
        {Array.from({ length: 5 }).map((_, weekIdx) => (
          <div key={weekIdx} className="flex flex-col gap-2">
            {days.slice(weekIdx * 7, (weekIdx + 1) * 7).map((dateStr) => {
              const session = historyMap.get(dateStr);
              let colorClass = "bg-secondary/40 border border-border/30"; // Not played
              
              if (session?.is_completed) {
                // Determine color intensity based on score or just a static color
                const score = session.total_score || 0;
                if (score > 4000) colorClass = "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]"; // Great
                else if (score > 2000) colorClass = "bg-emerald-500/80"; // Good
                else colorClass = "bg-emerald-600/50"; // OK
              }

              return (
                <div 
                  key={dateStr}
                  title={session ? `${dateStr}: ${session.total_score} Score` : `${dateStr}: No Activity`}
                  className={clsx("w-4 h-4 sm:w-5 sm:h-5 rounded-sm transition-all hover:scale-125 hover:z-10 cursor-pointer", colorClass)}
                />
              );
            })}
          </div>
        ))}
      </div>
      
      <div className="flex justify-between items-center mt-4 text-xs font-medium text-muted-foreground">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded-sm bg-secondary/40 border border-border/30" />
          <div className="w-3 h-3 rounded-sm bg-emerald-600/50" />
          <div className="w-3 h-3 rounded-sm bg-emerald-500/80" />
          <div className="w-3 h-3 rounded-sm bg-emerald-400" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
