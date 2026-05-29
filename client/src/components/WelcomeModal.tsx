import { useEffect, useState } from "react";
import { Link } from "wouter";
import { X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";
import signatureLogo from "@/assets/Hevini_08_Signature.png";

const SESSION_KEY = "10is_welcome_seen";

export function WelcomeModal() {
  const { email, loading } = useUser();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (email) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    const t = setTimeout(() => setOpen(true), 3000);
    return () => clearTimeout(t);
  }, [loading, email]);

  function dismiss() {
    sessionStorage.setItem(SESSION_KEY, "1");
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={dismiss}
    >
      <div
        className="relative w-full max-w-2xl bg-[#0A0A0A] border border-[#1A1A1A] rounded-[4px] p-6 md:p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 text-net-grey hover:text-court-white transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Logo + headline */}
        <div className="flex flex-col items-center text-center mb-6">
          <img
            src={signatureLogo}
            alt="10IS"
            className="h-12 w-12 object-contain mb-4"
          />
          <h2
            className="font-display font-black text-2xl md:text-3xl text-court-white"
            style={{ letterSpacing: "0.06em" }}
          >
            KNOW YOUR SETUP.
          </h2>
          <p className="text-net-grey text-sm mt-2 max-w-md">
            Get an AI-powered string recommendation tailored to your racket,
            playstyle, and body.
          </p>
        </div>

        {/* Tier cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {/* FREE */}
          <TierCard
            name="FREE"
            price={null}
            features={[
              "1 free recommendation",
              "Racket database access",
              "Stringer search preview",
            ]}
            cta="GET STARTED FREE"
            href="/onboarding"
            highlight={false}
            onDismiss={dismiss}
          />

          {/* PRO */}
          <TierCard
            name="PRO"
            price="$4.99 one-time"
            features={[
              "Unlimited recommendations",
              "Full stringer search",
              "Saved history & reminders",
            ]}
            cta="GET PRO"
            href="/pricing"
            highlight={false}
            onDismiss={dismiss}
          />

          {/* CLUB */}
          <TierCard
            name="CLUB"
            price="$1.99 / mo"
            features={[
              "Everything in Pro",
              "AI chat assistant",
              "Multi-profile support",
            ]}
            cta="JOIN CLUB"
            href="/pricing"
            highlight={true}
            onDismiss={dismiss}
          />
        </div>

        {/* Login link */}
        <p className="text-center text-xs text-net-grey mb-4">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-court-white font-bold hover:text-hevini-red transition-colors"
            onClick={dismiss}
          >
            LOG IN
          </Link>
        </p>

        {/* Soft dismiss */}
        <div className="text-center">
          <button
            onClick={dismiss}
            className="text-[11px] text-[#555] hover:text-net-grey transition-colors"
            style={{ letterSpacing: "0.04em" }}
          >
            No thanks, I'll explore first
          </button>
        </div>
      </div>
    </div>
  );
}

interface TierCardProps {
  name: string;
  price: string | null;
  features: string[];
  cta: string;
  href: string;
  highlight: boolean;
  onDismiss: () => void;
}

function TierCard({ name, price, features, cta, href, highlight, onDismiss }: TierCardProps) {
  return (
    <div
      className={`flex flex-col rounded-[4px] p-4 border ${
        highlight
          ? "border-hevini-red bg-[#110005]"
          : "border-[#222] bg-[#111]"
      }`}
    >
      <div className="mb-3">
        <p
          className={`font-display font-black text-sm ${highlight ? "text-hevini-red" : "text-court-white"}`}
          style={{ letterSpacing: "0.12em" }}
        >
          {name}
        </p>
        {price && (
          <p className="text-[11px] text-net-grey mt-0.5">{price}</p>
        )}
      </div>

      <ul className="space-y-1.5 mb-4 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-[11px] text-net-grey">
            <Check className={`w-3 h-3 shrink-0 mt-0.5 ${highlight ? "text-hevini-red" : "text-[#444]"}`} />
            {f}
          </li>
        ))}
      </ul>

      <Link href={href} onClick={onDismiss}>
        <Button
          size="sm"
          className={`w-full h-8 rounded-[2px] font-bold uppercase text-[10px] border-0 ${
            highlight
              ? "bg-hevini-red hover:bg-hevini-red-dark text-white"
              : "bg-[#1A1A1A] hover:bg-[#252525] text-court-white"
          }`}
          style={{ letterSpacing: "0.1em" }}
        >
          {cta}
        </Button>
      </Link>
    </div>
  );
}
