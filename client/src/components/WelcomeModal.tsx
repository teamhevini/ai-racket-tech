import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";
import signatureLogo from "@/assets/Hevini_08_Signature.png";

const SESSION_KEY = "10is_welcome_seen";

const TIERS = [
  {
    name: "FREE",
    price: null,
    priceLabel: "No credit card needed",
    features: [
      "1 free recommendation",
      "Racket database access",
      "Stringer search preview",
    ],
    cta: "GET STARTED FREE",
    href: "/onboarding",
    highlight: false,
  },
  {
    name: "PRO",
    price: "$4.99",
    priceLabel: "one-time payment",
    features: [
      "Unlimited recommendations",
      "Full stringer search",
      "Saved history & reminders",
    ],
    cta: "GET PRO",
    href: "/pricing",
    highlight: false,
  },
  {
    name: "CLUB",
    price: "$1.99",
    priceLabel: "per month",
    features: [
      "Everything in Pro",
      "AI chat assistant",
      "Multi-profile support",
    ],
    cta: "JOIN CLUB",
    href: "/pricing",
    highlight: true,
  },
] as const;

export function WelcomeModal() {
  const { email, loading } = useUser();
  const [open, setOpen] = useState(false);
  const [activeCard, setActiveCard] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.scrollWidth / TIERS.length;
    const idx = Math.min(
      Math.round(el.scrollLeft / cardWidth),
      TIERS.length - 1
    );
    setActiveCard(idx);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: "rgba(0,0,0,0.82)" }}
      onClick={dismiss}
    >
      <div
        className="relative w-full sm:max-w-2xl bg-[#0A0A0A] border border-[#1A1A1A] rounded-t-[8px] sm:rounded-[4px] shadow-2xl flex flex-col"
        style={{ maxHeight: "95vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button — large tap target */}
        <button
          onClick={dismiss}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 flex items-center justify-center bg-[#1C1C1C] border border-[#333] rounded-[4px] text-net-grey hover:text-court-white hover:border-[#555] transition-colors"
          style={{ width: 44, height: 44 }}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 pt-6 pb-5 sm:px-8 sm:pt-8 sm:pb-8">
          {/* Logo + headline */}
          <div className="flex flex-col items-center text-center mb-6 pr-8 sm:pr-0">
            <img
              src={signatureLogo}
              alt="10IS"
              className="h-10 w-10 object-contain mb-3"
            />
            <h2
              className="font-display font-black text-2xl sm:text-3xl text-court-white"
              style={{ letterSpacing: "0.06em" }}
            >
              KNOW YOUR SETUP.
            </h2>
            <p className="text-net-grey text-sm mt-2 max-w-sm leading-relaxed">
              Get an AI-powered string recommendation tailored to your racket,
              playstyle, and body.
            </p>
          </div>

          {/* ── Mobile: horizontal scroll ── */}
          <div className="sm:hidden -mx-5 mb-1">
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex overflow-x-auto gap-3 px-5 snap-x snap-mandatory"
              style={{
                scrollbarWidth: "none",
                WebkitOverflowScrolling: "touch" as any,
              }}
            >
              {TIERS.map((tier) => (
                <div
                  key={tier.name}
                  className="snap-start shrink-0"
                  style={{ width: "85%" }}
                >
                  <TierCard tier={tier} onDismiss={dismiss} />
                </div>
              ))}
              {/* trailing spacer so last card snaps fully */}
              <div className="shrink-0" style={{ width: "7.5%" }} />
            </div>
          </div>

          {/* Dot indicators (mobile only) */}
          <div className="flex sm:hidden justify-center gap-2 mt-3 mb-4">
            {TIERS.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-200 ${
                  i === activeCard
                    ? "w-5 h-2 bg-hevini-red"
                    : "w-2 h-2 bg-[#333]"
                }`}
              />
            ))}
          </div>

          {/* ── Desktop: 3-column grid ── */}
          <div className="hidden sm:grid sm:grid-cols-3 gap-3 mb-6">
            {TIERS.map((tier) => (
              <TierCard key={tier.name} tier={tier} onDismiss={dismiss} />
            ))}
          </div>

          {/* Login link */}
          <p className="text-center text-sm text-net-grey mb-3">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-court-white font-bold hover:text-hevini-red transition-colors"
              onClick={dismiss}
            >
              LOG IN
            </Link>
          </p>

          {/* Dismiss — full-width, tall tap target */}
          <button
            onClick={dismiss}
            className="w-full flex items-center justify-center text-[#555] hover:text-net-grey transition-colors text-sm border border-[#1A1A1A] rounded-[4px]"
            style={{ minHeight: 44 }}
          >
            No thanks, I'll explore first
          </button>
        </div>
      </div>
    </div>
  );
}

interface TierCardProps {
  tier: (typeof TIERS)[number];
  onDismiss: () => void;
}

function TierCard({ tier, onDismiss }: TierCardProps) {
  return (
    <div
      className={`flex flex-col rounded-[4px] p-4 border h-full ${
        tier.highlight
          ? "border-hevini-red bg-[#110005]"
          : "border-[#222] bg-[#111]"
      }`}
    >
      {/* Tier name + price */}
      <div className="mb-3">
        <p
          className={`font-display font-black text-sm ${
            tier.highlight ? "text-hevini-red" : "text-court-white"
          }`}
          style={{ letterSpacing: "0.12em" }}
        >
          {tier.name}
        </p>
        {tier.price ? (
          <p className="mt-0.5">
            <span className="text-court-white font-bold text-xl">
              {tier.price}
            </span>{" "}
            <span className="text-net-grey text-xs">{tier.priceLabel}</span>
          </p>
        ) : (
          <p className="text-net-grey text-xs mt-0.5">{tier.priceLabel}</p>
        )}
      </div>

      {/* Features */}
      <ul className="space-y-2 mb-4 flex-1">
        {tier.features.map((f) => (
          <li
            key={f}
            className="flex items-start gap-2 text-xs text-net-grey"
          >
            <Check
              className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                tier.highlight ? "text-hevini-red" : "text-[#444]"
              }`}
            />
            {f}
          </li>
        ))}
      </ul>

      {/* CTA */}
      <Link href={tier.href} onClick={onDismiss}>
        <Button
          className={`w-full rounded-[2px] font-bold uppercase text-xs border-0 ${
            tier.highlight
              ? "bg-hevini-red hover:bg-hevini-red-dark text-white"
              : "bg-[#1A1A1A] hover:bg-[#252525] text-court-white"
          }`}
          style={{ height: 44, letterSpacing: "0.1em" }}
        >
          {tier.cta}
        </Button>
      </Link>
    </div>
  );
}
