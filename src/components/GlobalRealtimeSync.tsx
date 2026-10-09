"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function GlobalRealtimeSync() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  useEffect(() => {
    const interval = window.setInterval(() => startTransition(() => router.refresh()), 15000);
    return () => window.clearInterval(interval);
  }, [router]);

  return null;
}

