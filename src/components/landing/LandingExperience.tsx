"use client";

import Link from "next/link";
import OfficeGamesMark from "@/components/brand/OfficeGamesMark";
import { useAppearance } from "@/components/providers/AppearanceProvider";
import AppearanceSwitch from "@/components/ui/AppearanceSwitch";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import styles from "./landing.module.css";
import { ArrowDown, ArrowRight, Brain, Check, RotateCcw, Sparkles, Trophy, Coffee, Rocket, Zap } from "lucide-react";

type Member = { name: string; destination: "/dashboard" | "/admin" } | null;
export default function LandingExperience({ member }: { member: Member }) {
  const destination = member?.destination || "/register";
  const { theme } = useAppearance();

  return <div data-theme={theme} className={`${styles.canvas} min-h-screen bg-background text-foreground selection:bg-primary/20 [&_a]:transition-colors [&_a]:focus-visible:outline-2 [&_a]:focus-visible:outline-offset-4 [&_a]:focus-visible:outline-primary [&_button]:focus-visible:outline-2 [&_button]:focus-visible:outline-offset-4 [&_button]:focus-visible:outline-primary`}>
    <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 border-b border-border/50 px-5 py-5 sm:px-6 lg:px-12">
      <Link href="/" aria-label="Office Games home" className="flex items-center gap-2 text-xl font-extrabold tracking-tight"><OfficeGamesMark className="h-10 w-10" /><span>Office<span className="ml-1 text-primary">Games</span></span></Link>
      <nav aria-label="Main navigation" className="hidden items-center gap-8 text-sm font-semibold text-muted-foreground md:flex"><a href="#daily-mission" className="hover:text-primary">Daily Mission</a><a href="#office-lounge" className="hover:text-primary">Office Lounge</a></nav>
      <div className="flex flex-wrap items-center gap-3"><AppearanceSwitch />{!member && <Link href="/login" className="text-sm font-bold hover:text-primary">Sign in</Link>}<Link href={destination} className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-bold text-background transition hover:bg-primary hover:text-primary-foreground">{member ? "My workspace" : "Get started"}<ArrowRight size={15} /></Link></div>
    </header>

    <main>
      <section className={`${styles.hero} relative mx-auto max-w-7xl px-6 pb-16 pt-12 sm:pt-20 lg:px-12 lg:pb-24`}>
        <div className={`${styles.heroGrid} grid items-center gap-14 lg:grid-cols-[1.08fr_1fr] lg:gap-16`}>
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary"><span className="h-px w-8 bg-primary" />{member ? `Welcome back, ${member.name}` : "A little rivalry. A better workday."}</p>
            <h1 className="mt-6 text-[clamp(3.2rem,6.5vw,6rem)] font-black leading-[0.98] tracking-[-0.055em]">Quick break.<br />Big rivalry.<br /><span className="text-primary">Your move.</span></h1>
            <p className="mt-7 max-w-md text-base leading-7 text-muted-foreground sm:text-lg">Think fast. Make your move. Take on daily brain games or challenge a coworker for bragging rights. Who’s got the next win?</p>
            <div className="mt-8 flex flex-wrap items-center gap-6"><Link href={destination} className="inline-flex min-h-14 items-center gap-4 rounded-full bg-primary px-7 font-bold text-primary-foreground shadow-lg shadow-primary/15 transition hover:-translate-y-1">{member ? "Open my workspace" : "Create your account"}<ArrowRight size={19} /></Link><a href="#daily-mission" className="inline-flex items-center gap-2 text-sm font-bold hover:text-primary">Explore the competition<ArrowDown size={16} /></a></div>
          </div>

          <div className="relative min-w-0">
            <div aria-hidden="true" className={`${styles.demoBackdrop} absolute -inset-4 rotate-3 rounded-[2rem] border border-primary/20 sm:-inset-6`} />
            <DemoSelector destination={destination} signedIn={Boolean(member)} />
            <p className="mt-7 text-center text-xs font-semibold tracking-wide text-muted-foreground">YOUR FIRST CHALLENGE IS RIGHT HERE. NO SIGN-UP NEEDED.</p>
          </div>
        </div>
      </section>

      <div className={`${styles.highlights} border-y border-border bg-card`}><div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-6 px-6 py-7 text-sm font-semibold text-muted-foreground lg:px-12">{["New day. New challenges.", "Real coworkers. Friendly rivals.", "Quick games. Big bragging rights."].map(text => <span key={text} className="flex items-center gap-3"><Check size={17} className="text-primary" />{text}</span>)}</div></div>

      <section aria-labelledby="ways-to-play" className="mx-auto max-w-7xl px-6 pt-16 lg:px-12"><h2 id="ways-to-play" className="text-3xl font-black tracking-tight">Play for yourself. Compete with your team.</h2><div className="mt-7 grid gap-6 sm:grid-cols-3">{[{ title: "Put your skills to the test.", copy: "Take on today’s mix of games. Chase correct answers, earn XP, and see how you measure up.", icon: Brain }, { title: "Challenge a coworker.", copy: "Pick your opponent, send an invite, and compete for the win in the Office Lounge.", icon: Rocket }, { title: "Climb the ranks.", copy: "Turn Lounge wins into rank progress. Build your reputation, one match at a time.", icon: Trophy }].map(({ title, copy, icon: Icon }) => <article key={title} className={`${styles.feature} border-t border-primary/25 pt-5`}><Icon size={23} className="text-primary" /><h3 className="mt-4 text-xl font-bold">{title}</h3><p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">{copy}</p></article>)}</div></section>

      <section id="daily-mission" className="mx-auto grid max-w-7xl scroll-mt-8 items-center gap-12 px-6 py-20 md:grid-cols-2 lg:gap-24 lg:px-12 lg:py-28">
        <div className={`${styles.mission} relative flex min-h-80 items-center justify-center overflow-hidden rounded-[2rem] p-7 sm:p-12`}><span aria-hidden="true" className="absolute -bottom-8 -left-3 text-[13rem] font-black leading-none tracking-tighter text-primary/5">01</span><div className="relative w-full max-w-sm space-y-3">{[{ label: "A new test every mission", detail: "Memory, logic & trivia", icon: Brain }, { label: "Make every answer count", detail: "Accuracy, speed & focus", icon: Sparkles }, { label: "See where you stand", detail: "Scores, XP & streaks", icon: Trophy }].map(({ label, detail, icon: Icon }, index) => <div key={label} className={`flex items-center gap-4 rounded-2xl border border-border/70 bg-card p-4 shadow-sm ${index === 1 ? "sm:translate-x-5" : ""}`}><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon size={21} /></span><div><p className="text-sm font-bold">{label}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div><span className="ml-auto text-xs font-bold text-muted-foreground">0{index + 1}</span></div>)}</div></div>
        <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">01 / Daily Mission</p><h2 className="mt-5 text-4xl font-black leading-tight tracking-[-0.04em] sm:text-5xl">Take the challenge.<br />Chase a better score.</h2><p className="mt-5 max-w-md leading-7 text-muted-foreground">Test your memory, logic, and quick thinking in today’s Daily Mission. Every challenge is a chance to earn XP and push your score higher. Check your results, compare your progress on the leaderboard, and come back ready for the next challenge.</p><Link href={destination} className="mt-7 inline-flex items-center gap-3 border-b border-primary/30 pb-2 font-bold text-primary">{member ? "Open your workspace" : "Create your account"}<ArrowRight size={18} /></Link></div>
      </section>

      <section id="office-lounge" className={`${styles.lounge} scroll-mt-8 border-y border-border bg-card`}>
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 md:grid-cols-2 lg:gap-20 lg:px-12 lg:py-24">
          <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">02 / Office Lounge</p><h2 className="mt-5 text-4xl font-black leading-tight tracking-[-0.04em] sm:text-5xl">Coworkers at work.<br />Rivals on the board.</h2><p className="mt-5 max-w-md leading-7 text-muted-foreground">Think you can beat the teammate across the room? Send a chess, Connect Four, or Tic-Tac-Toe challenge and find out. Win matches, climb the Lounge ranks, and give the office something to talk about.</p><Link href={destination} className="mt-7 inline-flex items-center gap-3 border-b border-primary/30 pb-2 font-bold text-primary">{member ? "Find your next opponent" : "Join the competition"}<ArrowRight size={18} /></Link></div>
          <LoungePreview />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20 text-center lg:px-12 lg:py-28"><p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Someone on your team thinks they can beat you.</p><h2 className="mx-auto mt-6 max-w-3xl text-5xl font-black leading-none tracking-[-0.05em] sm:text-7xl">Ready to give them<br />a challenge?</h2><Link href={destination} className="mt-9 inline-flex items-center gap-4 rounded-full bg-primary px-8 py-4 font-bold text-primary-foreground transition hover:-translate-y-1">{member ? "Let’s play" : "Create your account"}<ArrowRight size={19} /></Link></section>
      <section aria-labelledby="landing-faq" className="mx-auto grid max-w-7xl gap-8 px-6 pb-20 md:grid-cols-[1fr_1.5fr] lg:px-12"><div><p className="text-xs font-bold uppercase tracking-widest text-primary">The ground rules</p><h2 id="landing-faq" className="mt-4 text-3xl font-black tracking-tight">Before you jump in.</h2></div><div className="divide-y divide-border border-y border-border">{[{ q: "Can I play before signing up?", a: "Yes. Try the Memory, Reaction, and Logic games at the top of this page. You don’t need an account, and demo results aren’t saved." }, { q: "How long is a Daily Mission?", a: "Daily Missions are designed for a short break. Your workplace sets the number of games and time limit. You’ll see what’s included before you start." }, { q: "Can I play with coworkers?", a: "Yes. Head to the Office Lounge to invite a coworker to chess, Connect Four, or Tic-Tac-Toe. You can also watch other matches." }, { q: "How does my progress work?", a: "Your account keeps track of your Daily Mission progress, XP, and streak. Your Lounge rank tracks your multiplayer results separately. The games on this page are just demos and don’t affect either." }].map(({ q, a }) => <details key={q} className="group py-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-5 rounded-md font-bold focus-visible:outline-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">{q}<span aria-hidden="true" className="text-xl font-normal text-primary group-open:rotate-45">+</span></summary><p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground">{a}</p></details>)}</div></section>
    </main>
    <footer className="mx-auto flex max-w-7xl flex-col justify-between gap-4 border-t border-border px-6 py-7 text-sm text-muted-foreground sm:flex-row lg:px-12"><span className="font-bold text-foreground">Office Games</span><span>Quick breaks. Friendly rivals. Well-earned wins.</span><Link href={member ? destination : "/login"} className="font-semibold hover:text-primary">{member ? "Your workspace" : "Already a member? Sign in"}</Link></footer>
  </div>;
}

function LoungePreview() {
  const [game, setGame] = useState<"chess" | "connect" | "ttt">("chess");
  const chessPieces: Record<number, string> = { 0: "♜", 4: "♚", 7: "♜", 9: "♟", 11: "♟", 14: "♟", 18: "♞", 28: "♟", 35: "♙", 42: "♘", 49: "♙", 51: "♙", 54: "♙", 56: "♖", 60: "♔", 63: "♖" };
  const discs: Record<number, string> = { 17: "bg-primary", 23: "bg-amber-400", 24: "bg-primary", 29: "bg-primary", 30: "bg-amber-400", 31: "bg-primary", 35: "bg-amber-400", 36: "bg-primary", 37: "bg-amber-400", 38: "bg-amber-400", 39: "bg-primary" };
  return <div className={`${styles.matchPreview} rounded-[2rem] border p-5 sm:p-7`}>
    <div className="mb-5 flex items-center justify-between gap-3 text-xs"><span className="font-bold">You <span className="mx-2 font-normal text-muted-foreground">vs</span> Your coworker</span><span className={`${styles.previewBadge} rounded-full px-2.5 py-1 font-semibold`}>Match preview</span></div>
    <div className="mx-auto flex h-64 max-w-64 items-center justify-center sm:h-72 sm:max-w-72">
      {game === "chess" ? <div aria-label="Illustration of a chess match" role="img" className="grid aspect-square w-full grid-cols-8 overflow-hidden rounded-lg border border-primary/20">{Array.from({ length: 64 }, (_, index) => <span key={index} className={`grid aspect-square place-items-center text-[clamp(1.1rem,3vw,1.9rem)] leading-none ${((Math.floor(index / 8) + index % 8) % 2) ? "bg-primary/20" : "bg-card"}`}>{chessPieces[index]}</span>)}</div> : game === "connect" ? <div role="img" aria-label="Illustration of a Connect Four match" className="grid w-full grid-cols-7 gap-1.5 rounded-xl bg-primary/15 p-3">{Array.from({ length: 42 }, (_, index) => <span key={index} className={`aspect-square rounded-full shadow-inner ${discs[index] || "bg-card"}`} />)}</div> : <div role="img" aria-label="Illustration of a Tic-Tac-Toe match" className="grid aspect-square w-full grid-cols-3 gap-2 rounded-xl bg-border p-2">{["X", "O", "", "", "X", "", "O", "", ""].map((mark, index) => <span key={index} className={`grid place-items-center rounded-lg bg-card text-4xl font-bold ${mark === "X" ? "text-primary" : "text-muted-foreground"}`}>{mark}</span>)}</div>}
    </div>
    <div className="mt-6 grid grid-cols-3 gap-1 border-t border-border pt-4">{([{ id: "chess", label: "Chess" }, { id: "connect", label: "Connect Four" }, { id: "ttt", label: "Tic-Tac-Toe" }] as const).map(item => <button key={item.id} type="button" aria-pressed={game === item.id} onClick={() => setGame(item.id)} className={`rounded-lg px-1 py-2.5 text-xs font-bold transition-colors ${game === item.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>{item.label}</button>)}</div>
  </div>;
}


const tileFaces = [
  { label: "Coffee", Icon: Coffee, style: "bg-amber-100 text-amber-700" },
  { label: "Rocket", Icon: Rocket, style: "bg-teal-100 text-teal-800" },
  { label: "Lightning", Icon: Zap, style: "bg-rose-100 text-rose-800" },
];
const initialDeck = [0, 1, 2, 1, 0, 2];

function DemoSelector({ destination, signedIn }: { destination: string; signedIn: boolean }) {
  const [mode, setMode] = useState<"memory" | "reaction" | "logic">("memory");
  return <div className="relative"><div className="mb-3 grid grid-cols-3 gap-1 rounded-2xl border border-border bg-card p-1.5" aria-label="Choose a demo">{([{ id: "memory", title: "Memory", Icon: Brain }, { id: "reaction", title: "Reaction", Icon: Zap }, { id: "logic", title: "Logic", Icon: Sparkles }] as const).map(({ id, title, Icon }) => <button key={id} type="button" aria-pressed={mode === id} onClick={() => setMode(id)} className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-3 text-xs font-bold transition-colors ${mode === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}><Icon size={15} />{title}</button>)}</div><div key={mode}>{mode === "memory" ? <MatchingDemo destination={destination} signedIn={signedIn} /> : mode === "reaction" ? <ReactionDemo /> : <LogicDemo />}</div></div>;
}

function ReactionDemo() {
  const [phase, setPhase] = useState<"idle" | "waiting" | "ready" | "caught" | "early" | "missed">("idle");
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [elapsed, setElapsed] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const started = useRef(0);
  const state = useRef(phase);
  function change(next: typeof phase) { state.current = next; setPhase(next); }
  useEffect(() => {
    function onHidden() { if (document.hidden && (state.current === "waiting" || state.current === "ready")) { if (timer.current) clearTimeout(timer.current); state.current = "idle"; setPhase("idle"); } }
    document.addEventListener("visibilitychange", onHidden);
    return () => { if (timer.current) clearTimeout(timer.current); document.removeEventListener("visibilitychange", onHidden); };
  }, []);
  function start() {
    if (timer.current) clearTimeout(timer.current);
    change("waiting");
    timer.current = setTimeout(() => {
      setPosition({ x: 18 + Math.random() * 64, y: 22 + Math.random() * 56 });
      started.current = performance.now();
      change("ready");
      timer.current = setTimeout(() => { if (state.current === "ready") change("missed"); }, 2500);
    }, 1200 + Math.random() * 1800);
  }
  const busy = phase === "waiting" || phase === "ready";
  const message = phase === "caught" ? `Caught it! Your reaction time: ${elapsed} ms.` : phase === "early" ? "Too eager! Wait for the spark, then strike." : phase === "missed" ? "The spark got away. Ready for a rematch?" : phase === "waiting" ? "Wait for the spark…" : phase === "ready" ? "Catch it!" : "Wait for the spark. Tap to catch it. See your reaction time.";
  return <div className="overflow-hidden rounded-[1.75rem] border border-border bg-card p-6 shadow-2xl shadow-primary/10"><p className="text-xs font-bold uppercase tracking-widest text-primary">Reaction challenge</p><h2 className="mt-4 text-2xl font-bold">How quick are you?</h2><div className="relative my-6 h-64 overflow-hidden rounded-2xl bg-primary/5"><button type="button" aria-label="Reaction field: wait for the spark" disabled={phase !== "waiting"} onClick={() => { if (state.current !== "waiting") return; if (timer.current) clearTimeout(timer.current); change("early"); }} className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-muted-foreground">{phase === "waiting" ? "Get ready…" : phase !== "ready" ? <Zap size={56} className="text-primary/20" /> : null}</button>{phase === "ready" && <button type="button" aria-label="Catch the spark" onClick={() => { if (state.current !== "ready") return; if (timer.current) clearTimeout(timer.current); setElapsed(Math.round(performance.now() - started.current)); change("caught"); }} style={{ left: `${position.x}%`, top: `${position.y}%` }} className="absolute grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg ring-8 ring-primary/15"><Zap size={30} fill="currentColor" /></button>}</div><p className="min-h-14 text-sm leading-6 text-muted-foreground" role="status">{message}</p><button type="button" onClick={start} disabled={busy} className="mt-3 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50">{busy ? "Round in progress" : phase === "idle" ? "Test my reactions" : "Try again"}</button><p className="mt-5 text-xs text-muted-foreground">Just a demo · your progress isn’t affected</p></div>;
}

function LogicDemo() {
  const [answer, setAnswer] = useState<number | null>(null);
  const [round, setRound] = useState(0);
  const puzzles = [{ pattern: [1, 2, 3], options: [2, 4, 5], correct: 4, explanation: "One more dot in each tile. Four comes next." }, { pattern: [2, 4, 6], options: [7, 8, 9], correct: 8, explanation: "Two more dots each time. Eight comes next." }];
  const puzzle = puzzles[round];
  function dots(count: number) { return <span aria-hidden="true" className="grid w-10 grid-cols-3 gap-1.5">{Array.from({ length: count }, (_, index) => <span key={index} className="h-2.5 w-2.5 rounded-full bg-primary" />)}</span>; }
  return <div className="rounded-[1.75rem] border border-border bg-card p-6 shadow-2xl shadow-primary/10"><p className="text-xs font-bold uppercase tracking-widest text-primary">Logic challenge</p><h2 className="mt-4 text-2xl font-bold">Can you crack the pattern?</h2><p className="mt-2 text-sm text-muted-foreground">Spot the rule. Pick the missing tile. Trust your thinking.</p><div className="my-8 grid grid-cols-4 gap-2">{puzzle.pattern.map(count => <div key={count} aria-label={`${count} dots`} className="grid aspect-square place-items-center rounded-xl bg-primary/5">{dots(count)}</div>)}<div aria-label="Missing tile" className="grid aspect-square place-items-center rounded-xl border-2 border-dashed border-primary/30 text-2xl font-bold text-primary">?</div></div><div className="grid grid-cols-3 gap-3">{puzzle.options.map(count => <button key={count} type="button" disabled={answer !== null} aria-label={`${count} dots${answer !== null && count === puzzle.correct ? ', correct answer' : ''}`} onClick={() => setAnswer(count)} className={`grid min-h-24 place-items-center rounded-xl border ${answer !== null && count === puzzle.correct ? "border-emerald-500 bg-emerald-500/10" : answer === count ? "border-red-400 bg-red-400/10" : "border-border enabled:hover:border-primary"}`}>{dots(count)}</button>)}</div><div className="mt-6 min-h-24" role="status">{answer !== null ? <><p className="text-sm font-bold">{answer === puzzle.correct ? "Cracked it. Sharp thinking!" : "Not quite. Here’s the pattern."}</p><p className="mt-2 text-sm text-muted-foreground">{puzzle.explanation}</p></> : <p className="text-sm text-muted-foreground">Choose the tile that completes the pattern.</p>}</div><button type="button" onClick={() => { setRound((round + 1) % puzzles.length); setAnswer(null); }} className="inline-flex items-center gap-2 rounded-lg py-2 text-sm font-bold text-primary"><RotateCcw size={14} />Take on another pattern</button><p className="mt-3 text-xs text-muted-foreground">Just a demo · your progress isn’t affected</p></div>;
}

function MatchingDemo({ destination, signedIn }: { destination: string; signedIn: boolean }) {
  const [deck, setDeck] = useState(initialDeck);
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [message, setMessage] = useState("Your move. Flip a tile to start.");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locked = useRef(false);
  const reduceMotion = useReducedMotion();
  const complete = matched.length === 6;

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function flip(index: number) {
    if (locked.current || matched.includes(index) || open.includes(index)) return;
    const revealed = [...open, index];
    setOpen(revealed);
    if (revealed.length !== 2) {
      setMessage("One down. Where’s its match?");
      return;
    }
    locked.current = true;
    setMoves(value => value + 1);
    if (deck[revealed[0]] === deck[index]) {
      setMatched(previous => [...previous, ...revealed]);
      setMessage("Matched! Keep the momentum going.");
      timer.current = setTimeout(() => {
        setOpen([]);
        locked.current = false;
      }, reduceMotion ? 100 : 400);
    } else {
      setMessage("No match. Remember those tiles for your next move.");
      timer.current = setTimeout(() => {
        setOpen([]);
        locked.current = false;
        setMessage("Next move. Find a pair.");
      }, 1000);
    }
  }

  function replay() {
    if (timer.current) clearTimeout(timer.current);
    const shuffled = [...initialDeck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setDeck(shuffled);
    setOpen([]);
    setMatched([]);
    setMoves(0);
    locked.current = false;
    setMessage("Fresh shuffle. Can you finish in fewer moves?");
  }

  return <div className="relative overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-2xl shadow-primary/10">
    <div className="flex items-center justify-between border-b border-border px-5 py-4"><span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest"><Sparkles size={15} className="text-primary" />Memory challenge</span><span className="text-xs font-semibold text-muted-foreground">{moves} {moves === 1 ? "move" : "moves"}</span></div>
    <div className="px-5 py-6 sm:px-8">
      <div className="flex items-start justify-between gap-3"><div><h2 className="text-2xl font-bold tracking-tight">Three pairs. How many moves?</h2><p className="mt-2 text-sm text-muted-foreground">Flip the tiles, find the matches, and keep your move count low.</p></div><span className="shrink-0 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">{matched.length / 2} / 3</span></div>
      <div className="my-6 grid grid-cols-3 gap-3" aria-label="Matching pairs game">
        {deck.map((face, index) => {
          const revealed = open.includes(index) || matched.includes(index);
          const done = matched.includes(index);
          const { Icon, label, style } = tileFaces[face];
          return <button key={index} type="button" onClick={() => flip(index)} disabled={done || open.length === 2 || open.includes(index)} aria-label={revealed ? `Tile ${index + 1}: ${label}${done ? ", matched" : ""}` : `Reveal tile ${index + 1}`} aria-pressed={revealed} className="group relative aspect-square rounded-2xl [perspective:700px] enabled:hover:-translate-y-1 motion-safe:transition-transform focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
            <motion.span animate={{ rotateY: revealed ? 180 : 0, scale: done ? [1, 1.06, 1] : 1 }} transition={{ duration: reduceMotion ? 0 : 0.35 }} className="relative block h-full w-full [transform-style:preserve-3d]">
              <span aria-hidden="true" className="absolute inset-0 grid place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-sm [backface-visibility:hidden]"><Brain className="h-8 w-8 opacity-70 transition-opacity group-hover:opacity-100" /><span className="absolute bottom-2 text-[9px] font-bold tracking-[0.2em] opacity-50">FLIP ME</span></span>
              <span aria-hidden="true" className={`absolute inset-0 grid place-items-center rounded-2xl border shadow-sm [backface-visibility:hidden] [transform:rotateY(180deg)] ${done ? "border-emerald-400" : "border-transparent"} ${style}`}><Icon className="h-10 w-10 sm:h-12 sm:w-12" strokeWidth={1.8} />{done && <Check size={15} className="absolute right-2 top-2 text-emerald-700" />}</span>
            </motion.span>
          </button>;
        })}
      </div>
      <div className="min-h-28" aria-live="polite" aria-atomic="true">{complete ? <div><p className="flex items-center gap-2 font-bold text-emerald-600"><Trophy size={18} />All matched. Nicely played!</p><p className="mt-1 text-sm text-muted-foreground">Now put that memory to work in your Daily Mission.</p><Link href={destination} className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">{signedIn ? "Open my workspace" : "Create your account"}<ArrowRight size={15} /></Link></div> : <p className="text-sm leading-6 text-muted-foreground">{message}</p>}</div>
      <div className="mt-2 flex items-center justify-between gap-3 border-t border-border pt-4"><span className="text-xs text-muted-foreground">Just a demo · your progress isn’t affected</span><button type="button" onClick={replay} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-bold text-primary hover:bg-primary/5"><RotateCcw size={13} />Play again</button></div>
    </div>
  </div>;
}
