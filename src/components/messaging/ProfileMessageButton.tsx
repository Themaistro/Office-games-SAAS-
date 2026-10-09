"use client";

import { MessageCircle } from "lucide-react";
import { useState } from "react";
import DirectMessagePopup from "./DirectMessagePopup";

export default function ProfileMessageButton({ userId, person }: { userId: string; person: { id: string; full_name: string; avatar_url?: string | null } }) {
  const [open, setOpen] = useState(false);
  return <><button onClick={() => setOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold shadow-sm transition-colors hover:bg-secondary"><MessageCircle size={16}/> Message</button>{open && <DirectMessagePopup userId={userId} person={person} onClose={() => setOpen(false)} />}</>;
}
