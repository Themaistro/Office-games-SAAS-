"use client";

import { useEffect } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export function useDashboardTutorial() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("has_seen_dashboard_tutorial")) return;

    // Small delay to let DOM render (especially Navbar)
    const timeoutId = setTimeout(() => {
      const el = document.getElementById("tour-dashboard");
      if (!el) return;

      const driverObj = driver({
        showProgress: true,
        animate: true,
        steps: [
          {
            element: "#tour-dashboard",
            popover: {
              title: "Welcome to Daily Brain Arena! 🧠",
              description: "This is your Dashboard. Here you can start your daily mission, play mini-games in the Lounge, and track your progress.",
              side: "bottom",
              align: "start"
            }
          },
          {
            element: "#tour-leaderboard",
            popover: {
              title: "Check the Ranks 🏆",
              description: "See how you stack up against your colleagues. Earn XP by completing daily missions to climb the leaderboard!",
              side: "bottom",
              align: "start"
            }
          }
        ],
        onDestroyStarted: () => {
          driverObj.destroy();
          localStorage.setItem("has_seen_dashboard_tutorial", "true");
        }
      });
      driverObj.drive();
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, []);
}

export function useGameTutorial() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("has_seen_game_tutorial")) return;

    const timeoutId = setTimeout(() => {
      const hintEl = document.getElementById("tour-hint-button");
      const skipEl = document.getElementById("tour-skip-button");
      
      if (!hintEl && !skipEl) return;

      const steps: any[] = [];
      if (hintEl) {
        steps.push({
          element: "#tour-hint-button",
          popover: {
            title: "Stuck? Use a Hint! 💡",
            description: "You get 3 hints per session. Use them if you're stuck, but remember that solving without hints grants bonus XP!",
            side: "top",
            align: "center"
          }
        });
      }
      
      if (skipEl) {
        steps.push({
          element: "#tour-skip-button",
          popover: {
            title: "Skip if needed ⏭️",
            description: "If a question is too hard, you can skip it. Be careful though, skipping will cost you 50 XP!",
            side: "top",
            align: "center"
          }
        });
      }

      const driverObj = driver({
        showProgress: true,
        animate: true,
        steps,
        onDestroyStarted: () => {
          driverObj.destroy();
          localStorage.setItem("has_seen_game_tutorial", "true");
        }
      });
      
      driverObj.drive();
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, []);
}
