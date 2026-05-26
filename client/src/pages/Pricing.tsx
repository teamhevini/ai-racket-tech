import { useState } from "react";
import { Link } from "wouter";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";

const PRO_FEATURES = [
  "Unlimited recommendations",
  "Full stringer search results",
  "Shareable recommendation cards",
  "Saved recommendation history",
  "Restring reminders",
];

const CLUB_FEATURES = [
  "Everything in Pro",
  "AI chat assistant",
  "Multi-profile support (up to 10 rackets)",
  "Priority support",
];

export default function Pricing() {
  const { isPro, isClub, isAdmin, tier } = useUser();
  const { toast } = useToast();

  const [proEmail, setProEmail] = useState("");
  const [clubEmail, setClubEmail] = useState("");
  const [loadingPro, setLoadingPro] = useState(false);
  const [loadingClub, setLoadingClub] = useState(false);

  async function handleCheckout(plan: "pro" | "club", email: string) {
    if (!email || !email.includes("@")) {
      toast({ title: "Enter a valid email", description: "We need your email to activate your plan.", variant: "destructive" });
      return;
    }

    const setter = plan === "pro" ? setLoadingPro : setLoadingClub;
    setter(true);
    try {
      const res = await fetch(`/api/checkout/${plan}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      window.location.href = data.url;
    } catch {
      toast({ title: "Error", description: "Could not start checkout. Try again.", variant: "destructive" });
      setter(false);
    }
  }

  return (
    <div className="min-h-screen bg-court-black text-court-white">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="text-center mb-14">
          <p
            className="text-hevini-red text-[10px] font-bold uppercase mb-4"
            style={{ letterSpacing: "0.2em" }}
          >
            Pricing
          </p>
          <h1
            className="font-display font-black text-4xl md:text-5xl text-court-white uppercase mb-4"
            style={{ letterSpacing: "0.04em" }}
          >
            Choose Your Plan
          </h1>
          <p className="text-net-grey text-sm max-w-md mx-auto">
            One free recommendation, then upgrade for unlimited access.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {/* Free */}
          <div className="bg-[#111] border border-[#1E1E1E] rounded-[4px] p-6">
            <div className="mb-6">
              <p
                className="text-[10px] font-bold text-net-grey uppercase mb-2"
                style={{ letterSpacing: "0.15em" }}
              >
                Free
              </p>
              <div className="flex items-end gap-1 mb-1">
                <span className="font-display font-black text-4xl text-court-white">$0</span>
              </div>
              <p className="text-net-grey text-xs">Forever free</p>
            </div>
            <ul className="space-y-2.5 mb-8">
              {["1 free recommendation", "Top 3 stringer results", "Top 3 racket results"].map((f) => (
                <FeatureRow key={f} label={f} />
              ))}
            </ul>
            <Link href="/onboarding">
              <Button
                variant="outline"
                className="w-full rounded-[2px] border-[#333] text-net-grey hover:border-court-white hover:text-court-white uppercase text-xs font-bold h-10"
                style={{ letterSpacing: "0.1em" }}
              >
                {isPro || isAdmin ? "CURRENT PLAN" : "GET STARTED"}
              </Button>
            </Link>
          </div>

          {/* Pro */}
          <div className="bg-[#111] border border-[#1E1E1E] rounded-[4px] p-6">
            <div className="mb-6">
              <p
                className="text-[10px] font-bold text-net-grey uppercase mb-2"
                style={{ letterSpacing: "0.15em" }}
              >
                Pro
              </p>
              <div className="flex items-end gap-1 mb-1">
                <span className="font-display font-black text-4xl text-court-white">$4.99</span>
              </div>
              <p className="text-net-grey text-xs">One-time payment</p>
            </div>
            <ul className="space-y-2.5 mb-6">
              {PRO_FEATURES.map((f) => (
                <FeatureRow key={f} label={f} active />
              ))}
            </ul>
            {isPro && !isClub && !isAdmin ? (
              <Button
                disabled
                className="w-full rounded-[2px] bg-[#1A1A1A] text-net-grey uppercase text-xs font-bold h-10 border-0 cursor-default"
                style={{ letterSpacing: "0.1em" }}
              >
                CURRENT PLAN
              </Button>
            ) : isClub || isAdmin ? (
              <Button
                disabled
                className="w-full rounded-[2px] bg-[#1A1A1A] text-net-grey uppercase text-xs font-bold h-10 border-0 cursor-default"
                style={{ letterSpacing: "0.1em" }}
              >
                INCLUDED IN CLUB
              </Button>
            ) : (
              <div className="space-y-2">
                <Input
                  type="email"
                  value={proEmail}
                  onChange={(e) => setProEmail(e.target.value)}
                  placeholder="Your email"
                  className="bg-[#0D0D0D] border-[#262626] text-court-white placeholder:text-net-grey focus-visible:ring-hevini-red rounded-[2px] h-9 text-sm"
                />
                <Button
                  onClick={() => handleCheckout("pro", proEmail)}
                  disabled={loadingPro}
                  className="w-full bg-hevini-red hover:bg-hevini-red-dark text-white rounded-[2px] font-bold uppercase border-0 text-xs h-10"
                  style={{ letterSpacing: "0.1em" }}
                >
                  {loadingPro ? (
                    <><Loader2 className="mr-2 w-3 h-3 animate-spin" /> REDIRECTING...</>
                  ) : (
                    "GET PRO — $4.99"
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Club — Most Popular */}
          <div className="bg-[#111] border-2 border-hevini-red rounded-[4px] p-6 relative">
            <span
              className="absolute -top-3 left-1/2 -translate-x-1/2 bg-hevini-red text-white text-[9px] font-bold uppercase px-3 py-1 rounded-[2px]"
              style={{ letterSpacing: "0.15em" }}
            >
              Most Popular
            </span>
            <div className="mb-6">
              <p
                className="text-[10px] font-bold text-hevini-red uppercase mb-2"
                style={{ letterSpacing: "0.15em" }}
              >
                Club
              </p>
              <div className="flex items-end gap-1 mb-1">
                <span className="font-display font-black text-4xl text-court-white">$1.99</span>
                <span className="text-net-grey text-sm mb-1">/mo</span>
              </div>
              <p className="text-net-grey text-xs">Cancel anytime</p>
            </div>
            <ul className="space-y-2.5 mb-6">
              {CLUB_FEATURES.map((f) => (
                <FeatureRow key={f} label={f} active />
              ))}
            </ul>
            {isClub || isAdmin ? (
              <Button
                disabled
                className="w-full rounded-[2px] bg-[#1A1A1A] text-net-grey uppercase text-xs font-bold h-10 border-0 cursor-default"
                style={{ letterSpacing: "0.1em" }}
              >
                CURRENT PLAN
              </Button>
            ) : (
              <div className="space-y-2">
                <Input
                  type="email"
                  value={clubEmail}
                  onChange={(e) => setClubEmail(e.target.value)}
                  placeholder="Your email"
                  className="bg-[#0D0D0D] border-[#333] text-court-white placeholder:text-net-grey focus-visible:ring-hevini-red rounded-[2px] h-9 text-sm"
                />
                <Button
                  onClick={() => handleCheckout("club", clubEmail)}
                  disabled={loadingClub}
                  className="w-full bg-hevini-red hover:bg-hevini-red-dark text-white rounded-[2px] font-bold uppercase border-0 text-xs h-10"
                  style={{ letterSpacing: "0.1em" }}
                >
                  {loadingClub ? (
                    <><Loader2 className="mr-2 w-3 h-3 animate-spin" /> REDIRECTING...</>
                  ) : (
                    "JOIN CLUB — $1.99/MO"
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-net-grey text-xs mt-10">
          Payments processed securely by Stripe. Questions?{" "}
          <a href="mailto:contact@hevini.com" className="underline hover:text-court-white transition-colors">
            contact@hevini.com
          </a>
        </p>
      </div>
    </div>
  );
}

function FeatureRow({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <li className="flex items-start gap-2.5">
      <Check className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${active ? "text-hevini-red" : "text-[#333]"}`} />
      <span className={`text-xs ${active ? "text-court-white" : "text-net-grey"}`}>{label}</span>
    </li>
  );
}
