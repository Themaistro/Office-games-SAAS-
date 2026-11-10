"use client";

import { useSharedPolling } from "@/hooks/useSharedPolling";
import { FormEvent, useState } from "react";
import { MessageCircle, Send, User } from "lucide-react";

type Props = {
  userId: string;
  person: { id: string; full_name: string; avatar_url?: string | null };
};
type Message = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export default function MessagesClient({ userId, person }: Props) {
  const snapshot = useSharedPolling<Message[]>(
    `/api/messages?with=${person.id}`,
    5000,
    userId,
  );
  const messages = snapshot.data ?? [];
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const send = async (event: FormEvent) => {
    event.preventDefault();
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: person.id, body: text }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok)
        throw new Error("Message could not be sent. Your draft is saved here.");
      setBody("");
      await snapshot.invalidate();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Connection lost. Try again.",
      );
    } finally {
      setSending(false);
    }
  };
  return (
    <div className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm">
      <div className="flex items-center gap-3 border-b border-border/60 bg-secondary/20 p-5">
        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-secondary">
          {person.avatar_url ? (
            <img
              src={person.avatar_url}
              alt={`${person.full_name} avatar`}
              className="h-full w-full object-cover"
            />
          ) : (
            <User size={20} />
          )}
        </div>
        <div>
          <p className="font-black">{person.full_name}</p>
          <p className="text-xs text-muted-foreground">
            Private office conversation
          </p>
        </div>
      </div>
      <div className="flex min-h-[360px] flex-col gap-3 p-5">
        {messages.length ? (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender_id === userId ? "justify-end" : "justify-start"}`}
            >
              <p
                className={`max-w-[75%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${message.sender_id === userId ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-secondary"}`}
              >
                {message.body}
              </p>
            </div>
          ))
        ) : (
          <div className="m-auto text-center">
            <MessageCircleIcon />
            <p className="mt-3 text-sm text-muted-foreground">
              Start the conversation.
            </p>
          </div>
        )}
      </div>
      {error && <p className="px-4 pb-2 text-sm text-destructive">{error}</p>}
      <form
        onSubmit={send}
        className="flex gap-2 border-t border-border/60 p-4"
      >
        <input
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={2000}
          placeholder="Write a message..."
          className="min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-primary"
        />
        <button
          disabled={sending || !body.trim()}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send size={16} /> {sending ? "Sending" : "Send"}
        </button>
      </form>
    </div>
  );
}

function MessageCircleIcon() {
  return (
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
      <MessageCircle size={22} />
    </div>
  );
}
