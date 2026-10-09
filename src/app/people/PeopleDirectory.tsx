"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MessageCircle, Search, User } from "lucide-react";
import ChallengeMenu from "@/components/profile/ChallengeMenu";
import DirectMessagePopup from "@/components/messaging/DirectMessagePopup";

type Person = { user_id: string; full_name: string; avatar_url?: string | null; department?: string | null; position?: string | null; is_online: boolean; online_at?: string | null; activity?: string; unread_count: number };
type ChatPerson = { id: string; full_name: string; avatar_url?: string | null };

export default function PeopleDirectory({ userId }: { userId: string }) {
  const [people, setPeople] = useState<Person[]>([]);
  const [search, setSearch] = useState("");
  const [chatPerson, setChatPerson] = useState<ChatPerson | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  useEffect(() => { const load = async () => { const response = await fetch("/api/people", { cache: "no-store" }); if (response.ok) setPeople(await response.json()); }; load(); const timer = window.setInterval(load, 30000); const handleConversationOpened = () => setRefreshToken((value) => value + 1); window.addEventListener("office-games:conversation-opened", handleConversationOpened); return () => { window.clearInterval(timer); window.removeEventListener("office-games:conversation-opened", handleConversationOpened); }; }, [refreshToken]);
  const filtered = useMemo(() => people.filter((person) => `${person.full_name} ${person.department || ""} ${person.position || ""}`.toLowerCase().includes(search.toLowerCase())), [people, search]);
  const online = filtered.filter((person) => person.is_online);
  const offline = filtered.filter((person) => !person.is_online);
  const lastSeen = (person: Person) => { if (person.is_online) return person.activity || "Online now"; if (!person.online_at) return "Not active yet"; const minutes = Math.max(1, Math.floor((Date.now() - new Date(person.online_at).getTime()) / 60000)); return minutes < 60 ? `Last seen ${minutes}m ago` : `Last seen ${Math.floor(minutes / 60)}h ago`; };
  const card = (person: Person) => <div key={person.user_id} className="group flex items-center justify-between gap-4 rounded-3xl border border-border/60 bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
    <Link href={`/profile/${person.user_id}`} className="flex min-w-0 items-center gap-3">
      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary">
        {person.avatar_url ? <img src={person.avatar_url} alt={`${person.full_name} avatar`} className="h-full w-full object-cover" /> : <User className="text-muted-foreground" size={22} />}
        <span className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-card ${person.is_online ? "bg-emerald-500" : "bg-slate-300"}`} />
      </div>
      <div className="min-w-0"><p className="truncate font-black">{person.full_name || "Unnamed coworker"}</p><p className={`truncate text-sm ${person.is_online ? "text-emerald-600" : "text-muted-foreground"}`}>{lastSeen(person)}</p><p className="truncate text-xs text-muted-foreground">{person.position || person.department || "Coworker"}</p></div>
    </Link>
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2"><button onClick={() => setChatPerson({ id: person.user_id, full_name: person.full_name, avatar_url: person.avatar_url })} className="relative inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-bold hover:bg-secondary"><MessageCircle size={16} /> <span className="hidden sm:inline">Message</span>{person.unread_count > 0 && <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground">{person.unread_count > 9 ? "9+" : person.unread_count}</span>}</button><div className="w-auto min-w-[112px]"><ChallengeMenu targetUserId={person.user_id} /></div></div>
  </div>;
  return <div className="space-y-8"><div className="relative"><Search className="absolute left-4 top-3.5 text-muted-foreground" size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search coworkers" className="w-full rounded-2xl border border-border/60 bg-card py-3 pl-11 pr-4 outline-none focus:border-primary" /></div><section><div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-black">Active now</h2><span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-600">{online.length} online</span></div><div className="grid gap-3 md:grid-cols-2">{online.length ? online.map(card) : <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">Nobody else is online right now.</p>}</div></section><section><h2 className="mb-3 text-xl font-black">Everyone</h2><div className="grid gap-3 md:grid-cols-2">{offline.length ? offline.map(card) : <p className="text-sm text-muted-foreground">No offline coworkers match your search.</p>}</div></section>{chatPerson && <DirectMessagePopup userId={userId} person={chatPerson} onClose={() => setChatPerson(null)} />}</div>;
}
