"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Brain, LayoutDashboard, Users, HelpCircle, Settings, LogOut, BarChart } from "lucide-react";

interface AdminMobileMenuProps {
  onSignOut: () => void;
}

export default function AdminMobileMenu({ onSignOut }: AdminMobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close the menu when navigating
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const navLinks = [
    { name: "Overview", href: "/admin", icon: LayoutDashboard },
    { name: "Analytics Dashboard", href: "/admin/analytics", icon: BarChart },
    { name: "Player Roster", href: "/admin/users", icon: Users },
    { name: "Departments", href: "/admin/departments", icon: LayoutDashboard },
    { name: "Announcements", href: "/admin/announcements", icon: HelpCircle },
    { name: "Prizes", href: "/admin/prizes", icon: LayoutDashboard },
    { name: "Custom Questions", href: "/admin/questions", icon: HelpCircle },
    { name: "Games Management", href: "/admin/games", icon: Brain },
    { name: "Settings", href: "/admin/settings", icon: Settings },
  ];

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)} 
        className="p-2 -ml-2 mr-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
      >
        <Menu size={24} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
            <div className="h-16 flex items-center justify-between px-6 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                  <Brain size={20} />
                </div>
                <span className="text-lg font-bold tracking-tight text-foreground">
                  Admin Arena
                </span>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 -mr-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <nav className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 custom-scrollbar">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                const Icon = link.icon;
                return (
                  <Link 
                    key={link.name}
                    href={link.href} 
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
                      isActive 
                        ? "bg-primary text-primary-foreground shadow-sm" 
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon size={18} />
                    {link.name}
                  </Link>
                );
              })}
              
              <div className="mt-4 pt-4 border-t border-border">
                <button 
                  onClick={onSignOut}
                  className="flex items-center justify-start gap-3 w-full px-3 py-2.5 rounded-lg text-destructive hover:bg-destructive/10 font-medium transition-colors"
                >
                  <LogOut size={18} />
                  Sign Out
                </button>
              </div>
            </nav>
          </div>
        </>
      )}
    </>
  );
}
