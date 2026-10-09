"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Bell, CircleDot, Swords, X as XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { acceptChallenge } from "@/app/dashboard/chess/actions";
import { acceptTttChallenge } from "@/app/dashboard/ttt/actions";
import { acceptConnectFourChallenge } from "@/app/dashboard/connect-four/actions";
import DirectMessagePopup from "@/components/messaging/DirectMessagePopup";
import { useToast } from "@/components/ui/ToastProvider";

interface NotificationBellProps {
  userId: string;
  showBell?: boolean;
}

export default function NotificationBellClient({ userId, showBell = true }: NotificationBellProps) {
  const [challenges, setChallenges] = useState<any[]>([]);
  const [challengeAlert, setChallengeAlert] = useState<any | null>(null);
  const [queuedChallengeAlerts, setQueuedChallengeAlerts] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [notificationHistory, setNotificationHistory] = useState<any[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [messageAlert, setMessageAlert] = useState<any | null>(null);
  const [queuedMessageAlerts, setQueuedMessageAlerts] = useState<any[]>([]);
  const unreadMessagesRef = useRef(0);
  const hasLoadedMessagesRef = useRef(false);
  const challengeCountRef = useRef(0);
  const hasLoadedChallengesRef = useRef(false);
  const [chatPerson, setChatPerson] = useState<{ id: string; full_name: string; avatar_url?: string | null } | null>(null);
  const [challengeConfirmation, setChallengeConfirmation] = useState<{ challenge: any; inDailyMission: boolean; inLiveMatch: boolean } | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { toast } = useToast();
  const activeChallengeAlert = challengeAlert || challenges[0] || null;

  const fetchChallenges = async () => {
    if (!userId) return;
    
    const response = await fetch('/api/challenges', { cache: 'no-store' });
    if (response.ok) {
      const nextChallenges = (await response.json()).map((c: any) => ({ ...c, createdAt: new Date(c.created_at).getTime() })).filter((challenge: any, index: number, list: any[]) => list.findIndex((item) => item.id === challenge.id) === index);
      if (nextChallenges[0] && (!hasLoadedChallengesRef.current || nextChallenges.length > challengeCountRef.current)) {
        setChallengeAlert((current: any | null) => {
          if (!current) return nextChallenges[0];
          if (current.id !== nextChallenges[0].id) {
            setQueuedChallengeAlerts((queue) => queue.some((item) => item.id === nextChallenges[0].id || item.id === current.id) ? queue : [nextChallenges[0], ...queue].slice(0, 4));
          }
          return current;
        });
      }
      setChallenges(nextChallenges);
      setChallengeAlert((current: any | null) => current && nextChallenges.some((challenge: any) => challenge.id === current.id) ? current : nextChallenges[0] || null);
      setQueuedChallengeAlerts((queue) => queue.filter((challenge, index, list) => nextChallenges.some((item: any) => item.id === challenge.id) && list.findIndex((item) => item.id === challenge.id) === index));
      challengeCountRef.current = nextChallenges.length;
      hasLoadedChallengesRef.current = true;
    }
  };

  const fetchMessages = async () => {
    const response = await fetch('/api/messages', { cache: 'no-store' });
    if (response.ok) {
      const result = await response.json();
      const nextMessages = result.messages || [];
      const nextUnread = result.unreadCount || 0;
      if (hasLoadedMessagesRef.current && nextUnread > unreadMessagesRef.current && nextMessages[0]) {
        setMessageAlert((current: any | null) => { if (current) setQueuedMessageAlerts((queue) => [nextMessages[0], ...queue].slice(0, 4)); return nextMessages[0]; });
        const audio = new Audio("/sounds/check.mp3");
        audio.volume = 0.35;
        audio.play().catch(() => undefined);
      }
      setMessages(nextMessages);
      setUnreadMessages(nextUnread);
      unreadMessagesRef.current = nextUnread;
      hasLoadedMessagesRef.current = true;
    }
  };

  const fetchNotificationHistory = async () => {
    const response = await fetch("/api/notifications", { cache: "no-store" });
    if (response.ok) setNotificationHistory((await response.json()).history || []);
  };

  useEffect(() => {
    fetchChallenges();
    fetchMessages();
    fetchNotificationHistory();

    const handleNewChallenge = () => {
      fetchChallenges();
      fetchMessages();
      setIsOpen(true);
      const audio = new Audio("/sounds/check.mp3");
      audio.volume = 0.5;
      audio.play().catch(e => console.log("Audio blocked by browser", e));
    };

    const refreshOnFocus = () => { if (document.visibilityState === "visible") { fetchChallenges(); fetchMessages(); } };
    document.addEventListener("visibilitychange", refreshOnFocus);
    window.addEventListener("focus", refreshOnFocus);
    const timer = window.setInterval(() => { fetchChallenges(); fetchMessages(); fetchNotificationHistory(); }, 3000);
    const handleConversationOpened = (event: Event) => {
      const senderId = (event as CustomEvent<{ userId?: string }>).detail?.userId;
      setMessageAlert((current: any | null) => current?.sender_id === senderId ? null : current);
      setQueuedMessageAlerts((queue) => queue.filter((message) => message.sender_id !== senderId));
      fetchMessages();
    };
    const handleOpenChat = (event: Event) => {
      // The layout mounts a hidden notification client for global alerts while
      // the navbar mounts the visible client. Only one client should own the
      // chat window, otherwise one click can create duplicate popups.
      if (!showBell) return;
      const person = (event as CustomEvent<{ person?: { id: string; full_name: string; avatar_url?: string | null } }>).detail?.person;
      if (person?.id) setChatPerson(person);
    };
    window.addEventListener("office-games:conversation-opened", handleConversationOpened);
    window.addEventListener("office-games:open-chat", handleOpenChat);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", refreshOnFocus); window.removeEventListener("focus", refreshOnFocus); window.removeEventListener("office-games:conversation-opened", handleConversationOpened); window.removeEventListener("office-games:open-chat", handleOpenChat); };
  }, [userId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAccept = async (challenge: any) => {
    const path = window.location.pathname;
    const inDailyMission = path === "/play" || path.startsWith("/daily-mission");
    const inLiveMatch = path.includes("/dashboard/chess/") || path.includes("/dashboard/ttt/") || path.includes("/dashboard/connect-four/");
    if (inDailyMission || inLiveMatch) {
      setChallengeConfirmation({ challenge, inDailyMission, inLiveMatch });
      return;
    }
    await acceptChallengeNow(challenge);
  };

  const acceptChallengeNow = async (challenge: any) => {
    try {
      if (challenge.type === "chess") {
        await acceptChallenge(challenge.id);
      } else if (challenge.type === "ttt") {
        await acceptTttChallenge(challenge.id);
      } else {
        await acceptConnectFourChallenge(challenge.id);
      }
    } catch (err: any) {
      if (err.message === "NEXT_REDIRECT") throw err;
      toast("Failed to join game: " + err.message);
    }
  };

  const handleDecline = async (challenge: any) => {
    await fetch("/api/challenges", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: challenge.id, type: challenge.type }) });
    setChallengeAlert(null);
    fetchChallenges();
  };

  if (!userId) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {showBell && <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-secondary transition-colors"
      >
        <Bell size={20} className="text-muted-foreground" />
        {(challenges.length > 0 || unreadMessages > 0) && (
          <div className="absolute top-1.5 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-background animate-pulse" />
        )}
      </button>}

      {showBell && isOpen && (
        <div className="fixed right-4 top-20 z-[120] w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 sm:right-8">
          <div className="px-4 py-3 border-b border-border/40 bg-muted/20 flex justify-between items-center">
            <p className="text-sm font-bold text-foreground">Notifications</p>
            <div className="flex items-center gap-2"><button onClick={() => setHistoryOpen(!historyOpen)} className="text-[11px] font-bold text-primary hover:underline">{historyOpen ? "Unread" : "History"}</button><span className="text-xs font-semibold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">{challenges.length + unreadMessages}</span></div>
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {historyOpen ? notificationHistory.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">No notification history yet.</div>
            ) : <div className="flex flex-col">{notificationHistory.map((item) => <div key={`${item.kind}-${item.id}`} className="border-b border-border/40 p-3"><div className="flex items-start gap-2"><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${item.unread ? "bg-primary" : "bg-border"}`} /><div className="min-w-0"><p className="text-sm font-bold">{item.title}</p><p className="truncate text-xs text-muted-foreground">{item.description}</p><p className="mt-1 text-[10px] text-muted-foreground">{new Date(item.created_at).toLocaleString()}</p></div></div></div>)}</div> : challenges.length === 0 && messages.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No new challenges right now.
              </div>
            ) : (
              <div className="flex flex-col">
                {messages.map((message) => <button key={`message-${message.sender_id}`} onClick={() => { setChatPerson({ id: message.sender_id, full_name: message.full_name, avatar_url: message.avatar_url }); setIsOpen(false); }} className="border-b border-border/40 p-3 text-left hover:bg-muted/50"><p className="text-sm font-medium"><span className="font-bold text-primary">{message.full_name}</span> sent you {message.unread_count} new message{message.unread_count === 1 ? "" : "s"}.</p><span className="mt-1 block text-xs font-bold text-primary">Open chat →</span></button>)}
                {challenges.map((c) => (
                  <div key={c.id} className="p-3 border-b border-border/40 hover:bg-muted/50 transition-colors">
                    <p className="text-sm font-medium mb-2">
                      <span className="font-bold text-primary">{c.challenger}</span> challenged you to a game of <span className="font-bold">{c.type === 'chess' ? 'Chess' : c.type === 'ttt' ? 'Tic Tac Toe' : 'Connect Four'}</span>!
                    </p>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleAccept(c)}
                        className="flex-1 flex items-center justify-center gap-1 bg-primary text-primary-foreground text-xs font-bold py-1.5 rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        {c.type === "chess" ? <Swords size={12} /> : c.type === "ttt" ? <XIcon size={12} /> : <CircleDot size={12} />} Accept
                      </button>
                      <button
                        onClick={() => handleDecline(c)}
                        className="flex-1 rounded-lg bg-secondary py-1.5 text-xs font-bold hover:bg-secondary/80 transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {chatPerson && <DirectMessagePopup userId={userId} person={chatPerson} onClose={() => { setChatPerson(null); fetchMessages(); }} />}
      {challengeConfirmation && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="challenge-confirm-title">
          <div className="w-full max-w-md rounded-3xl border border-border/60 bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/15 text-2xl">⚔️</div>
            <h2 id="challenge-confirm-title" className="text-xl font-black text-foreground">Accept this challenge?</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {challengeConfirmation.inDailyMission
                ? "Your Daily Mission progress will be saved, but you will leave the mission to join this match."
                : "You are currently playing a live match. Accepting this challenge will resign your current game and count as a loss."}
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button onClick={() => setChallengeConfirmation(null)} className="rounded-xl border border-border px-4 py-3 text-sm font-bold text-muted-foreground hover:bg-secondary">Stay here</button>
              <button onClick={() => { const item = challengeConfirmation.challenge; setChallengeConfirmation(null); void acceptChallengeNow(item); }} className="rounded-xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground shadow-sm hover:bg-primary/90">Accept challenge</button>
            </div>
          </div>
        </div>
      )}
      {messageAlert && !chatPerson && (
        <button
          onClick={() => { setChatPerson({ id: messageAlert.sender_id, full_name: messageAlert.full_name, avatar_url: messageAlert.avatar_url }); setMessageAlert(null); }}
          className="group fixed bottom-24 right-6 z-[110] flex h-16 w-16 items-center justify-center rounded-full border-4 border-card bg-primary shadow-2xl ring-4 ring-primary/20 animate-in zoom-in-75 duration-300 sm:right-8"
          aria-label={`Open message from ${messageAlert.full_name}`}
        >
          <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-accent text-xl font-black text-primary-foreground">
            {messageAlert.avatar_url ? <img src={messageAlert.avatar_url} alt="" className="h-full w-full object-cover" /> : messageAlert.full_name?.charAt(0)?.toUpperCase() || "M"}
          </div>
          <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-card bg-destructive px-1 text-[11px] font-black text-destructive-foreground">1</span>
          <span className="pointer-events-none absolute right-20 top-1/2 w-max -translate-y-1/2 rounded-xl bg-card px-3 py-2 text-xs font-bold text-foreground opacity-0 shadow-xl transition-opacity group-hover:opacity-100">{messageAlert.full_name} sent you a message</span>
        </button>
      )}
      {!chatPerson && queuedMessageAlerts.map((alert, index) => (
        <button key={`${alert.sender_id}-${index}`} onClick={() => { setChatPerson({ id: alert.sender_id, full_name: alert.full_name, avatar_url: alert.avatar_url }); setQueuedMessageAlerts((queue) => queue.filter((_, itemIndex) => itemIndex !== index)); }} style={{ bottom: `${24 + (index + 1) * 5}rem` }} className="group fixed right-6 z-[110] flex h-14 w-14 items-center justify-center rounded-full border-4 border-card bg-primary shadow-2xl ring-4 ring-primary/20 animate-in zoom-in-75 duration-300 sm:right-8" aria-label={`Open message from ${alert.full_name}`}>
          <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-accent text-lg font-black text-primary-foreground">{alert.avatar_url ? <img src={alert.avatar_url} alt="" className="h-full w-full object-cover" /> : alert.full_name?.charAt(0)?.toUpperCase() || "M"}</div>
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-card bg-destructive text-[10px] font-black text-destructive-foreground">1</span>
        </button>
      ))}
      {/* Challenge alerts are intentionally independent from chat. A player
          must see an incoming invite even while messaging someone or while
          the notification history panel is open. */}
      {typeof document !== "undefined" && createPortal(<>
      {activeChallengeAlert && (
        <div className="fixed bottom-24 right-6 z-[110] sm:right-8">
          <button onClick={() => setChallengeAlert(null)} className="group flex h-16 w-16 items-center justify-center rounded-full border-4 border-card bg-orange-500 text-2xl text-white shadow-2xl ring-4 ring-orange-500/20 animate-in zoom-in-75 duration-300" aria-label={`Challenge from ${activeChallengeAlert.challenger}`}>
          ⚔️
          <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-card bg-destructive px-1 text-[11px] font-black text-destructive-foreground">1</span>
          <span className="pointer-events-none absolute right-20 top-1/2 w-max -translate-y-1/2 rounded-xl bg-card px-3 py-2 text-xs font-bold text-foreground opacity-0 shadow-xl transition-opacity group-hover:opacity-100">{activeChallengeAlert.challenger} challenged you to {activeChallengeAlert.type === "chess" ? "Chess" : activeChallengeAlert.type === "ttt" ? "Tic-Tac-Toe" : "Connect Four"}</span>
          </button>
          <div className="absolute bottom-0 right-20 w-56 rounded-2xl border border-border bg-card p-3 text-center shadow-2xl">
            <p className="text-xs font-bold">{activeChallengeAlert.challenger} challenged you</p>
            <div className="mt-2 flex gap-2"><button onClick={() => handleAccept(activeChallengeAlert)} className="flex-1 rounded-lg bg-primary px-2 py-1.5 text-xs font-black text-primary-foreground">Accept</button><button onClick={() => handleDecline(activeChallengeAlert)} className="flex-1 rounded-lg bg-secondary px-2 py-1.5 text-xs font-black">Decline</button></div>
          </div>
        </div>
      )}
      {queuedChallengeAlerts.map((alert, index) => (
        <button key={`${alert.id}-${index}`} onClick={() => { setChallengeAlert(alert); setQueuedChallengeAlerts((queue) => queue.filter((_, itemIndex) => itemIndex !== index)); }} style={{ bottom: `${44 + (index + 1) * 5}rem` }} className="fixed right-6 z-[110] flex h-14 w-14 items-center justify-center rounded-full border-4 border-card bg-orange-500 text-xl text-white shadow-2xl ring-4 ring-orange-500/20 animate-in zoom-in-75 duration-300 sm:right-8" aria-label={`Open challenge from ${alert.challenger}`}>⚔️<span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-card bg-destructive text-[10px] font-black text-destructive-foreground">1</span></button>
      ))}
      </>, document.body)}
    </div>
  );
}

