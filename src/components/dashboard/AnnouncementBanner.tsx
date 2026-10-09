"use client";

export default function AnnouncementBanner({ announcements }: { announcements: any[] }) {
  if (!announcements || announcements.length === 0) return null;

  const typeStyles: Record<string, { wrapper: string, icon: string }> = {
    info: { wrapper: "bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400", icon: "ℹ️" },
    success: { wrapper: "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400", icon: "🎉" },
    warning: { wrapper: "bg-orange-500/10 border-orange-500/20 text-orange-700 dark:text-orange-400", icon: "⚠️" },
    urgent: { wrapper: "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400", icon: "🚨" }
  };

  // Adjust animation duration based on how many announcements there are so it doesn't zip by too fast
  const duration = Math.max(20, announcements.length * 15);

  return (
    <div className="mb-6 border border-border bg-card/80 backdrop-blur-sm pl-4 pr-1 py-1.5 rounded-xl flex items-center overflow-hidden shadow-sm pause-on-hover relative">
      
      {/* Static Label pinned to the left */}
      <div className="flex-shrink-0 z-10 bg-card/80 backdrop-blur-md pr-4 py-2 flex items-center gap-2 border-r border-border font-bold uppercase tracking-wider text-xs text-muted-foreground shadow-[10px_0_10px_-5px_rgba(0,0,0,0.05)]">
        <span className="animate-pulse text-primary text-base">📢</span>
        Updates
      </div>

      {/* Scrolling Marquee Container */}
      <div className="flex-1 overflow-hidden relative whitespace-nowrap [mask-image:linear-gradient(to_right,transparent,black_2%,black_98%,transparent)]">
        <div 
          className="animate-marquee inline-flex items-center gap-6 pl-6"
          style={{ animationDuration: `${duration}s` }}
        >
          {announcements.map((ann, idx) => {
            const style = typeStyles[ann.type] || typeStyles.info;
            return (
              <div key={ann.id || idx} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${style.wrapper} border shadow-sm`}>
                <span className="text-sm">{style.icon}</span>
                <span className="font-semibold text-sm">{ann.message}</span>
                {ann.cta_text && ann.cta_link && (
                  <a 
                    href={ann.cta_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 shrink-0 text-[10px] font-bold uppercase tracking-wider bg-background hover:bg-background/80 px-2.5 py-1 rounded-full transition-colors shadow-sm text-foreground border border-border/50"
                  >
                    {ann.cta_text}
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
