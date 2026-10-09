"use client";

import { useEffect, useState } from "react";
import { Clock, Play } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface CooldownTimerProps {
  createdAt: string;
}

export default function CooldownTimer({ createdAt }: CooldownTimerProps) {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  
  useEffect(() => {
    const createdAtTime = new Date(createdAt).getTime();
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;
    const unlockTime = createdAtTime + twentyFourHoursMs;

    const calculateTimeLeft = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((unlockTime - now) / 1000));
      setTimeLeft(remaining);
      
      // Auto-refresh when cooldown expires
      if (remaining === 0) {
        router.refresh();
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [createdAt, router]);

  if (timeLeft === null) return null;

  if (timeLeft <= 0) {
    return (
      <div className="flex flex-col items-center gap-4 mt-6">
        <Link
          href="/play/start"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-lg font-bold text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
        >
          <Play fill="currentColor" size={20} />
          START NEXT CHALLENGE
        </Link>
      </div>
    );
  }

  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="flex flex-col items-center gap-4 mt-6">
      <div className="inline-flex items-center gap-3 bg-card border border-border px-6 py-4 rounded-xl shadow-sm">
        <Clock className="text-muted-foreground animate-pulse" size={24} />
        <div className="flex flex-col">
          <span className="text-xs font-medium text-muted-foreground uppercase">Next Challenge Unlocks In</span>
          <span className="text-2xl font-mono font-bold">
            {hours.toString().padStart(2, '0')}:
            {minutes.toString().padStart(2, '0')}:
            {seconds.toString().padStart(2, '0')}
          </span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">You must wait 24 hours between challenges.</p>
    </div>
  );
}
