import * as React from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CalendarCheck } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useMe } from "@/hooks/use-me";
import { get } from "@/lib/api";
import { BookingSheet } from "./BookingSheet";
import { InviteStringerSheet } from "./InviteStringer";
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
  const [invite, setInvite] = React.useState<{ savedStringerId: number; name: string; fallback: string } | null>(null);

  async function go() {
    const fallback = `/shops?${bookingQuery(prefill)}`;
    if (!signedIn) return navigate(fallback);
    setBusy(true);
    try {
      const url = `/api/bookings/suggest${prefill.savedRacketId ? `?racketId=${prefill.savedRacketId}` : ""}`;
      const s = await qc.fetchQuery<SuggestResponse>({ queryKey: [url], queryFn: () => get<SuggestResponse>(url), staleTime: 60_000 });
      // Their usual stringer isn't on 10IS yet: offer to bring them, rather than pushing a stranger's shop.
      if (!s.shop && s.invitable) return setInvite({ ...s.invitable, fallback });
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
      {invite && (
        <InviteStringerSheet
          open={!!invite}
          onOpenChange={(v) => !v && setInvite(null)}
          savedStringerId={invite.savedStringerId}
          name={invite.name}
          title={`${invite.name} isn't on 10IS yet`}
          description="Invite them and you'll book them here next time. Or book another stringer now."
          extra={
            <Button variant="ghost" className="-ml-3" onClick={() => navigate(invite.fallback)}>
              Book another stringer instead <ArrowRight />
            </Button>
          }
        />
      )}
    </>
  );
}
