"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Search, UserRound, Users, X } from "lucide-react";
import DirectMessagePopup from "./DirectMessagePopup";

type Person = { user_id: string; full_name: string; avatar_url?: string | null; is_online: boolean; activity?: string; unread_count: number; online_at?: string | null };

export default function ContactsPanel({ userId }: { userId: string }) {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [chat, setChat] = useState<Person | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  useEffect(() => { const load = async () => { setLoading(true); try { const response = await fetch("/api/people", { cache: "no-store" }); if (response.ok) setPeople(await response.json()); } finally { setLoading(false); } }; load(); const timer = window.setInterval(load, 30000); const handleConversationOpened = () => setRefreshToken((value) => value + 1); window.addEventListener("office-games:conversation-opened", handleConversationOpened); return () => { window.clearInterval(timer); window.removeEventListener("office-games:conversation-opened", handleConversationOpened); }; }, [refreshToken]);
  const filtered = useMemo(() => people.filter((person) => person.full_name.toLowerCase().includes(search.toLowerCase())), [people, search]);
  const online = filtered.filter((person) => person.is_online);
  const unreadTotal = people.reduce((total, person) => total + (person.unread_count || 0), 0);
  return <>
    {!chat && <button onClick={() => setOpen(!open)} aria-label="Open contacts" className="fixed bottom-6 right-6 z-[90] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl ring-4 ring-primary/10 hover:scale-105 transition-transform">
      <Users size={22} />{unreadTotal > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-background bg-destructive px-1 text-[10px] font-black text-destructive-foreground">{unreadTotal > 9 ? "9+" : unreadTotal}</span>}<span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-primary ${online.length ? "bg-emerald-400" : "bg-slate-400"}`} />
    </button>}
    {open && !chat && <aside className="fixed bottom-24 right-6 z-[90] flex max-h-[min(620px,calc(100vh-8rem))] w-[min(340px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-border/60 bg-card shadow-2xl">
      <header className="flex items-center justify-between border-b border-border/60 px-5 py-4"><div><h2 className="font-black">Contacts</h2><p className="text-xs text-muted-foreground">{online.length} online now</p></div><button onClick={() => setOpen(false)} aria-label="Close contacts" className="rounded-lg p-2 hover:bg-secondary"><X size={17}/></button></header>
      <div className="border-b border-border/60 p-3"><div className="relative"><Search size={16} className="absolute left-3 top-3 text-muted-foreground"/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search contacts" className="w-full rounded-xl bg-secondary py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"/></div></div>
      <div className="overflow-y-auto p-2">{loading ? <div className="space-y-2 p-2">{[1, 2, 3, 4].map((item) => <div key={item} className="flex items-center gap-3 rounded-2xl px-3 py-3"><span className="h-10 w-10 animate-pulse rounded-full bg-secondary"/><span className="flex-1 space-y-2"><span className="block h-3 w-2/3 animate-pulse rounded bg-secondary"/><span className="block h-2 w-1/2 animate-pulse rounded bg-secondary"/></span></div>)}</div> : filtered.map((person) => <button key={person.user_id} onClick={() => { setChat(person); setOpen(false); }} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-secondary"><span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary">{person.avatar_url ? <img src={person.avatar_url} alt="" className="h-full w-full object-cover"/> : <UserRound size={18} className="text-muted-foreground"/>}<i className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card ${person.is_online ? "bg-emerald-500" : "bg-slate-300"}`}/></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{person.full_name}</span><span className="block truncate text-xs text-muted-foreground">{person.is_online ? person.activity || "Online now" : "Offline"}</span></span>{person.unread_count > 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-black text-primary-foreground">{person.unread_count}</span>}<MessageCircle size={16} className="text-muted-foreground"/></button>)}{!loading && !filtered.length && <p className="p-6 text-center text-sm text-muted-foreground">No contacts found.</p>}</div>
    </aside>}
    {chat && <DirectMessagePopup userId={userId} person={{ id: chat.user_id, full_name: chat.full_name, avatar_url: chat.avatar_url }} onClose={() => { setChat(null); setOpen(false); setRefreshToken((value) => value + 1); }} />}
  </>;
}
