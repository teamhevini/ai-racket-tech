import * as React from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarCheck } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useMe } from "@/hooks/use-me";
import { get } from "@/lib/api";
import { BookingSheet } from "./BookingSheet";
import { bookingQuery, mergePrefill, type BookingPrefill, type MarketShop, type SuggestResponse } from "./types";

/**
 * "Book a restring": opens the booking sheet at the player's last 10IS shop for
 * this racket (pre-filled with the last setup), or sends them to the shop
 * directory with the same pre-fill carried in the query string.
 * `prefill` wins over what the last restring suggests.
 */
export function BookRestringButton({
  prefill,
  children,
  ...buttonProps
}: { prefill: BookingPrefill; children?: React.ReactNode } & Omit<ButtonProps, "onClick" | "asChild" | "prefix">) {
  const { signedIn } = useMe();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [busy, setBusy] = React.useState(false);
  const [target, setTarget] = React.useState<{ shop: MarketShop; prefill: BookingPrefill } | null>(null);
  const [open, setOpen] = React.useState(false);

  async function go() {
    const fallback = `/shops?${bookingQuery(prefill)}`;
    if (!signedIn) return navigate(fallback);
    setBusy(true);
    try {
      const url = `/api/bookings/suggest${prefill.savedRacketId ? `?racketId=${prefill.savedRacketId}` : ""}`;
      const s = await qc.fetchQuery<SuggestResponse>({ queryKey: [url], queryFn: () => get<SuggestResponse>(url), staleTime: 60_000 });
      if (!s.shop || !s.shop.acceptingBookings) return navigate(fallback);
      // An explicit string choice replaces the last job's string entirely (no mixing a stringId with other mains).
      const last = s.prefill && (prefill.stringId || prefill.mains) ? { ...s.prefill, stringId: null, mains: null, crosses: null, gauge: null } : s.prefill;
      setTarget({ shop: s.shop, prefill: mergePrefill(last, prefill) });
      setOpen(true);
    } catch {
      navigate(fallback);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button {...buttonProps} loading={busy} onClick={go}>
        {children ?? (
          <>
            <CalendarCheck /> Book a restring
          </>
        )}
      </Button>
      {target && <BookingSheet open={open} onOpenChange={setOpen} shop={target.shop} prefill={target.prefill} />}
    </>
  );
}
