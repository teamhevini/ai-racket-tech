import * as React from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { Check, Loader2, X, Zap } from "lucide-react";
import type { JobDetail } from "./types";
import { dueLabel, stringText, useSetStatus } from "./util";

const fmt = (n: number | null | undefined) => (n == null ? "—" : Number.isInteger(n) ? String(n) : n.toFixed(1));

type WakeLockSentinelLike = { release: () => Promise<void> };
type WakeLockNav = Navigator & { wakeLock?: { request: (t: "screen") => Promise<WakeLockSentinelLike> } };

/**
 * Full-screen, high-contrast view for when the racket is clamped in.
 * Gigantic tension, the string, and one button.
 */
export function MachineMode({ id, onClose }: { id: number; onClose: () => void }) {
  const q = useQuery<JobDetail>({ queryKey: [`/api/shop/bookings/${id}`] });
  const setStatus = useSetStatus();
  const b = q.data?.booking;
  const started = React.useRef(false);

  // Keep the screen awake and lock page scroll while the overlay is up.
  React.useEffect(() => {
    let lock: WakeLockSentinelLike | null = null;
    (navigator as WakeLockNav).wakeLock
      ?.request("screen")
      .then((l) => (lock = l))
      .catch(() => {});
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      lock?.release().catch(() => {});
    };
  }, [onClose]);

  // Opening machine mode on a queued job means it's on the machine now.
  React.useEffect(() => {
    if (b && b.status === "accepted" && !started.current) {
      started.current = true;
      setStatus.mutate({ id: b.id, status: "in_progress", name: b.customerName, app: !!b.playerUserId });
    }
  }, [b, setStatus]);

  const done = () => {
    if (!b) return;
    setStatus.mutate({ id: b.id, status: "ready", name: b.customerName, app: !!b.playerUserId }, { onSuccess: onClose });
  };

  const sameTension = b && (b.tensionCrosses == null || b.tensionCrosses === b.tensionMains);
  const due = b ? dueLabel(b.dueAt) : null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Machine mode"
      className="pointer-events-auto fixed inset-0 z-[70] flex flex-col bg-[#050706] text-white animate-in fade-in-0 duration-300"
    >
      <div className="flex items-start justify-between gap-4 px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="min-w-0">
          <p className="text-2xs font-semibold uppercase tracking-[0.18em] text-white/50">Machine mode</p>
          {b && (
            <p className="mt-1 truncate text-lg font-semibold">
              {b.customerName} · <span className="text-white/70">{b.racketLabel}</span>
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Exit machine mode"
          className="grid size-14 shrink-0 place-items-center rounded-full bg-white/10 transition active:scale-95"
        >
          <X className="size-6" />
        </button>
      </div>

      {!b ? (
        <div className="grid flex-1 place-items-center">
          <Loader2 className="size-10 animate-spin text-white/50" />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-6 overflow-y-auto px-5 py-6">
          <div className="flex flex-wrap items-center gap-2">
            {b.rush && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d6f04a] px-3 py-1.5 text-sm font-bold text-[#181f06]">
                <Zap className="size-4" /> RUSH
              </span>
            )}
            {due && <span className={due.overdue ? "text-base font-semibold text-[#ff5a70]" : "text-base text-white/60"}>{due.text}</span>}
          </div>

          {sameTension ? (
            <div>
              <p className="font-mono font-bold leading-[0.85] tabular text-[clamp(7rem,38vw,18rem)]">{fmt(b.tensionMains)}</p>
              <p className="mt-2 text-xl text-white/60">lbs · mains & crosses</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/50">Mains</p>
                <p className="font-mono font-bold leading-[0.9] tabular text-[clamp(5rem,30vw,14rem)]">{fmt(b.tensionMains)}</p>
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/50">Crosses</p>
                <p className="font-mono font-bold leading-[0.9] tabular text-[clamp(5rem,30vw,14rem)] text-[#d6f04a]">{fmt(b.tensionCrosses)}</p>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <p className="text-3xl font-semibold leading-tight sm:text-4xl">{stringText({ ...b, string: q.data?.string ?? null })}</p>
            <p className="text-lg text-white/60">
              {[b.gauge && `${b.gauge} gauge`, q.data?.racket?.stringPattern && `${q.data.racket.stringPattern} pattern`, b.playerSuppliesString && "player's own string"]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>

          {(b.notes || b.shopNotes) && (
            <div className="space-y-2 rounded-2xl bg-white/[0.06] p-4 text-lg leading-snug">
              {b.notes && <p>“{b.notes}”</p>}
              {b.shopNotes && <p className="text-[#d6f04a]">Shop: {b.shopNotes}</p>}
            </div>
          )}
        </div>
      )}

      <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
        <button
          type="button"
          onClick={done}
          disabled={!b || setStatus.isPending || b.status === "ready"}
          className="flex h-24 w-full items-center justify-center gap-3 rounded-[2rem] bg-[#d6f04a] text-2xl font-bold text-[#181f06] shadow-[0_20px_50px_-20px_rgba(214,240,74,0.7)] transition active:scale-[0.98] disabled:opacity-60"
        >
          {setStatus.isPending ? <Loader2 className="size-7 animate-spin" /> : <Check className="size-8" />}
          Done — mark ready
        </button>
      </div>
    </div>,
    document.body,
  );
}
