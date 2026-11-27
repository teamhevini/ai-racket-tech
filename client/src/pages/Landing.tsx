import * as React from "react";
import { Link } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Bell, CalendarPlus, Check, History, MapPin, Phone, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/surface";
import { FreshnessRing } from "@/components/FreshnessRing";
import { Mark } from "@/components/Logo";
import type { ReminderJson } from "@/lib/types";
import { PLANS } from "@shared/tiers";

const HoloRacket = React.lazy(() => import("@/components/holo/HoloRacket"));

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
} as const;

function demoReminder(daysLeft: number, interval = 35): ReminderJson {
  const status = daysLeft < 0 ? "overdue" : daysLeft <= 7 ? "due-soon" : "fresh";
  return {
    status,
    intervalDays: interval,
    lastStrungAt: null,
    dueAt: null,
    daysLeft,
    freshness: Math.max(0, Math.min(1, daysLeft / interval)),
    material: "poly",
  };
}

/** The hero ring counts down a set of strings going from fresh to due. */
function useCountdown() {
  const reduce = useReducedMotion();
  const [days, setDays] = React.useState(28);
  React.useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setDays((d) => (d <= -3 ? 35 : d - 1)), 900);
    return () => clearInterval(id);
  }, [reduce]);
  return days;
}

/** Faint tennis court drawn in lines, used behind the hero. */
function CourtLines({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 860" fill="none" className={className} aria-hidden preserveAspectRatio="xMidYMid slice">
      <g stroke="rgb(var(--line))" strokeWidth="2">
        <rect x="20" y="20" width="360" height="820" />
        <line x1="65" y1="20" x2="65" y2="840" />
        <line x1="335" y1="20" x2="335" y2="840" />
        <line x1="65" y1="230" x2="335" y2="230" />
        <line x1="65" y1="630" x2="335" y2="630" />
        <line x1="200" y1="230" x2="200" y2="630" />
        <line x1="200" y1="20" x2="200" y2="32" />
        <line x1="200" y1="828" x2="200" y2="840" />
      </g>
      <line x1="8" y1="430" x2="392" y2="430" stroke="rgb(var(--ink) / 0.25)" strokeWidth="3" strokeDasharray="2 6" />
    </svg>
  );
}

function HeroPhone() {
  const days = useCountdown();
  const reminder = demoReminder(days);
  const label =
    days < 0 ? `${Math.abs(days)} day${days === -1 ? "" : "s"} overdue` : days === 0 ? "Due today" : `Due in ${days} days`;
  return (
    <div className="relative mx-auto w-full max-w-[19rem]">
      <div aria-hidden className="absolute -inset-10 -z-10 rounded-full bg-ball/30 blur-3xl" />
      <Card className="rounded-[2rem] p-5 shadow-lift">
        <div className="flex items-center justify-between">
          <p className="eyebrow">My bag</p>
          <Badge tone={reminder.status === "overdue" ? "brand" : reminder.status === "due-soon" ? "clay" : "grass"}>{label}</Badge>
        </div>
        <div className="mt-5 flex items-center gap-4">
          <FreshnessRing reminder={reminder} size={96} stroke={8} />
          <div className="min-w-0">
            <p className="display text-2xl leading-tight">Match #1</p>
            <p className="text-sm text-muted">Wilson Blade 98 v9</p>
            <p className="mt-1 font-mono text-xs text-faint">ALU Power · 52 lbs</p>
          </div>
        </div>
        <div className="mt-5 space-y-2">
          {[
            { d: "Oct 14", s: "ALU Power 125", t: "52", r: 5 },
            { d: "Sep 9", s: "ALU Power 125", t: "53", r: 4 },
            { d: "Aug 2", s: "RPM Blast 125", t: "54", r: 3 },
          ].map((j, i) => (
            <div key={i} className="flex items-center justify-between rounded-xl bg-surface-2/70 px-3 py-2.5 text-sm">
              <span className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-grass" />
                <span className="font-medium">{j.d}</span>
                <span className="text-muted">{j.s}</span>
              </span>
              <span className="font-mono text-xs text-muted">{j.t} lbs</span>
            </div>
          ))}
        </div>
        <Button className="mt-5 w-full" variant="ink" tabIndex={-1} aria-hidden>
          Log a restring
        </Button>
      </Card>
    </div>
  );
}

const STEPS = [
  {
    icon: Sparkles,
    title: "Get your setup",
    body: "Tell us your racket, game and arm history. Our AI technician tunes strings, gauge and tension to both — and explains why.",
  },
  {
    icon: History,
    title: "Log every restring",
    body: "Ten seconds after each visit to your stringer. Your bag keeps the whole story: strings, tension, price, how it played.",
  },
  {
    icon: Bell,
    title: "Never play on dead strings",
    body: "We work out when each racket is due from how much you play and what's in it — and remind you in time.",
  },
];

function FeatureHistory() {
  return (
    <Card className="p-5">
      <div className="flex items-baseline justify-between">
        <p className="display text-2xl">Racket history</p>
        <span className="font-mono text-xs text-faint">7 restrings</span>
      </div>
      <ol className="relative mt-5 space-y-4 border-l border-line pl-5">
        {[
          { d: "Nov 2", s: "Hyper-G 16L / VS Touch", t: "50/52 lbs", note: "Best feel yet" },
          { d: "Sep 28", s: "Hyper-G 16L", t: "52 lbs", note: "A bit stiff" },
          { d: "Aug 21", s: "RPM Blast 17", t: "53 lbs" },
        ].map((j, i) => (
          <li key={i} className="relative">
            <span className="absolute -left-[1.6rem] top-1 size-3 rounded-full border-2 border-surface bg-grass" />
            <p className="text-sm font-semibold">{j.d}</p>
            <p className="text-sm text-muted">
              {j.s} · <span className="font-mono text-xs">{j.t}</span>
            </p>
            {j.note && <p className="mt-0.5 text-xs italic text-faint">“{j.note}”</p>}
          </li>
        ))}
      </ol>
      <div className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4 text-center">
        {[
          ["32", "avg days"],
          ["51.6", "avg lbs"],
          ["$186", "spent"],
        ].map(([v, l]) => (
          <div key={l}>
            <p className="font-mono text-lg font-semibold">{v}</p>
            <p className="text-2xs text-muted">{l}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function FeatureReminders() {
  return (
    <Card className="p-5">
      <p className="display text-2xl">Restring reminders</p>
      <div className="mt-5 space-y-3">
        {[
          { n: "Match #1", d: 12, i: 35 },
          { n: "Backup", d: 3, i: 35 },
          { n: "Old faithful", d: -6, i: 70 },
        ].map((r) => {
          const rem = demoReminder(r.d, r.i);
          return (
            <div key={r.n} className="flex items-center gap-3">
              <FreshnessRing reminder={rem} size={44} stroke={5} label={false} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{r.n}</p>
                <p className="text-xs text-muted">{r.d < 0 ? `${-r.d} days overdue` : `Due in ${r.d} days`}</p>
              </div>
              {r.d < 0 && <Badge tone="brand">Restring</Badge>}
            </div>
          );
        })}
      </div>
      <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5">
          <Bell className="size-3.5" /> Email nudges
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5">
          <CalendarPlus className="size-3.5" /> Add to calendar
        </span>
      </div>
    </Card>
  );
}

function FeatureStringers() {
  return (
    <Card className="p-5">
      <p className="display text-2xl">Your stringers</p>
      <div className="mt-5 rounded-2xl bg-surface-2/70 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold">Baseline Pro Shop</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
              <MapPin className="size-3.5" /> 12 Court Rd
            </p>
          </div>
          <span className="flex items-center gap-0.5 text-xs font-semibold">
            <Star className="size-3.5 fill-ball stroke-ball-ink/60" /> 4.9
          </span>
        </div>
        <p className="mt-3 text-sm italic text-muted">“Ask for Sam — same-day before 10am.”</p>
        <div className="mt-4 flex gap-2">
          <span className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-surface py-2 text-xs font-semibold shadow-card">
            <Phone className="size-3.5" /> Call
          </span>
          <span className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-surface py-2 text-xs font-semibold shadow-card">
            <MapPin className="size-3.5" /> Directions
          </span>
        </div>
      </div>
      <p className="mt-4 text-xs text-muted">5 restrings logged with Sam · last one 3 weeks ago</p>
    </Card>
  );
}

export default function Landing() {
  return (
    <div className="overflow-x-clip">
      {/* ── Hero ── */}
      <section className="relative">
        <CourtLines className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[56rem] w-[34rem] -translate-x-1/2 opacity-60 [mask-image:radial-gradient(closest-side,black,transparent)] lg:left-[72%]" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-10 sm:px-6 sm:pt-16 lg:grid-cols-[1.15fr_1fr] lg:gap-8 lg:pb-24 lg:pt-24">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
            <p className="eyebrow flex items-center gap-2">
              <span className="size-2 rounded-full bg-ball ring-2 ring-ball/30" /> AI racket technician
            </p>
            <h1 className="display mt-5 text-[3.5rem] leading-[0.95] sm:text-7xl lg:text-[5.5rem]">
              Your racket,
              <br />
              <em className="text-brand">dialled in.</em>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-muted">
              The right strings and tension for your frame, your game and your arm — then a living history of every restring, and a nudge
              before your strings go dead.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/setup">
                  Get my string setup <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/signup">Join free</Link>
              </Button>
            </div>
            <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-4 text-grass" /> 60-second setup
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-4 text-grass" /> 140+ frames
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-4 text-grass" /> Arm-safe by default
              </span>
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 24, rotate: -2 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            <React.Suspense fallback={<div className="h-[30rem] sm:h-[36rem]" />}>
              <HoloRacket
                className="h-[30rem] sm:h-[36rem]"
                specs={{ headSize: 97, pattern: "16x19", beam: "21.5 mm", balance: "32.5 cm · 6 pts HL", weight: 300, tension: { mains: 52, crosses: 50 }, stringName: "ALU Power 125" }}
              />
            </React.Suspense>
          </motion.div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="border-y border-line bg-surface/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <motion.div {...fadeUp} className="max-w-2xl">
            <p className="eyebrow">How it works</p>
            <h2 className="display mt-3 text-4xl leading-tight sm:text-5xl">From first setup to your fiftieth restring.</h2>
          </motion.div>
          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <motion.li key={s.title} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.08 }} className="relative">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-full bg-ink text-bg">
                    <s.icon className="size-5" />
                  </span>
                  <span className="font-mono text-sm text-faint">0{i + 1}</span>
                </div>
                <h3 className="display mt-5 text-3xl">{s.title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{s.body}</p>
              </motion.li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Feature showcase ── */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <motion.div {...fadeUp} className="max-w-2xl">
          <p className="eyebrow">Your bag, remembered</p>
          <h2 className="display mt-3 text-4xl leading-tight sm:text-5xl">
            Know exactly what's in every frame — and when it's <em className="text-clay">done</em>.
          </h2>
        </motion.div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {[FeatureHistory, FeatureReminders, FeatureStringers].map((F, i) => (
            <motion.div key={i} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.08 }}>
              <F />
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Hevini + pricing teaser ── */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:pb-24">
        <motion.div {...fadeUp} className="relative overflow-hidden rounded-3xl bg-ink p-8 text-bg sm:p-12">
          <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 size-80 rounded-full bg-brand/40 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-24 left-10 size-64 rounded-full bg-ball/20 blur-3xl" />
          <div className="relative grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-end">
            <div>
              <div className="flex items-center gap-3">
                <Mark className="size-10" />
                <span className="text-sm text-bg/70">Built by Hevini Sporting</span>
              </div>
              <h2 className="display mt-6 text-4xl leading-tight sm:text-5xl">Free to start. Pro for less than a can of balls a month.</h2>
              <p className="mt-4 max-w-md text-bg/70">
                Setups, reminders and saved stringers are free. Pro unlocks unlimited rackets and full history for{" "}
                {PLANS.pro.annualPrice} a year. Club adds the live AI technician for {PLANS.club.annualPrice} a year.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" variant="ball">
                  <Link href="/signup">Join free</Link>
                </Button>
                <Button asChild size="lg" variant="ghost" className="text-bg hover:bg-bg/10">
                  <Link href="/pricing">
                    Compare plans <ArrowRight />
                  </Link>
                </Button>
              </div>
            </div>
            <ul className="space-y-3 text-sm">
              {PLANS.pro.features.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-ball text-ball-ink">
                    <Check className="size-3" />
                  </span>
                  <span className="text-bg/85">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </section>

      {/* Footer links — the desktop footer is hidden on phones */}
      <nav aria-label="About 10IS" className="mx-auto flex max-w-6xl flex-wrap justify-center gap-x-6 gap-y-2 px-4 pb-6 text-sm text-muted md:hidden">
        <Link href="/about" className="hover:text-ink">
          About
        </Link>
        <Link href="/pricing" className="hover:text-ink">
          Pricing
        </Link>
        <Link href="/privacy" className="hover:text-ink">
          Privacy
        </Link>
        <Link href="/terms" className="hover:text-ink">
          Terms
        </Link>
      </nav>
    </div>
  );
}
