import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl bg-surface shadow-card ring-1 ring-line/70", className)} {...props} />;
}

type Tone = "neutral" | "brand" | "grass" | "clay" | "hard" | "ball";
const tones: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted",
  brand: "bg-brand-soft text-brand",
  grass: "bg-grass-soft text-grass",
  clay: "bg-clay-soft text-clay",
  hard: "bg-hard-soft text-hard",
  ball: "bg-ball text-ball-ink",
};

export function Badge({ tone = "neutral", className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold leading-none", tones[tone], className)}
      {...props}
    />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  body?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center rounded-2xl border border-dashed border-line px-6 py-12 text-center", className)}>
      {icon && <div className="mb-4 grid size-14 place-items-center rounded-full bg-surface-2 text-muted [&_svg]:size-6">{icon}</div>}
      <h3 className="display text-2xl">{title}</h3>
      {body && <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="display text-[2.5rem] leading-[1.02] sm:text-5xl">{title}</h1>
        {description && <p className="mt-3 max-w-xl text-[0.9375rem] leading-relaxed text-muted">{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 truncate font-mono text-lg font-semibold tabular text-ink">{value}</p>
      {hint && <p className="text-2xs text-faint">{hint}</p>}
    </div>
  );
}

/** Segmented control for small mutually exclusive choices. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: React.ReactNode }>;
  label: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex rounded-full bg-surface-2 p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex-1 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ease-spring",
            value === o.value ? "bg-ink text-bg shadow-card" : "text-muted hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Large tappable choice chip used in forms and the setup wizard. */
export function Chip({
  selected,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "rounded-full border px-4 py-2.5 text-sm font-medium transition-all duration-200 ease-spring active:scale-[0.97]",
        selected ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink hover:border-ink/30",
        className,
      )}
      {...props}
    />
  );
}
