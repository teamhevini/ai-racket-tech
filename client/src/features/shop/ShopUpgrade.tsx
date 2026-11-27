import { Link } from "wouter";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Shop Pro upsell, styled like the player app's UpgradeCard but pointing at shop billing. */
export function ShopUpgrade({ title, body, className, compact }: { title: string; body: string; className?: string; compact?: boolean }) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl bg-ink p-5 text-bg", compact ? "flex items-center gap-4" : "sm:flex sm:items-center sm:gap-6", className)}>
      <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-ball/25 blur-2xl" />
      <div className="relative flex min-w-0 flex-1 gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ball text-ball-ink">
          <Lock className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold">{title}</p>
          <p className="mt-0.5 text-sm leading-relaxed text-bg/70">{body}</p>
        </div>
      </div>
      <Button asChild variant="ball" size="sm" className={cn("relative shrink-0", !compact && "mt-4 w-full sm:mt-0 sm:w-auto")}>
        <Link href="/shop/billing">Get Shop Pro</Link>
      </Button>
    </div>
  );
}
