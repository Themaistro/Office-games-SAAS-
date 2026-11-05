"use client";

import { ADMIN_NAVIGATION, ADMIN_SETTINGS_LINK } from "@/lib/admin-navigation";
import { Brain, LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

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
    ...ADMIN_NAVIGATION.flatMap((group) => group.links),
    ADMIN_SETTINGS_LINK,
  ];

  return (
    <>
      <button
        aria-label="Open admin navigation"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
        className="p-2 -ml-2 mr-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
      >
        <Menu size={24} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[150] bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-[160] flex w-72 flex-col border-r border-border bg-card shadow-2xl animate-in slide-in-from-left duration-300">
            <div className="h-16 flex items-center justify-between px-6 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                  <Brain size={20} />
                </div>
                <span className="leading-none">
                  <span className="text-lg font-black tracking-tight text-foreground">
                    Office <span className="text-primary">Games</span>
                  </span>
                  <span className="mt-1 flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Admin console
                  </span>
                </span>
              </div>
              <button
                aria-label="Close admin navigation"
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
                    aria-current={isActive ? "page" : undefined}
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
