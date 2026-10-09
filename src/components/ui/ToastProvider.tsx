"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircle2, X, XCircle } from "lucide-react";

type Toast = { id: number; message: string; tone: "success" | "error" };
type ToastContextValue = { toast: (message: string, tone?: Toast["tone"]) => void };
const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() { const value = useContext(ToastContext); if (!value) throw new Error("useToast must be used inside ToastProvider"); return value; }

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = useCallback((message: string, tone: Toast["tone"] = "error") => { const id = Date.now() + Math.random(); setToasts((current) => [...current, { id, message, tone }].slice(-4)); window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 4500); }, []);
  const value = useMemo(() => ({ toast }), [toast]);
  return <ToastContext.Provider value={value}>{children}<div className="pointer-events-none fixed bottom-5 left-1/2 z-[200] flex w-[min(420px,calc(100vw-2rem))] -translate-x-1/2 flex-col gap-2">{toasts.map((item) => <div key={item.id} role="status" className={`pointer-events-auto flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 text-sm font-bold shadow-2xl ${item.tone === "success" ? "border-emerald-500/30" : "border-destructive/30"}`}>{item.tone === "success" ? <CheckCircle2 className="shrink-0 text-emerald-600" size={18}/> : <XCircle className="shrink-0 text-destructive" size={18}/>}<span className="min-w-0 flex-1">{item.message}</span><button onClick={() => setToasts((current) => current.filter((toastItem) => toastItem.id !== item.id))} aria-label="Dismiss notification"><X size={16}/></button></div>)}</div></ToastContext.Provider>;
}
