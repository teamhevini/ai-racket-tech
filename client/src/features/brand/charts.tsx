import * as React from "react";
import { cn } from "@/lib/utils";
import { SUPPRESSED_NOTE, int, pct } from "./shared";

const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const weekLabel = (iso: string) => shortDate.format(new Date(`${iso}T12:00:00Z`));

/**
 * Single-series area chart for share of recommendations over time.
 * Crosshair + tooltip on hover/touch; a hidden table for screen readers.
 */
export function ShareAreaChart({
  points,
  className,
}: {
  /** Null values are weeks suppressed for having fewer than 5 players; drawn as gaps. */
  points: Array<{ week: string; share: number | null; recommended: number | null; total: number | null }>;
  className?: string;
}) {
  const [hover, setHover] = React.useState<number | null>(null);
  const wrap = React.useRef<HTMLDivElement>(null);
  const W = 640;
  const H = 220;
  const pad = { t: 16, r: 12, b: 28, l: 40 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const maxRaw = Math.max(1, ...points.map((p) => p.share ?? 0));
  const step = maxRaw <= 5 ? 1 : maxRaw <= 10 ? 2 : maxRaw <= 25 ? 5 : maxRaw <= 50 ? 10 : 20;
  const max = Math.ceil((maxRaw * 1.1) / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= max; v += step) ticks.push(v);
  const x = (i: number) => pad.l + (points.length <= 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  const y = (v: number) => pad.t + ih - (v / max) * ih;
  // Contiguous runs of visible weeks; a suppressed week breaks the line rather than dropping to zero.
  const runs: Array<Array<{ i: number; v: number }>> = [];
  points.forEach((p, i) => {
    if (p.share == null) return;
    const last = runs[runs.length - 1];
    if (last && last[last.length - 1].i === i - 1) last.push({ i, v: p.share });
    else runs.push([{ i, v: p.share }]);
  });
  const line = runs.map((r) => r.map((pt, k) => `${k ? "L" : "M"}${x(pt.i).toFixed(1)},${y(pt.v).toFixed(1)}`).join(" ")).join(" ");
  const area = runs
    .filter((r) => r.length > 1)
    .map((r) => `${r.map((pt, k) => `${k ? "L" : "M"}${x(pt.i).toFixed(1)},${y(pt.v).toFixed(1)}`).join(" ")} L${x(r[r.length - 1].i)},${y(0)} L${x(r[0].i)},${y(0)} Z`)
    .join(" ");
  const lastVisible = [...points.keys()].reverse().find((i) => points[i].share != null);

  const onMove = (clientX: number) => {
    const el = wrap.current;
    if (!el || !points.length) return;
    const r = el.getBoundingClientRect();
    const sx = ((clientX - r.left) / r.width) * W;
    const i = Math.round(((sx - pad.l) / iw) * (points.length - 1));
    setHover(Math.max(0, Math.min(points.length - 1, i)));
  };

  const h = hover != null ? points[hover] : null;

  return (
    <div className={cn("relative", className)}>
      <div
        ref={wrap}
        className="relative touch-pan-y"
        onPointerMove={(e) => onMove(e.clientX)}
        onPointerDown={(e) => onMove(e.clientX)}
        onPointerLeave={() => setHover(null)}
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full overflow-visible" role="img" aria-label="Share of AI recommendations by week">
          <defs>
            <linearGradient id="share-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--brand))" stopOpacity="0.22" />
              <stop offset="100%" stopColor="rgb(var(--brand))" stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="rgb(var(--line))" strokeWidth={1} strokeDasharray={t === 0 ? undefined : "2 4"} />
              <text x={pad.l - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-faint font-mono text-[10px]">
                {t}%
              </text>
            </g>
          ))}
          {points.map((p, i) =>
            i % 2 === (points.length - 1) % 2 ? (
              <text key={p.week} x={x(i)} y={H - 8} textAnchor="middle" className="fill-faint text-[10px]">
                {weekLabel(p.week)}
              </text>
            ) : null,
          )}
          <path d={area} fill="url(#share-fill)" />
          <path d={line} fill="none" stroke="rgb(var(--brand))" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {runs.filter((r) => r.length === 1).map((r) => (
            <circle key={`dot-${r[0].i}`} cx={x(r[0].i)} cy={y(r[0].v)} r={2.5} fill="rgb(var(--brand))" />
          ))}
          {h && hover != null && h.share != null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={y(0)} stroke="rgb(var(--ink) / 0.25)" strokeWidth={1} />
              <circle cx={x(hover)} cy={y(h.share)} r={5} fill="rgb(var(--brand))" stroke="rgb(var(--surface))" strokeWidth={2} />
            </g>
          )}
          {lastVisible != null && hover == null && (
            <circle cx={x(lastVisible)} cy={y(points[lastVisible].share!)} r={4} fill="rgb(var(--brand))" stroke="rgb(var(--surface))" strokeWidth={2} />
          )}
        </svg>
        {h && hover != null && (
          <div
            className="pointer-events-none absolute top-0 z-10 w-max -translate-x-1/2 rounded-xl bg-ink px-3 py-2 text-xs text-bg shadow-lift"
            style={{ left: `${Math.min(85, Math.max(15, (x(hover) / W) * 100))}%` }}
          >
            <p className="text-bg/60">Week of {weekLabel(h.week)}</p>
            {h.share == null ? (
              <p className="mt-0.5 text-bg/80">{SUPPRESSED_NOTE}</p>
            ) : (
              <>
                <p className="mt-0.5 font-semibold tabular">{pct(h.share)} share</p>
                <p className="tabular text-bg/70">
                  {int(h.recommended ?? 0)} of {int(h.total ?? 0)} picks
                </p>
              </>
            )}
          </div>
        )}
      </div>
      <table className="sr-only">
        <caption>Share of AI recommendations by week</caption>
        <thead>
          <tr>
            <th>Week</th>
            <th>Share</th>
            <th>Your picks</th>
            <th>All picks</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.week}>
              <td>{p.week}</td>
              <td>{p.share == null ? SUPPRESSED_NOTE : pct(p.share)}</td>
              <td>{p.recommended ?? "—"}</td>
              <td>{p.total ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Horizontal bar list. Null values are k-anonymity suppressed and drawn as an empty track. */
export function BarList({
  rows,
  format = int,
  max: maxProp,
  barClass = "bg-grass",
}: {
  rows: Array<{ label: string; value: number | null; sub?: React.ReactNode }>;
  format?: (n: number) => string;
  max?: number;
  barClass?: string;
}) {
  const max = maxProp ?? Math.max(1, ...rows.map((r) => r.value ?? 0));
  return (
    <ul className="space-y-3.5">
      {rows.map((r) => (
        <li key={r.label} title={r.value == null ? SUPPRESSED_NOTE : `${r.label}: ${format(r.value)}`}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-ink">{r.label}</span>
            <span className="shrink-0 font-mono text-xs tabular text-muted">
              {r.value == null ? <span className="cursor-help text-faint">—</span> : format(r.value)}
              {r.sub && <span className="ml-2 text-faint">{r.sub}</span>}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            {r.value != null && (
              <div
                className={cn("h-full rounded-full transition-[width] duration-700 ease-spring", barClass)}
                style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }}
              />
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Funnel: each stage as a bar relative to the first, with step conversion. */
export function Funnel({ stages }: { stages: Array<{ label: string; players: number | null }> }) {
  const top = stages[0]?.players ?? Math.max(1, ...stages.map((s) => s.players ?? 0));
  return (
    <ol className="space-y-2.5">
      {stages.map((s, i) => {
        const prev = i > 0 ? stages[i - 1].players : null;
        const conv = s.players != null && prev ? (s.players / prev) * 100 : null;
        const w = s.players != null && top ? Math.max(3, (s.players / top) * 100) : 0;
        return (
          <li key={s.label} className="grid grid-cols-[6.5rem_1fr] items-center gap-3 sm:grid-cols-[8rem_1fr]" title={s.players == null ? SUPPRESSED_NOTE : undefined}>
            <span className="text-sm text-ink">{s.label}</span>
            <div className="flex min-w-0 items-center gap-3">
              <div className="h-8 min-w-0 flex-1 overflow-hidden rounded-lg bg-surface-2">
                {s.players != null && (
                  <div
                    className="flex h-full items-center rounded-lg bg-hard/85 px-2.5 transition-[width] duration-700 ease-spring"
                    style={{ width: `${w}%`, opacity: 1 - i * 0.1 }}
                  />
                )}
              </div>
              <span className="w-[4.5rem] shrink-0 text-right font-mono text-xs tabular">
                {s.players == null ? <span className="cursor-help text-faint">—</span> : int(s.players)}
                {i > 0 && <span className="block text-[10px] text-faint">{conv == null ? "" : `${conv.toFixed(1)}% step`}</span>}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Ring meter for a single percentage. */
export function Ring({ value, size = 112, className }: { value: number | null; size?: number; className?: string }) {
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }} title={value == null ? SUPPRESSED_NOTE : undefined}>
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--surface-2))" strokeWidth={8} />
        {value != null && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="rgb(var(--grass))"
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={`${(Math.min(100, value) / 100) * c} ${c}`}
          />
        )}
      </svg>
      <span className="display absolute inset-0 grid place-items-center text-2xl tabular">{value == null ? "—" : `${value.toFixed(1)}%`}</span>
    </div>
  );
}
