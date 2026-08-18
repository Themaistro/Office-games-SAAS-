import React from "react";
import { Brain } from "lucide-react";

export default function GlobalLoading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6 animate-in fade-in duration-500">
        <div className="relative">
          {/* Glowing pulse rings */}
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
          <div className="absolute -inset-4 border-2 border-primary/20 rounded-full animate-ping duration-1000" />
          
          {/* Center Icon */}
          <div className="relative bg-background border border-border w-20 h-20 rounded-full flex items-center justify-center shadow-2xl">
            <Brain className="text-primary animate-pulse" size={40} />
          </div>
        </div>
        
        <div className="flex flex-col items-center">
          <h2 className="text-2xl font-black tracking-widest text-foreground">LOADING</h2>
          <div className="flex gap-1 mt-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
