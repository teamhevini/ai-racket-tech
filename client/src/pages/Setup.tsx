import * as React from "react";
import { useLocation, Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Search, Briefcase, HelpCircle } from "lucide-react";
import { Page } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/surface";
import { Field, Input, UnitInput } from "@/components/ui/field";
import { api, ApiError } from "@/lib/api";
import { useMe } from "@/hooks/use-me";
import { useBag } from "@/hooks/use-bag";
import { useDebounce } from "@/hooks/use-debounce";
import type { CatalogRacket, RecommendationRunResponse, BagRacket } from "@/lib/types";
import type { OnboardingInputs } from "@shared/schema";
import { cn } from "@/lib/utils";

type Playstyle = NonNullable<OnboardingInputs["playstyle"]>;
type Swing = NonNullable<OnboardingInputs["swingSpeed"]>;
type Injury = NonNullable<OnboardingInputs["injuryRisk"]>;
type Freq = NonNullable<OnboardingInputs["frequency"]>;

const LEVELS = [
  { v: "beginner", label: "Beginner", hint: "Learning the strokes" },
  { v: "intermediate", label: "Intermediate", hint: "Consistent rallies, club matches" },
  { v: "advanced", label: "Advanced", hint: "Competitive league or tournaments" },
  { v: "professional", label: "Pro / elite", hint: "College, ITF, coaching" },
];
const PLAYSTYLES: Array<{ v: Playstyle; label: string; hint: string }> = [
  { v: "baseliner", label: "Baseliner", hint: "Heavy topspin from the back" },
  { v: "aggressive", label: "Aggressive", hint: "Flat, first-strike power" },
  { v: "all-court", label: "All-court", hint: "A bit of everything" },
  { v: "serve&volley", label: "Serve & volley", hint: "Finishing at the net" },
  { v: "defensive", label: "Counter-puncher", hint: "Retrieve and redirect" },
];
const GOALS = ["Power", "Control", "Spin", "Comfort", "Durability", "Touch"];
const SWINGS: Array<{ v: Swing; label: string; hint: string }> = [
  { v: "slow", label: "Compact", hint: "Shorter, controlled swings" },
  { v: "medium", label: "Moderate", hint: "Full swings, medium pace" },
  { v: "fast", label: "Fast", hint: "Big, whippy swings" },
];
const INJURIES: Array<{ v: Injury; label: string }> = [
  { v: "none", label: "No issues" },
  { v: "elbow", label: "Elbow" },
  { v: "shoulder", label: "Shoulder" },
  { v: "wrist", label: "Wrist" },
];
const FREQS: Array<{ v: Freq; label: string }> = [
  { v: "1-2", label: "1–2 hours" },
  { v: "3-4", label: "3–4 hours" },
  { v: "5+", label: "5+ hours" },
];

type StepId = "racket" | "level" | "playstyle" | "goals" | "swing" | "injury" | "frequency" | "history";
const STEPS: Array<{ id: StepId; title: string; sub?: string }> = [
  { id: "racket", title: "Which racket are we stringing?", sub: "Frame specs change everything — stiffness, pattern, head size." },
  { id: "level", title: "How would you describe your level?" },
  { id: "playstyle", title: "How do you like to play?" },
  { id: "goals", title: "What do you want more of?", sub: "Pick up to three." },
  { id: "swing", title: "How fast do you swing?" },
  { id: "injury", title: "Any arm trouble?", sub: "We'll protect your arm before anything else." },
  { id: "frequency", title: "How much do you play each week?" },
  { id: "history", title: "What are you using now?", sub: "Optional — it helps us tune the tension." },
];

interface State {
  racketId: number | null;
  racketLabel: string;
  savedRacketId: number | null;
  unknownRacket: boolean;
  level: string;
  playstyle?: Playstyle;
  goals: string[];
  swingSpeed?: Swing;
  injuryRisk?: Injury;
  frequency?: Freq;
  stringHistory: string;
  tensionHistory: string;
}

function initialState(): State {
  const p = new URLSearchParams(window.location.search);
  const racketId = Number(p.get("racketId")) || null;
  return {
    racketId,
    racketLabel: p.get("racketName") ?? "",
    savedRacketId: Number(p.get("racket")) || null,
    unknownRacket: false,
    level: "",
    goals: [],
    stringHistory: "",
    tensionHistory: "",
  };
}

/** Find the catalog racket that matches a bag racket, so its specs feed the AI. */
async function matchCatalog(r: BagRacket): Promise<CatalogRacket | null> {
  if (!r.model) return null;
  try {
    const hits = await api<CatalogRacket[]>("GET", `/api/rackets/search?q=${encodeURIComponent(`${r.brand ?? ""} ${r.model}`.trim())}`);
    return hits.find((h) => h.model.toLowerCase() === r.model!.toLowerCase()) ?? hits[0] ?? null;
  } catch {
    return null;
  }
}

export default function Setup() {
  const [, navigate] = useLocation();
  const { signedIn } = useMe();
  const bag = useBag(signedIn);
  const [state, setState] = React.useState<State>(initialState);
  const [step, setStep] = React.useState(0);
  const [dir, setDir] = React.useState(1);
  const [error, setError] = React.useState<string | null>(null);

  // Preselect a catalog racket from ?racketId=<id> (Rackets page, v1 /onboarding links).
  React.useEffect(() => {
    const id = state.racketId;
    if (!id || state.savedRacketId) return;
    let cancelled = false;
    api<CatalogRacket>("GET", `/api/rackets/${id}`)
      .then((r) => {
        if (!cancelled) setState((s) => (s.racketId === id ? { ...s, racketLabel: `${r.brand} ${r.model}` } : s));
      })
      .catch(() => {
        // Unknown id: drop it so the player picks again instead of sending a dead reference.
        if (!cancelled) setState((s) => (s.racketId === id ? { ...s, racketId: null, racketLabel: "" } : s));
      });
    return () => {
      cancelled = true;
    };
    // Only on first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Preselect a bag racket from ?racket=<id>
  React.useEffect(() => {
    if (!state.savedRacketId || !bag.data) return;
    const r = bag.data.rackets.find((x) => x.id === state.savedRacketId);
    if (r && !state.racketLabel) chooseBagRacket(r);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bag.data]);

  async function chooseBagRacket(r: BagRacket) {
    setState((s) => ({ ...s, savedRacketId: r.id, racketLabel: r.nickname, unknownRacket: false, racketId: null }));
    const hit = await matchCatalog(r);
    if (hit) setState((s) => (s.savedRacketId === r.id ? { ...s, racketId: hit.id } : s));
  }

  const submit = useMutation({
    mutationFn: () => {
      const body: OnboardingInputs = {
        racketId: state.racketId,
        savedRacketId: state.savedRacketId,
        level: state.level || undefined,
        playstyle: state.playstyle,
        goals: state.goals.length ? state.goals : undefined,
        swingSpeed: state.swingSpeed,
        injuryRisk: state.injuryRisk ?? "none",
        frequency: state.frequency,
        stringHistory: state.stringHistory.trim() || undefined,
        tensionHistory: state.tensionHistory.trim() ? `${state.tensionHistory.trim()} lbs` : undefined,
      };
      return api<RecommendationRunResponse>("POST", "/api/recommend", body);
    },
    onSuccess: (data) => navigate(`/recommendation/${data.runId}`),
    onError: (e) =>
      setError(
        e instanceof ApiError && e.status === 429
          ? "You've asked for a lot of setups in a short time. Take a breather and try again in a few minutes."
          : e instanceof Error
            ? e.message
            : "We couldn't build your setup. Please try again.",
      ),
  });

  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  const canContinue = (() => {
    switch (current.id) {
      case "racket":
        return !!state.racketId || !!state.savedRacketId || state.unknownRacket;
      case "level":
        return !!state.level;
      case "playstyle":
        return !!state.playstyle;
      case "goals":
        return state.goals.length > 0;
      case "swing":
        return !!state.swingSpeed;
      case "injury":
        return !!state.injuryRisk;
      case "frequency":
        return !!state.frequency;
      default:
        return true;
    }
  })();

  function go(delta: number) {
    setError(null);
    if (delta > 0 && last) {
      submit.mutate();
      return;
    }
    setDir(delta);
    setStep((s) => Math.min(STEPS.length - 1, Math.max(0, s + delta)));
  }

  // Single-choice steps advance on tap — one thumb, no extra "next" press.
  function pickAndAdvance(patch: Partial<State>) {
    setState((s) => ({ ...s, ...patch }));
    window.setTimeout(() => go(1), 180);
  }

  if (submit.isPending) return <Thinking label={state.racketLabel} />;

  return (
    <Page narrow className="flex min-h-[calc(100dvh-4rem)] flex-col">
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between text-xs text-muted">
          <span className="eyebrow">Your setup</span>
          <span className="tabular">
            {step + 1} / {STEPS.length}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1}>
          <motion.div
            className="h-full rounded-full bg-brand"
            initial={{ width: 0 }}
            animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>

      <div className="relative flex-1">
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.section
            key={current.id}
            custom={dir}
            initial={{ opacity: 0, x: dir * 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -32 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            aria-labelledby="step-title"
          >
            <h1 id="step-title" className="display text-[2.25rem] leading-[1.05] sm:text-5xl">
              {current.title}
            </h1>
            {current.sub && <p className="mt-3 text-[0.9375rem] text-muted">{current.sub}</p>}
            <div className="mt-8">
              <StepBody
                id={current.id}
                state={state}
                setState={setState}
                pickAndAdvance={pickAndAdvance}
                bagRackets={signedIn ? bag.data?.rackets ?? [] : []}
                chooseBagRacket={chooseBagRacket}
                signedIn={signedIn}
              />
            </div>
          </motion.section>
        </AnimatePresence>
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-xl bg-brand-soft px-4 py-3 text-sm text-brand">
          {error}
        </p>
      )}

      {/* Sticky, thumb-height controls (sit above the mobile tab bar) */}
      <div className="sticky bottom-24 z-10 mt-8 md:bottom-6">
        <div className="flex items-center gap-3 rounded-full bg-bg/80 p-1.5 backdrop-blur-xl">
          <Button variant="secondary" size="icon" onClick={() => go(-1)} disabled={step === 0} aria-label="Previous question">
            <ArrowLeft />
          </Button>
          <Button className="flex-1" size="lg" onClick={() => go(1)} disabled={!canContinue}>
            {last ? "Build my setup" : current.id === "history" ? "Skip" : "Continue"}
            {last ? <Check /> : <ArrowRight />}
          </Button>
        </div>
      </div>
    </Page>
  );
}

function StepBody({
  id,
  state,
  setState,
  pickAndAdvance,
  bagRackets,
  chooseBagRacket,
  signedIn,
}: {
  id: StepId;
  state: State;
  setState: React.Dispatch<React.SetStateAction<State>>;
  pickAndAdvance: (p: Partial<State>) => void;
  bagRackets: BagRacket[];
  chooseBagRacket: (r: BagRacket) => void;
  signedIn: boolean;
}) {
  switch (id) {
    case "racket":
      return <RacketStep state={state} setState={setState} bagRackets={bagRackets} chooseBagRacket={chooseBagRacket} signedIn={signedIn} />;
    case "level":
      return (
        <OptionList
          options={LEVELS.map((l) => ({ value: l.v, label: l.label, hint: l.hint }))}
          value={state.level}
          onPick={(v) => pickAndAdvance({ level: v })}
        />
      );
    case "playstyle":
      return (
        <OptionList
          options={PLAYSTYLES.map((p) => ({ value: p.v, label: p.label, hint: p.hint }))}
          value={state.playstyle}
          onPick={(v) => pickAndAdvance({ playstyle: v as Playstyle })}
        />
      );
    case "goals":
      return (
        <div className="flex flex-wrap gap-2.5">
          {GOALS.map((g) => {
            const on = state.goals.includes(g);
            const full = !on && state.goals.length >= 3;
            return (
              <Chip
                key={g}
                selected={on}
                disabled={full}
                className={cn("px-5 py-3 text-base", full && "opacity-40")}
                onClick={() =>
                  setState((s) => ({ ...s, goals: on ? s.goals.filter((x) => x !== g) : [...s.goals, g].slice(0, 3) }))
                }
              >
                {on && <Check className="-ml-1 mr-1 inline size-4" />}
                {g}
              </Chip>
            );
          })}
        </div>
      );
    case "swing":
      return (
        <OptionList
          options={SWINGS.map((s) => ({ value: s.v, label: s.label, hint: s.hint }))}
          value={state.swingSpeed}
          onPick={(v) => pickAndAdvance({ swingSpeed: v as Swing })}
        />
      );
    case "injury":
      return (
        <OptionList
          options={INJURIES.map((i) => ({ value: i.v, label: i.label }))}
          value={state.injuryRisk}
          onPick={(v) => pickAndAdvance({ injuryRisk: v as Injury })}
        />
      );
    case "frequency":
      return (
        <OptionList
          options={FREQS.map((f) => ({ value: f.v, label: f.label }))}
          value={state.frequency}
          onPick={(v) => pickAndAdvance({ frequency: v as Freq })}
        />
      );
    case "history":
      return (
        <div className="space-y-4">
          <Field label="Current string" optional>
            <Input
              value={state.stringHistory}
              onChange={(e) => setState((s) => ({ ...s, stringHistory: e.target.value }))}
              placeholder="e.g. Luxilon ALU Power 125"
              maxLength={300}
            />
          </Field>
          <Field label="Current tension" optional>
            <UnitInput
              unit="lbs"
              value={state.tensionHistory}
              onChange={(e) => setState((s) => ({ ...s, tensionHistory: e.target.value.replace(/[^\d./]/g, "") }))}
              placeholder="52"
              maxLength={20}
            />
          </Field>
        </div>
      );
  }
}

function OptionList({
  options,
  value,
  onPick,
}: {
  options: Array<{ value: string; label: string; hint?: string }>;
  value?: string;
  onPick: (v: string) => void;
}) {
  return (
    <div className="grid gap-2.5" role="radiogroup">
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onPick(o.value)}
            className={cn(
              "flex min-h-[3.75rem] items-center justify-between gap-4 rounded-2xl px-5 py-3.5 text-left ring-1 transition-all duration-200 ease-spring active:scale-[0.985]",
              on ? "bg-ink text-bg ring-ink" : "bg-surface ring-line hover:ring-ink/30",
            )}
          >
            <span>
              <span className="block font-semibold">{o.label}</span>
              {o.hint && <span className={cn("text-sm", on ? "text-bg/70" : "text-muted")}>{o.hint}</span>}
            </span>
            <span
              className={cn(
                "grid size-6 shrink-0 place-items-center rounded-full border-2 transition-colors",
                on ? "border-ball bg-ball text-ball-ink" : "border-line",
              )}
            >
              {on && <Check className="size-3.5" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function RacketStep({
  state,
  setState,
  bagRackets,
  chooseBagRacket,
  signedIn,
}: {
  state: State;
  setState: React.Dispatch<React.SetStateAction<State>>;
  bagRackets: BagRacket[];
  chooseBagRacket: (r: BagRacket) => void;
  signedIn: boolean;
}) {
  const [query, setQuery] = React.useState("");
  const debounced = useDebounce(query, 250);
  const search = useQuery<CatalogRacket[]>({
    queryKey: [`/api/rackets/search?q=${encodeURIComponent(debounced)}`],
    enabled: debounced.trim().length >= 2,
  });

  const selectedLabel = state.unknownRacket ? null : state.racketLabel;

  return (
    <div className="space-y-6">
      {bagRackets.length > 0 && (
        <div>
          <p className="eyebrow mb-3">From my bag</p>
          <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 scrollbar-none">
            {bagRackets.map((r) => {
              const on = state.savedRacketId === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => chooseBagRacket(r)}
                  aria-pressed={on}
                  className={cn(
                    "flex min-w-[10rem] shrink-0 flex-col items-start rounded-2xl p-4 text-left ring-1 transition-all duration-200 ease-spring active:scale-[0.98]",
                    on ? "bg-ink text-bg ring-ink" : "bg-surface ring-line hover:ring-ink/30",
                  )}
                >
                  <Briefcase className={cn("mb-3 size-4", on ? "text-ball" : "text-muted")} />
                  <span className="font-semibold">{r.nickname}</span>
                  <span className={cn("text-xs", on ? "text-bg/70" : "text-muted")}>
                    {[r.brand, r.model].filter(Boolean).join(" ") || "Custom racket"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div>
        {bagRackets.length > 0 && <p className="eyebrow mb-3">Or search the catalog</p>}
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Brand or model — e.g. Pure Aero"
            className="h-14 pl-11 text-base"
            aria-label="Search racket catalog"
            autoFocus={bagRackets.length === 0}
          />
        </div>
        {debounced.trim().length >= 2 && (
          <div className="mt-2 overflow-hidden rounded-2xl bg-surface ring-1 ring-line">
            {search.isLoading && <p className="px-4 py-3 text-sm text-muted">Searching…</p>}
            {!search.isLoading && (search.data?.length ?? 0) === 0 && (
              <p className="px-4 py-3 text-sm text-muted">No match. Choose “I don't know” below and we'll estimate.</p>
            )}
            <ul className="max-h-72 overflow-y-auto">
              {search.data?.map((r) => {
                const on = state.racketId === r.id && !state.savedRacketId;
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setState((s) => ({ ...s, racketId: r.id, racketLabel: `${r.brand} ${r.model}`, savedRacketId: null, unknownRacket: false }));
                        setQuery("");
                      }}
                      className={cn("flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface-2", on && "bg-surface-2")}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {r.brand} {r.model}
                        </span>
                        <span className="text-xs text-muted">
                          {[r.headSize && `${r.headSize} in²`, r.stringPattern, r.stiffnessRa && `RA ${r.stiffnessRa}`].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      {on && <Check className="size-4 text-grass" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {selectedLabel && (
        <div className="flex items-center gap-3 rounded-2xl bg-grass-soft px-4 py-3 text-grass">
          <Check className="size-5 shrink-0" />
          <span className="text-sm">
            Stringing <strong className="font-semibold">{selectedLabel}</strong>
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={() => setState((s) => ({ ...s, unknownRacket: true, racketId: null, savedRacketId: null, racketLabel: "" }))}
        aria-pressed={state.unknownRacket}
        className={cn(
          "flex w-full items-center gap-3 rounded-2xl px-5 py-4 text-left ring-1 transition-colors",
          state.unknownRacket ? "bg-ink text-bg ring-ink" : "bg-transparent ring-line hover:ring-ink/30",
        )}
      >
        <HelpCircle className="size-5 shrink-0" />
        <span>
          <span className="block font-semibold">I don't know my racket</span>
          <span className={cn("text-sm", state.unknownRacket ? "text-bg/70" : "text-muted")}>We'll give you an estimated setup.</span>
        </span>
      </button>

      {!signedIn && (
        <p className="text-sm text-muted">
          <Link href="/signup" className="font-medium text-ink underline underline-offset-4">
            Create a free account
          </Link>{" "}
          to save your setups and get restring reminders.
        </p>
      )}
    </div>
  );
}

const THINKING_LINES = [
  "Reading your frame's stiffness and pattern…",
  "Weighing spin against comfort…",
  "Checking tension against your arm…",
  "Picking specific strings…",
];

function Thinking({ label }: { label: string }) {
  const [i, setI] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % THINKING_LINES.length), 1800);
    return () => clearInterval(t);
  }, []);
  return (
    <Page narrow className="grid min-h-[70dvh] place-items-center text-center">
      <div aria-live="polite" aria-busy="true">
        <div className="relative mx-auto mb-10 h-24 w-16">
          <span className="absolute left-1/2 top-0 block size-12 -translate-x-1/2 animate-ball-bounce rounded-full bg-ball shadow-[inset_-5px_-5px_0_rgb(0_0_0/0.12)]">
            <span className="absolute inset-1 rounded-full border-2 border-white/70 [clip-path:inset(0_50%_0_0)]" />
          </span>
          <span className="absolute bottom-0 left-1/2 h-2 w-10 -translate-x-1/2 rounded-full bg-ink/10 blur-[2px]" />
        </div>
        <p className="eyebrow mb-3">Your technician is working</p>
        <h1 className="display text-4xl">{label ? `Dialling in ${label}` : "Building your setup"}</h1>
        <AnimatePresence mode="wait">
          <motion.p
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mt-4 text-muted"
          >
            {THINKING_LINES[i]}
          </motion.p>
        </AnimatePresence>
      </div>
    </Page>
  );
}
