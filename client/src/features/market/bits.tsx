import * as React from "react";
import { BadgeCheck, FlaskConical, Star } from "lucide-react";
import { Badge } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

export function RatingInline({ rating, className }: { rating?: { avg: number | null; count: number } | null; className?: string }) {
  if (!rating?.avg || !rating.count) return <span className={cn("text-sm text-muted", className)}>New on 10IS</span>;
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm", className)}>
      <Star className="size-4 fill-current text-clay" aria-hidden />
      <span className="font-semibold tabular">{rating.avg.toFixed(1)}</span>
      <span className="text-muted">({rating.count})</span>
      <span className="sr-only">out of 5 from {rating.count} verified bookings</span>
    </span>
  );
}

export function VerifiedShopBadge() {
  return (
    <Badge tone="grass">
      <BadgeCheck className="size-3.5" /> Verified shop
    </Badge>
  );
}

export function DemoBadge({ what = "Demo listing" }: { what?: string }) {
  return (
    <Badge tone="neutral" title="Example data so you can see how 10IS works">
      <FlaskConical className="size-3.5" /> {what}
    </Badge>
  );
}

/** Interactive or read-only 1–5 stars. */
export function Stars({
  value,
  onChange,
  disabled,
  size = "md",
}: {
  value: number | null;
  onChange?: (v: number) => void;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const [hover, setHover] = React.useState<number | null>(null);
  const shown = hover ?? value ?? 0;
  const icon = size === "sm" ? "size-4" : "size-8";
  if (!onChange) {
    return (
      <span className="inline-flex gap-0.5" aria-label={`${value ?? 0} of 5 stars`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} className={cn(icon, n <= shown ? "fill-current text-clay" : "text-line")} aria-hidden />
        ))}
      </span>
    );
  }
  return (
    <div role="radiogroup" aria-label="Rate this restring" className="inline-flex" onMouseLeave={() => setHover(null)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
          disabled={disabled}
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
          className="grid size-11 place-items-center rounded-full transition-transform active:scale-90 disabled:opacity-50"
        >
          <Star className={cn(icon, "transition-colors", n <= shown ? "fill-current text-clay" : "text-line")} aria-hidden />
        </button>
      ))}
    </div>
  );
}

/** Editorial spec 1–10 as a bar. */
export function SpecBar({ label, value, accent }: { label: string; value: number; accent?: string | null }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span className="font-mono font-semibold tabular">{value}/10</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="meter" aria-valuemin={1} aria-valuemax={10} aria-valuenow={value} aria-label={label}>
        <div className="h-full rounded-full bg-ink" style={{ width: `${value * 10}%`, backgroundColor: accent ?? undefined }} />
      </div>
    </div>
  );
}

/** Pick a readable text colour for an arbitrary brand accent. */
export function readableOn(hex: string | null | undefined): "light" | "dark" {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? "");
  if (!m) return "light";
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? "dark" : "light";
}
