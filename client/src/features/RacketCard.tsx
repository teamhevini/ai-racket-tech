import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
import { FreshnessRing, statusText, statusTone } from "@/components/FreshnessRing";
import { Badge } from "@/components/ui/surface";
import { racketName, relativeDays, setupLabel, tensionLabel } from "@/lib/format";
import type { BagRacket } from "@/lib/types";
import { cn } from "@/lib/utils";

/** One racket in the bag: freshness ring, current setup, status. */
export function RacketCard({ racket, className }: { racket: BagRacket; className?: string }) {
  const job = racket.latestJob;
  const setup = job ? setupLabel(job.mains, job.crosses) : null;
  const tension = job ? tensionLabel(job.tensionMains, job.tensionCrosses) : null;
  return (
    <Link
      href={`/bag/${racket.id}`}
      className={cn(
        "group flex items-center gap-4 rounded-2xl bg-surface p-4 shadow-card ring-1 ring-line/70 transition-all duration-300 ease-spring hover:-translate-y-0.5 hover:shadow-lift active:scale-[0.99] sm:p-5",
        className,
      )}
    >
      <FreshnessRing reminder={racket.reminder} size={72} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-lg font-semibold tracking-tight">{racket.nickname}</h3>
        </div>
        {racketName(racket) && <p className="truncate text-sm text-muted">{racketName(racket)}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          {racket.reminderEnabled ? (
            <Badge tone={statusTone(racket.reminder.status)}>{statusText(racket.reminder)}</Badge>
          ) : (
            <Badge>Reminders off</Badge>
          )}
          {setup && (
            <span className="truncate text-xs text-muted">
              {setup}
              {tension && <span className="font-mono tabular"> · {tension}</span>}
            </span>
          )}
        </div>
        {job && <p className="mt-1 text-2xs text-faint">Strung {relativeDays(job.strungAt)} · {racket.jobCount} in history</p>}
      </div>
      <ChevronRight className="size-5 shrink-0 text-faint transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}
