import Link from "next/link";
import { Brain, Target, Users, Zap, Trophy, ShieldCheck, ArrowRight, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  let redirectUrl = null;
  try {
    const user = await getCurrentUser();

    if (user) {
      const { rows } = await query<{ role: string }>("SELECT role FROM profiles WHERE id = $1", [user.id]);
      const profile = rows[0];
      if (profile?.role === "admin") {
        redirectUrl = "/admin";
      } else {
        redirectUrl = "/dashboard";
      }
    }
  } catch (e) {
    console.error("Landing page database error:", e);
    // Continue to render landing page if db is down
  }

  if (redirectUrl) {
    redirect(redirectUrl);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-primary/5 rounded-full blur-3xl animate-[spin_20s_linear_infinite]" />
        <div className="absolute top-1/2 right-1/4 w-3/4 h-3/4 bg-accent/5 rounded-full blur-3xl animate-[spin_30s_linear_infinite_reverse]" />
        <div className="absolute bottom-0 w-full h-1/3 bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/40">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20">
              <Brain size={22} />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              Office Games
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="group relative inline-flex items-center justify-center text-sm font-semibold bg-primary text-primary-foreground px-5 py-2.5 rounded-full overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(var(--primary),0.4)]"
            >
              <span className="relative z-10 flex items-center gap-2">
                Log In <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 relative z-10">
        {/* Hero Section */}
        <section className="px-4 py-24 sm:py-32 lg:px-8 text-center flex flex-col items-center justify-center min-h-[70vh]">
          <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out">
            <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary shadow-sm backdrop-blur-md">
              <Sparkles size={16} className="mr-2 text-primary animate-pulse" />
              A better team break, every workday
            </div>
            <h1 className="text-5xl sm:text-7xl font-black tracking-tighter text-foreground leading-[1.1]">
              Give your team a <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">10-minute reason to connect.</span>
            </h1>
            <p className="text-xl sm:text-2xl text-muted-foreground max-w-2xl mx-auto font-medium leading-relaxed">
              A short daily mission of brain games, friendly competition, and team trivia that keeps people engaged without interrupting the workday.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
              <Link
                href="/login"
                className="group relative inline-flex items-center justify-center bg-foreground text-background px-8 py-4 rounded-2xl font-bold text-lg overflow-hidden transition-all hover:scale-105 hover:shadow-2xl w-full sm:w-auto"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Start today’s mission <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
                </span>
                <div className="absolute inset-0 bg-primary translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="px-4 pb-32 lg:px-8 max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                icon: Zap,
                title: "One short daily mission",
                desc: "Give employees a clear 10–15 minute activity they can finish between meetings and return to tomorrow.",
                color: "text-amber-500",
                bg: "bg-amber-500/10",
              },
              {
                icon: Brain,
                title: "Made for your company",
                desc: "Mix brain games with company trivia so teams build shared culture while they compete.",
                color: "text-blue-500",
                bg: "bg-blue-500/10",
              },
              {
                icon: Trophy,
                title: "Team energy you can measure",
                desc: "Track participation, streaks, and team momentum without turning play into a performance review.",
                color: "text-emerald-500",
                bg: "bg-emerald-500/10",
              }
            ].map((feature, i) => (
              <div 
                key={i} 
                className="group relative bg-card/40 backdrop-blur-xl border border-border/50 p-8 rounded-3xl transition-all duration-500 hover:-translate-y-2 hover:bg-card/80 hover:shadow-xl hover:shadow-primary/5 overflow-hidden"
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 ${feature.bg}`}>
                  <feature.icon className={feature.color} size={28} />
                </div>
                <h3 className="text-2xl font-bold mb-3 tracking-tight">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
                
                {/* Decorative background glow */}
                <div className={`absolute -bottom-8 -right-8 w-32 h-32 blur-3xl opacity-0 group-hover:opacity-50 transition-opacity duration-500 ${feature.bg}`} />
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border/50 bg-background/80 backdrop-blur-md py-8 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Brain size={18} />
            </div>
            <span className="text-lg font-bold tracking-tight">Office Games</span>
          </div>
          <p className="text-muted-foreground text-sm font-medium">
            Powered by your HR Department.
          </p>
        </div>
      </footer>
    </div>
  );
}
