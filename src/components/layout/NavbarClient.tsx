"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brain, LogOut, User, Trophy, Flame, LayoutDashboard, Settings, ChevronDown, Shield } from "lucide-react";

interface NavbarClientProps {
  user: any;
  profile: any;
  onSignOut: () => void;
}

export default function NavbarClient({ user, profile, onSignOut }: NavbarClientProps) {
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navLinks = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
  ];

  if (profile?.role === "admin") {
    navLinks.push({ name: "Admin", href: "/admin/games", icon: Shield });
  }

  return (
    <div className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      {/* Floating Glass Pill */}
      <nav className="flex items-center gap-2 p-2 rounded-full bg-background/70 backdrop-blur-xl border border-border/60 shadow-2xl pointer-events-auto transition-all">
        
        {/* Brand Icon */}
        <Link 
          href="/dashboard" 
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:scale-105 transition-transform mr-2 ml-1"
        >
          <Brain size={20} />
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
            const Icon = link.icon;
            
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold transition-colors group ${
                  isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-primary rounded-full -z-10 shadow-sm animate-in zoom-in-95 duration-200" />
                )}
                <Icon size={16} className={isActive ? "text-primary-foreground" : "group-hover:scale-110 transition-transform"} />
                <span className="hidden sm:inline-block">{link.name}</span>
              </Link>
            );
          })}
        </div>

        <div className="w-px h-8 bg-border/60 mx-2" />

        {/* Stats Badge */}
        {user && profile && profile.role !== "admin" && (
          <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/40 mr-2 shadow-inner">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-muted-foreground uppercase">Lv</span>
              <span className="text-sm font-bold">{profile.current_level || 1}</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-border" />
            <div className="flex items-center gap-1.5 text-orange-500">
              <Flame size={14} className="animate-pulse" />
              <span className="text-sm font-bold">{profile.current_streak || 0}</span>
            </div>
          </div>
        )}

        {/* User Dropdown */}
        {user && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 pl-2 pr-4 py-1.5 rounded-full hover:bg-secondary/80 transition-colors border border-transparent hover:border-border/50 group"
            >
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/80 to-accent flex items-center justify-center text-primary-foreground font-bold shadow-sm">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="h-full w-full rounded-full object-cover" />
                ) : (
                  (profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || "U").toUpperCase()
                )}
              </div>
              <ChevronDown size={14} className={`text-muted-foreground transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-card border border-border/60 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-b border-border/40 bg-muted/20">
                  <p className="text-sm font-bold text-foreground truncate">{profile?.full_name || "User"}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <div className="p-2 space-y-1">
                  <Link 
                    href="/profile"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-colors"
                  >
                    <User size={16} />
                    My Profile
                  </Link>
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onSignOut();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </nav>
    </div>
  );
}
