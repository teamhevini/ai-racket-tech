import { Lock } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

interface UpgradeModalProps {
  requiredTier: "pro" | "club";
  featureName: string;
  onClose?: () => void;
}

export function UpgradeModal({ requiredTier, featureName, onClose }: UpgradeModalProps) {
  const isClub = requiredTier === "club";
  const price = isClub ? "$1.99/mo" : "$4.99 one-time";
  const plan = isClub ? "Club" : "Pro";

  return (
    <div className="flex flex-col items-center justify-center gap-5 p-8 text-center bg-[#0F0F0F] border border-[#1E1E1E] rounded-[4px]">
      <div className="w-14 h-14 rounded-full bg-hevini-red/10 border border-hevini-red/40 flex items-center justify-center">
        <Lock className="w-6 h-6 text-hevini-red" />
      </div>
      <div>
        <p
          className="text-hevini-red text-[10px] font-bold uppercase mb-2"
          style={{ letterSpacing: "0.15em" }}
        >
          {plan} Feature
        </p>
        <p className="text-court-white font-bold text-base mb-1">{featureName}</p>
        <p className="text-sm text-net-grey leading-relaxed">
          Unlock this feature with 10IS {plan} for {price}.
        </p>
      </div>
      <div className="flex flex-col gap-2 w-full max-w-xs">
        <Link href="/pricing" onClick={onClose}>
          <Button
            className="w-full bg-hevini-red hover:bg-hevini-red-dark text-white rounded-[2px] font-bold uppercase border-0"
            style={{ letterSpacing: "0.1em" }}
          >
            Upgrade to {plan} — {price}
          </Button>
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="text-xs text-net-grey hover:text-court-white transition-colors"
          >
            Maybe later
          </button>
        )}
      </div>
    </div>
  );
}

interface InlineGateProps {
  requiredTier: "pro" | "club";
  featureName: string;
  children: React.ReactNode;
  show: boolean;
}

export function InlineGate({ requiredTier, featureName, children, show }: InlineGateProps) {
  if (show) return <>{children}</>;
  return <UpgradeModal requiredTier={requiredTier} featureName={featureName} />;
}
