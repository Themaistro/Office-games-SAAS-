import { ReactNode } from "react";

export default function GameShell({ children }: { children: ReactNode }) {
  return <section className="w-full rounded-3xl border border-border/60 bg-card/35 p-3 shadow-sm sm:p-5">
    <div className="mx-auto flex min-h-[360px] w-full items-center justify-center rounded-2xl bg-background/35 p-2 sm:p-5">
      {children}
    </div>
  </section>;
}
