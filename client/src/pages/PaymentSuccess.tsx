import * as React from "react";
import { Link, useSearch } from "wouter";
import { motion } from "framer-motion";
import { Check, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { Me } from "@/lib/types";
import { useRefreshMe } from "@/hooks/use-me";
import { PLANS } from "@shared/tiers";

type State = { status: "loading" } | { status: "ok"; tier: "pro" | "club" } | { status: "error"; message: string };

export default function PaymentSuccess() {
  const search = useSearch();
  const refreshMe = useRefreshMe();
  const [state, setState] = React.useState<State>({ status: "loading" });
  const ran = React.useRef(false);

  React.useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const sessionId = new URLSearchParams(search).get("session_id");
    if (!sessionId) return setState({ status: "error", message: "We couldn't find your payment details." });
    api<{ tier: "pro" | "club"; user: Me }>("POST", "/api/checkout/verify", { session_id: sessionId })
      .then(async (res) => {
        await refreshMe(res.user);
        setState({ status: "ok", tier: res.tier });
      })
      .catch((err) => setState({ status: "error", message: err instanceof Error ? err.message : "Verification failed." }));
  }, [search, refreshMe]);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 py-12 text-center">
      {state.status === "loading" && (
        <>
          <span className="size-8 animate-ball-bounce rounded-full bg-ball" aria-hidden />
          <p className="mt-6 text-muted" role="status">Confirming your payment…</p>
        </>
      )}
      {state.status === "error" && (
        <>
          <XCircle className="size-12 text-brand" aria-hidden />
          <h1 className="display mt-6 text-4xl">Something didn't land</h1>
          <p className="mt-3 text-muted">{state.message} If you were charged, your plan will still activate within a few minutes — or contact us and we'll sort it.</p>
          <div className="mt-8 flex gap-3">
            <Button asChild variant="secondary"><Link href="/account?tab=plan">Check my plan</Link></Button>
            <Button asChild><Link href="/pricing">Back to pricing</Link></Button>
          </div>
        </>
      )}
      {state.status === "ok" && (
        <>
          <motion.div
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", bounce: 0.5, duration: 0.8 }}
            className="grid size-20 place-items-center rounded-full bg-ball text-ball-ink shadow-[0_20px_40px_-16px_rgb(var(--ball))]"
          >
            <Check className="size-9" strokeWidth={3} />
          </motion.div>
          <p className="eyebrow mt-8">Game, set, upgraded</p>
          <h1 className="display mt-2 text-5xl">Welcome to {PLANS[state.tier].name}</h1>
          <ul className="mt-6 space-y-2 text-left text-sm">
            {PLANS[state.tier].features.map((f) => (
              <li key={f} className="flex gap-2"><Check className="mt-0.5 size-4 text-grass" />{f}</li>
            ))}
          </ul>
          <Button asChild size="lg" className="mt-10 w-full">
            <Link href="/bag">Open my bag</Link>
          </Button>
        </>
      )}
    </div>
  );
}
