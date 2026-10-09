import Navbar from "@/components/layout/Navbar";

export default function DailyMissionLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-col bg-background"><Navbar /><main className="flex-1 pt-28">{children}</main></div>;
}
