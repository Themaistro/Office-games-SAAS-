import { ChevronRight } from "lucide-react";
export type MissionHistoryItem = {
  date: string;
  total_score: number;
  total_xp_earned: number;
  is_completed: boolean;
};
export default function MissionHistoryList({
  history,
}: {
  history: MissionHistoryItem[];
}) {
  return (
    <div className="divide-y divide-border/50 overflow-y-auto max-h-[800px]">
      {history.map(
        (
          session: {
            date: string;
            total_score: number;
            total_xp_earned: number;
            is_completed: boolean;
          },
          i: number,
        ) => (
          <div
            key={i}
            className="p-5 hover:bg-secondary/30 transition-colors flex items-center justify-between group cursor-default"
          >
            <div className="flex flex-col gap-1">
              <span className="font-bold text-foreground">{session.date}</span>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Score: {session.total_score}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-sm">
                +{session.total_xp_earned} XP
              </div>
              <ChevronRight
                size={16}
                className="text-muted-foreground/50 group-hover:text-primary transition-colors translate-x-0 group-hover:translate-x-1"
              />
            </div>
          </div>
        ),
      )}
    </div>
  );
}
