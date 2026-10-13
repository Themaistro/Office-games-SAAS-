"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity, BarChart3, Brain, Building2, CircleHelp, Gift, LayoutDashboard,
  LogOut, Megaphone, Settings, ShieldCheck, Users, UserPlus,
} from "lucide-react";

const groups = [
  { label: "Workspace", links: [
    { name: "Overview", href: "/admin", icon: LayoutDashboard },
    { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  ]},
  { label: "People & content", links: [
    { name: "Player roster", href: "/admin/users", icon: Users },
    { name: "Departments", href: "/admin/departments", icon: Building2 },
    { name: "Onboarding", href: "/admin/onboarding", icon: UserPlus },
    { name: "Announcements", href: "/admin/announcements", icon: Megaphone },
  ]},
  { label: "Game operations", links: [
    { name: "Games", href: "/admin/games", icon: Brain },
    { name: "Questions", href: "/admin/questions", icon: CircleHelp },
    { name: "Prizes", href: "/admin/prizes", icon: Gift },
  ]},
];

export default function AdminSidebar({ onSignOut }: { onSignOut: () => void }) {
  const pathname = usePathname();
  return (
    <aside className="hidden h-screen w-72 shrink-0 self-start border-r border-border/70 bg-card/90 md:sticky md:top-0 md:flex md:flex-col">
      <div className="flex h-20 items-center gap-3 border-b border-border/70 px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"><ShieldCheck size={21} /></div>
        <div className="leading-none"><p className="text-[18px] font-black tracking-[-0.035em] text-foreground">Office <span className="text-primary">Games</span></p><div className="mt-2 flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /><p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">Admin console</p></div></div>
      </div>
      <nav className="flex-1 space-y-7 overflow-y-auto px-4 py-6">
        {groups.map((group) => <div key={group.label}>
          <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{group.label}</p>
          <div className="space-y-1">{group.links.map((link) => {
            const active = pathname === link.href || (link.href !== "/admin" && pathname.startsWith(`${link.href}/`));
            const Icon = link.icon;
            return <Link key={link.href} href={link.href} className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-all ${active ? "bg-primary text-primary-foreground shadow-md shadow-primary/15" : "text-muted-foreground hover:bg-primary/10 hover:text-primary"}`}>
              <Icon size={17} className={active ? "" : "opacity-75 group-hover:opacity-100"} />{link.name}
            </Link>;
          })}</div>
        </div>)}
        <div>
          <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">System</p>
          <Link href="/admin/settings" className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-all ${pathname === "/admin/settings" ? "bg-primary text-primary-foreground shadow-md shadow-primary/15" : "text-muted-foreground hover:bg-primary/10 hover:text-primary"}`}><Settings size={17} />Settings</Link>
        </div>
      </nav>
      <div className="border-t border-border/70 p-4">
        <div className="mb-3 flex items-center gap-3 rounded-xl bg-muted/50 p-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-sm font-black text-primary">A</div><div className="min-w-0"><p className="truncate text-sm font-bold">Platform admin</p><p className="text-xs text-muted-foreground">Full access</p></div></div>
        <button type="button" onClick={onSignOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-destructive transition-colors hover:bg-destructive/10"><LogOut size={17} />Sign out</button>
      </div>
    </aside>
  );
}
