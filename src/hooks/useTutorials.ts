"use client";

import { useEffect } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

import { createClient } from "@/lib/supabase/client";

export function useDashboardTutorial() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("has_seen_dashboard_tutorial")) return;

    const checkFirstTime = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("games_played").eq("id", user.id).single();
      if (!data || data.games_played > 0) return;

      // Small delay to let DOM render (especially Navbar)
      const timeoutId = setTimeout(() => {
        const el = document.getElementById("tour-dashboard");
        if (!el) return;

        const driverObj = driver({
          showProgress: true,
          animate: true,
          allowClose: false, // Force them to use the buttons
          showButtons: ['next', 'previous', 'close'],
          doneBtnText: 'Finish Tour',
          nextBtnText: 'Next',
          prevBtnText: 'Back',
          steps: [
            {
              popover: {
                title: "Welcome to Daily Brain Arena! 🧠",
                description: "Welcome! Let's take a quick tour to learn the ropes. You can skip this at any time.",
                nextBtnText: "Start Tour",
              }
            },
            {
              element: "#tour-daily-mission",
              popover: {
                title: "Your Daily Mission 🎯",
                description: "This is your main objective! Complete the daily mission to earn XP, level up, and keep your streak alive.",
                side: "bottom",
                align: "center"
              }
            },
            {
              element: "#tour-office-lounge",
              popover: {
                title: "The Office Lounge 🛋️",
                description: "Want to challenge a coworker? Create a Chess or Tic-Tac-Toe lobby here. Anyone on your team can join your open games!",
                side: "top",
                align: "center"
              }
            },
            {
              element: "#tour-leaderboard",
              popover: {
                title: "The Leaderboard 🏆",
                description: "Click here to see how you stack up against the rest of the company. Compete for the top spot every season!",
                side: "bottom",
                align: "start"
              }
            },
            {
              element: "#tour-profile-menu",
              popover: {
                title: "Your Profile 👤",
                description: "Click here to customize your avatar, view your match history, and check your ELO rating.",
                side: "bottom",
                align: "end"
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
    };
    checkFirstTime();
  }, []);
}

export function useGameTutorial() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("has_seen_game_tutorial")) return;

    const checkFirstTime = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("games_played").eq("id", user.id).single();
      if (!data || data.games_played > 0) return;

      const timeoutId = setTimeout(() => {
      const hintEl = document.getElementById("tour-hint-button");
      const skipEl = document.getElementById("tour-skip-button");
      
      if (!hintEl && !skipEl) return;

      const steps: any[] = [
        {
          popover: {
            title: "Your First Daily Mission! 🎯",
            description: "Welcome to your first mission! Let's take a quick look at the tools you have. You can skip this at any time.",
            nextBtnText: "Start Tour",
          }
        }
      ];
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
        allowClose: false,
        showButtons: ['next', 'previous', 'close'],
        doneBtnText: 'Finish Tour',
        nextBtnText: 'Next',
        prevBtnText: 'Back',
        steps,
        onDestroyStarted: () => {
          driverObj.destroy();
          localStorage.setItem("has_seen_game_tutorial", "true");
        }
      });
      
      driverObj.drive();
      }, 1500);
    };
    checkFirstTime();
  }, []);
}

export function useProfileTutorial() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("has_seen_profile_tutorial")) return;

    const checkFirstTime = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("games_played").eq("id", user.id).single();
      if (!data || data.games_played > 0) return;

      const timeoutId = setTimeout(() => {
        const el = document.getElementById("tour-profile-stats");
        if (!el) return;

        const driverObj = driver({
          showProgress: true,
          animate: true,
          allowClose: false,
          showButtons: ['next', 'previous', 'close'],
          doneBtnText: 'Finish Tour',
          nextBtnText: 'Next',
          prevBtnText: 'Back',
          steps: [
            {
              popover: {
                title: "Your Public Profile 👤",
                description: "This is what other players see when they click on your name.",
                nextBtnText: "Start Tour",
              }
            },
            {
              element: "#tour-profile-edit",
              popover: {
                title: "Customize Your Avatar",
                description: "Click here to pick a custom avatar to show off on the leaderboard and in game lobbies!",
                side: "bottom",
                align: "center"
              }
            },
            {
              element: "#tour-profile-stats",
              popover: {
                title: "Your Statistics 📊",
                description: "Track your Elo ratings in Chess and Tic-Tac-Toe, your total XP, and your best streak.",
                side: "top",
                align: "start"
              }
            }
          ],
          onDestroyStarted: () => {
            driverObj.destroy();
            localStorage.setItem("has_seen_profile_tutorial", "true");
          }
        });
        
        driverObj.drive();
      }, 1500);
    };
    checkFirstTime();
  }, []);
}
