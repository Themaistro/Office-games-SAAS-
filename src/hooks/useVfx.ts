"use client";

import confetti from "canvas-confetti";
import { useCallback } from "react";

export function useVfx() {
  const triggerConfetti = useCallback(() => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#26ccff", "#a25afd", "#ff5e7e", "#88ff5a", "#fcff42", "#ffa62d", "#ff36ff"]
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#26ccff", "#a25afd", "#ff5e7e", "#88ff5a", "#fcff42", "#ffa62d", "#ff36ff"]
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    
    frame();
  }, []);

  const triggerShake = useCallback((elementId: string) => {
    const el = document.getElementById(elementId);
    if (!el) return;
    
    el.classList.remove("animate-shake");
    // Trigger reflow to restart animation
    void el.offsetWidth;
    el.classList.add("animate-shake");
    
    setTimeout(() => {
      el.classList.remove("animate-shake");
    }, 500);
  }, []);

  return { triggerConfetti, triggerShake };
}
