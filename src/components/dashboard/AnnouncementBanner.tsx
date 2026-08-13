"use client";

import { useState, useEffect, useRef } from "react";

export default function AnnouncementBanner({ announcements }: { announcements: any[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const banner = bannerRef.current;
    if (!banner) return;

    // Listen for the CSS animation to complete one full cycle (when it goes off screen)
    const handleIteration = () => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
    };

    banner.addEventListener("animationiteration", handleIteration);
    return () => {
      banner.removeEventListener("animationiteration", handleIteration);
    };
  }, [announcements.length]);

  if (!announcements || announcements.length === 0) return null;

  const currentAnnouncement = announcements[currentIndex];

  return (
    <div className="mb-6 bg-primary/10 border border-primary/20 text-primary px-4 py-3 rounded-xl flex items-center gap-3 overflow-hidden shadow-sm pause-on-hover">
      <span className="flex-shrink-0 animate-pulse z-10 bg-background/50 backdrop-blur-sm p-1 rounded-full">📢</span>
      <div className="flex-1 overflow-hidden relative whitespace-nowrap [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
        <div 
          ref={bannerRef}
          className="animate-marquee inline-block font-semibold text-sm"
          // We can adjust the animation duration based on text length if desired, but 20s is a good default
          style={{ animationDuration: '15s' }}
        >
          {currentAnnouncement.message}
        </div>
      </div>
    </div>
  );
}
