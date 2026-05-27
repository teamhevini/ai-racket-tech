import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Status = "loading" | "success" | "error";

export default function PaymentSuccess() {
  const [status, setStatus] = useState<Status>("loading");
  const [tier, setTier] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const tierParam = params.get("tier");

    if (!sessionId) {
      setStatus("error");
      return;
    }

    fetch("/api/checkout/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId }),
      credentials: "include",
    })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        setTier(data.tier || tierParam);
        setStatus("success");
      })
      .catch(() => setStatus("error"));
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-court-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-hevini-red mx-auto" />
          <p className="text-net-grey text-sm">Confirming your payment...</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-court-black flex items-center justify-center px-4">
        <div className="text-center space-y-6 max-w-sm">
          <XCircle className="w-12 h-12 text-hevini-red mx-auto" />
          <div>
            <p
              className="text-hevini-red text-[10px] font-bold uppercase mb-3"
              style={{ letterSpacing: "0.15em" }}
            >
              Payment Error
            </p>
            <h2 className="text-court-white font-display font-bold text-2xl mb-2">
              Could not confirm payment
            </h2>
            <p className="text-net-grey text-sm">
              If you were charged, contact us at contact@hevini.com and we'll sort it out.
            </p>
          </div>
          <Link href="/pricing">
            <Button
              className="bg-hevini-red hover:bg-hevini-red-dark text-white rounded-[2px] font-bold uppercase border-0 h-11 px-8"
              style={{ letterSpacing: "0.1em" }}
            >
              TRY AGAIN
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const tierLabel = tier === "club" ? "10IS Club" : "10IS Pro";
  const tierDesc =
    tier === "club"
      ? "You now have unlimited recommendations, full stringer results, AI chat, and multi-profile support."
      : "You now have unlimited recommendations, full stringer results, shareable setups, and more.";

  return (
    <div className="min-h-screen bg-court-black flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-sm">
        <div className="w-16 h-16 rounded-full bg-hevini-red/10 border border-hevini-red/40 flex items-center justify-center mx-auto">
          <CheckCircle className="w-7 h-7 text-hevini-red" />
        </div>
        <div>
          <p
            className="text-hevini-red text-[10px] font-bold uppercase mb-3"
            style={{ letterSpacing: "0.15em" }}
          >
            Welcome to {tierLabel}
          </p>
          <h2 className="text-court-white font-display font-bold text-2xl mb-2">
            You're all set.
          </h2>
          <p className="text-net-grey text-sm leading-relaxed">{tierDesc}</p>
        </div>
        <Link href="/onboarding">
          <Button
            className="w-full bg-hevini-red hover:bg-hevini-red-dark text-white rounded-[2px] font-bold uppercase border-0 h-12"
            style={{ letterSpacing: "0.1em" }}
          >
            GET MY FIRST SETUP
          </Button>
        </Link>
      </div>
    </div>
  );
}
