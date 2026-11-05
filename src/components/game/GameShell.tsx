import { ReactNode } from "react";
import { Surface } from "@/components/ui/Surface";

export default function GameShell({ children }: { children: ReactNode }) {
  return (
    <Surface tone="game" className="w-full p-3 sm:p-5">
      <div className="mx-auto flex min-h-[360px] w-full items-center justify-center rounded-2xl bg-background/35 p-2 sm:p-5">
        {children}
      </div>
    </Surface>
  );
}
