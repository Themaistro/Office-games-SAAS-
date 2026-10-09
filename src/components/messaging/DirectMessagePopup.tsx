"use client";

import { FormEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MessageCircle, Minus, Send, User, X } from "lucide-react";

type Person = { id: string; full_name: string; avatar_url?: string | null };
type Message = { id: string; sender_id: string; body: string; created_at: string };

export default function DirectMessagePopup({ userId, person, onClose }: { userId: string; person: Person; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [minimized, setMinimized] = useState(false);
  const [sending, setSending] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const load = async () => { const response = await fetch(`/api/messages?with=${person.id}`, { cache: "no-store" }); if (response.ok) { setMessages(await response.json()); window.dispatchEvent(new CustomEvent("office-games:conversation-opened", { detail: { userId: person.id } })); } };
  useEffect(() => { load(); const timer = window.setInterval(load, 5000); return () => window.clearInterval(timer); }, [person.id]);
  const send = async (event: FormEvent) => { event.preventDefault(); const text = body.trim(); if (!text || sending) return; setSending(true); const response = await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recipientId: person.id, body: text }) }); if (response.ok) { setBody(""); await load(); } setSending(false); };
  if (!mounted) return null;
  return createPortal(<div className={`fixed bottom-20 right-4 z-[100] w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border/70 bg-card shadow-2xl sm:bottom-4 sm:right-24 ${minimized ? "h-auto" : ""}`}><div className="flex items-center gap-3 bg-primary px-4 py-3 text-primary-foreground"><div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-white/20">{person.avatar_url ? <img src={person.avatar_url} alt={`${person.full_name} avatar`} className="h-full w-full object-cover" /> : <User size={16}/>}</div><p className="min-w-0 flex-1 truncate text-sm font-black">{person.full_name}</p><button onClick={() => setMinimized(!minimized)} aria-label={minimized ? "Expand chat" : "Minimize chat"} className="rounded-lg p-1 hover:bg-white/15"><Minus size={17}/></button><button onClick={onClose} aria-label="Close chat" className="rounded-lg p-1 hover:bg-white/15"><X size={17}/></button></div>{!minimized && <><div className="flex h-72 flex-col gap-2 overflow-y-auto bg-background/60 p-4">{messages.length ? messages.map((message) => <div key={message.id} className={`flex ${message.sender_id === userId ? "justify-end" : "justify-start"}`}><p className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${message.sender_id === userId ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{message.body}</p></div>) : <div className="m-auto text-center text-sm text-muted-foreground"><MessageCircle className="mx-auto mb-2 text-primary" size={24}/>Start the conversation.</div>}</div><form onSubmit={send} className="flex gap-2 border-t border-border/60 bg-card p-3"><input value={body} onChange={(event) => setBody(event.target.value)} maxLength={2000} placeholder="Write a message..." className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" /><button disabled={sending || !body.trim()} aria-label="Send message" className="rounded-xl bg-primary px-3 text-primary-foreground disabled:opacity-50"><Send size={16}/></button></form></>}</div>, document.body);
}
