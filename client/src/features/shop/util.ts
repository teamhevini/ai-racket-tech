import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { money } from "@/lib/format";
import type { BookingStatus, QueueItem } from "./types";

export const cents = (n: number | null | undefined) => (n == null ? "—" : money(n / 100));

export const STATUS_LABEL: Record<BookingStatus, string> = {
  requested: "New request",
  accepted: "To string",
  in_progress: "On the machine",
  ready: "Ready for pickup",
  collected: "Collected",
  cancelled: "Cancelled",
  declined: "Declined",
};

/** The one thumb action that moves a job forward. */
export const PRIMARY_NEXT: Partial<Record<BookingStatus, { to: BookingStatus; label: string }>> = {
  requested: { to: "accepted", label: "Accept" },
  accepted: { to: "in_progress", label: "Start" },
  in_progress: { to: "ready", label: "Mark ready" },
  ready: { to: "collected", label: "Collected" },
};

const DONE_TOAST: Partial<Record<BookingStatus, (name: string, app: boolean) => string>> = {
  accepted: (n, app) => (app ? `Accepted — ${n} will see it in their app` : `Accepted ${n}'s racket`),
  in_progress: (n) => `${n}'s racket is on the machine`,
  ready: (n, app) => (app ? `Ready — ${n} sees it in the 10IS app` : `Ready for pickup — give ${n} a call`),
  collected: (n) => `${n} collected — nice work`,
  declined: (n) => `Declined ${n}'s request`,
  cancelled: () => "Job cancelled",
};

const fmtNum = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** "52/50" (or "52" when mains and crosses match); null when no tension was given. */
export function tensionText(mains: number | null | undefined, crosses: number | null | undefined) {
  if (mains == null && crosses == null) return null;
  if (mains == null) return fmtNum(crosses!);
  if (crosses == null || crosses === mains) return fmtNum(mains);
  return `${fmtNum(mains)}/${fmtNum(crosses)}`;
}

export function stringText(b: Pick<QueueItem, "mains" | "crosses"> & { string?: QueueItem["string"] }) {
  if (b.string) {
    const name = `${b.string.brandName} ${b.string.model}`;
    return b.crosses && b.crosses !== b.mains && b.crosses !== name ? `${name} / ${b.crosses}` : name;
  }
  if (b.mains && b.crosses && b.crosses !== b.mains) return `${b.mains} / ${b.crosses}`;
  return b.mains ?? b.crosses ?? "String not set";
}

/** "due in 3h", "overdue 2h", "due Thu". */
export function dueLabel(dueAt: string, now = Date.now()): { text: string; overdue: boolean; soon: boolean } {
  const diff = new Date(dueAt).getTime() - now;
  const mins = Math.round(Math.abs(diff) / 60_000);
  const span = mins < 60 ? `${Math.max(mins, 1)}m` : mins < 60 * 36 ? `${Math.round(mins / 60)}h` : `${Math.round(mins / 1440)}d`;
  if (diff < 0) return { text: `overdue ${span}`, overdue: true, soon: true };
  if (diff < 36 * 3_600_000) return { text: `due in ${span}`, overdue: false, soon: diff < 4 * 3_600_000 };
  const day = new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(new Date(dueAt));
  return { text: diff < 6 * 86_400_000 ? `due ${day}` : `due in ${span}`, overdue: false, soon: false };
}

const dateTime = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
export const formatDateTime = (d: string | Date | null | undefined) => (d ? dateTime.format(new Date(d)) : "—");

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Please try again.");

export function invalidateShop(qc: QueryClient) {
  return qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("/api/shop") });
}

export const ACTIVE_QUEUE_KEY = ["/api/shop/queue?view=active"];

/** Move a job to a new status, with the queue updated before the server answers. */
export function useSetStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: number; status: BookingStatus; note?: string; name: string; app?: boolean }) =>
      api<QueueItem>("POST", `/api/shop/bookings/${v.id}/status`, { status: v.status, note: v.note }),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: ACTIVE_QUEUE_KEY });
      const prev = qc.getQueryData<QueueItem[]>(ACTIVE_QUEUE_KEY);
      if (prev) {
        const stillActive = ["requested", "accepted", "in_progress", "ready"].includes(v.status);
        qc.setQueryData<QueueItem[]>(
          ACTIVE_QUEUE_KEY,
          stillActive ? prev.map((b) => (b.id === v.id ? { ...b, status: v.status } : b)) : prev.filter((b) => b.id !== v.id),
        );
      }
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(ACTIVE_QUEUE_KEY, ctx.prev);
      toast.error(errMsg(e));
    },
    onSuccess: (_d, v) => {
      const msg = DONE_TOAST[v.status]?.(v.name.split(" ")[0] || v.name, !!v.app);
      if (msg) toast.success(msg);
    },
    // Fire-and-forget: awaiting the refetch here left buttons spinning when a refetch was cancelled mid-flight.
    onSettled: () => {
      void invalidateShop(qc);
    },
  });
}

export const isUpgrade = (e: unknown) => e instanceof ApiError && e.upgrade;
export const isPaymentsOff = (e: unknown) => e instanceof ApiError && e.status === 503;
export const PAYMENTS_OFF = "Payments aren't switched on in this preview yet. Shop Pro checkout will work once Stripe is connected.";
