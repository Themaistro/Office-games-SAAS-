"use client";

import React, { useEffect, useState, useRef } from "react";
import { Brain, Target, Zap, Trophy, Calculator, LayoutGrid, Focus, Puzzle } from "lucide-react";

// The games we want to bounce around
const GAMES = [
  { id: "target", icon: Target, label: "Hit the Daily Target", color: "text-rose-500", glow: "shadow-rose-500/20" },
  { id: "typing", icon: Zap, label: "Test Your Typing Speed", color: "text-amber-500", glow: "shadow-amber-500/20" },
  { id: "letters", icon: Brain, label: "Expand Your Vocabulary", color: "text-blue-500", glow: "shadow-blue-500/20" },
  { id: "trivia", icon: Trophy, label: "3,000+ Trivia Questions", color: "text-emerald-500", glow: "shadow-emerald-500/20" },
  { id: "math", icon: Calculator, label: "Sharpen Your Mental Math", color: "text-purple-500", glow: "shadow-purple-500/20" },
  { id: "memory", icon: LayoutGrid, label: "Boost Your Memory", color: "text-cyan-500", glow: "shadow-cyan-500/20" },
  { id: "concentration", icon: Focus, label: "Achieve Deep Focus", color: "text-orange-500", glow: "shadow-orange-500/20" },
  { id: "logic", icon: Puzzle, label: "Master Logic Puzzles", color: "text-indigo-500", glow: "shadow-indigo-500/20" },
];

interface Bouncer {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export default function BouncingBackground() {
  const [bouncers, setBouncers] = useState<Bouncer[]>([]);
  const [activeBatch, setActiveBatch] = useState(0);
  const requestRef = useRef<number>(0);
  const hoveredIdRef = useRef<string | null>(null);
  
  // Size of the new elegant pill container
  const ITEM_WIDTH = 260;
  const ITEM_HEIGHT = 64;
  
  // Handle the active batch rotation (swap every 8 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveBatch((prev) => (prev === 0 ? 1 : 0));
    }, 8000);
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    // Initialize random positions and velocities for each game
    const initialBouncers = GAMES.map((game) => {
      // Random starting positions (safely within bounds)
      const x = Math.random() * (window.innerWidth - ITEM_WIDTH);
      const y = Math.random() * (window.innerHeight - ITEM_HEIGHT);
      
      // Random velocity between 0.8 and 1.5, random direction
      const speed = 1.2;
      const vx = (Math.random() > 0.5 ? speed : -speed) * (0.8 + Math.random() * 0.4);
      const vy = (Math.random() > 0.5 ? speed : -speed) * (0.8 + Math.random() * 0.4);
      
      return { id: game.id, x, y, vx, vy };
    });
    
    setBouncers(initialBouncers);
    
    // Animation loop
    const animate = () => {
      setBouncers((prev) => 
        prev.map((bouncer) => {
          // Pause movement if this specific pill is being hovered
          if (hoveredIdRef.current === bouncer.id) {
            return bouncer;
          }
          
          let { x, y, vx, vy } = bouncer;
          
          // Move
          x += vx;
          y += vy;
          
          // Check collision with screen edges
          if (x <= 0) {
            x = 0;
            vx = Math.abs(vx);
          } else if (x >= window.innerWidth - ITEM_WIDTH) {
            x = window.innerWidth - ITEM_WIDTH;
            vx = -Math.abs(vx);
          }
          
          if (y <= 0) {
            y = 0;
            vy = Math.abs(vy);
          } else if (y >= window.innerHeight - ITEM_HEIGHT) {
            y = window.innerHeight - ITEM_HEIGHT;
            vy = -Math.abs(vy);
          }
          
          return { ...bouncer, x, y, vx, vy };
        })
      );
      
      requestRef.current = requestAnimationFrame(animate);
    };
    
    requestRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  // Return nothing during SSR to avoid hydration mismatch
  if (bouncers.length === 0) return null;

  return (
    <div className="absolute inset-0 z-30 overflow-hidden pointer-events-none">
      {bouncers.map((bouncer, index) => {
        const game = GAMES.find((g) => g.id === bouncer.id);
        if (!game) return null;
        
        // Determine if this bouncer is in the current active batch
        const isVisible = activeBatch === 0 ? index < 4 : index >= 4;
        const Icon = game.icon;
        
        return (
          <div
            key={bouncer.id}
            onMouseEnter={() => (hoveredIdRef.current = bouncer.id)}
            onMouseLeave={() => (hoveredIdRef.current = null)}
            className={`absolute flex items-center gap-3 px-3 rounded-full bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-2xl ${game.glow} will-change-transform transition-all duration-1000 ease-out pointer-events-auto cursor-pointer hover:!scale-110 hover:brightness-110 hover:z-50 ${
              isVisible ? "opacity-100 scale-100" : "opacity-0 scale-75 pointer-events-none"
            }`}
            style={{
              width: ITEM_WIDTH,
              height: ITEM_HEIGHT,
              transform: `translate3d(${bouncer.x}px, ${bouncer.y}px, 0)`,
            }}
          >
            <div className={`flex shrink-0 items-center justify-center w-11 h-11 rounded-full bg-white/90 dark:bg-black/80 shadow-md ${game.color} transition-transform group-hover:rotate-12`}>
              <Icon size={22} />
            </div>
            <span className="text-sm font-bold text-foreground/90 tracking-tight drop-shadow-sm leading-tight pr-2">
              {game.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
