import * as React from "react";
import { toast } from "sonner";
import { Download, MoreVertical, PlusSquare, Share, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/surface";
import { Sheet } from "@/components/ui/sheet";
import { useInstall } from "@/lib/install";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "10is-install-dismissed";
const DISMISS_DAYS = 30;

function dismissedRecently() {
  try {
    const t = Number(localStorage.getItem(DISMISS_KEY));
    return !!t && Date.now() - t < DISMISS_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

/**
 * "Add 10IS to your home screen". `dismissible` cards (Home) hide for 30 days when closed;
 * the Account card always shows until the app is installed.
 */
export function InstallApp({ dismissible, className }: { dismissible?: boolean; className?: string }) {
  const { platform, prompt } = useInstall();
  const [hidden, setHidden] = React.useState(() => !!dismissible && dismissedRecently());
  const [steps, setSteps] = React.useState(false);

  if (hidden || platform === "installed" || platform === "unsupported") return null;

  async function install() {
    if (platform === "prompt") {
      const outcome = await prompt();
      if (outcome === "accepted") toast.success("10IS is on your home screen");
      return;
    }
    setSteps(true);
  }

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* private mode */
    }
    setHidden(true);
  }

  return (
    <>
      <Card className={cn("relative flex items-center gap-4 p-4 pr-3 sm:p-5", className)}>
        <img src="/icons/icon-192.png" alt="" className="size-12 shrink-0 rounded-[0.9rem] shadow-card" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug">Add 10IS to your home screen</p>
          <p className="mt-0.5 text-sm leading-snug text-muted">Opens full screen like an app. No app store needed.</p>
        </div>
        <Button size="sm" className="shrink-0" onClick={install}>
          {platform === "prompt" ? <Download /> : <Smartphone />} {platform === "prompt" ? "Install" : "How"}
        </Button>
        {dismissible && (
          <button
            type="button"
            onClick={dismiss}
            aria-label="Not now"
            className="absolute -right-2 -top-2 grid size-7 place-items-center rounded-full bg-surface text-muted shadow-card ring-1 ring-line hover:text-ink"
          >
            <X className="size-3.5" />
          </button>
        )}
      </Card>
      <InstallSteps open={steps} onOpenChange={setSteps} platform={platform} />
    </>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink text-sm font-semibold text-bg">{n}</span>
      <p className="pt-0.5 text-[0.9375rem] leading-relaxed">{children}</p>
    </li>
  );
}

function InstallSteps({ open, onOpenChange, platform }: { open: boolean; onOpenChange: (v: boolean) => void; platform: string }) {
  const ios = platform === "ios" || platform === "ios-other-browser";
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Add to home screen"
      description={ios ? "Three taps in your browser. It then opens like an app." : "From your browser's menu. It then opens like an app."}
      footer={
        <Button size="lg" className="w-full" onClick={() => onOpenChange(false)}>
          Got it
        </Button>
      }
    >
      <ol className="space-y-4">
        {ios ? (
          <>
            <Step n={1}>
              Tap <Share className="mx-0.5 inline size-4 -translate-y-0.5" aria-label="Share" /> <strong>Share</strong>
              {platform === "ios" ? " at the bottom of Safari (top right on iPad)." : " in your browser's toolbar or menu."}
            </Step>
            <Step n={2}>
              Scroll down and tap <PlusSquare className="mx-0.5 inline size-4 -translate-y-0.5" aria-hidden /> <strong>Add to Home Screen</strong>.
            </Step>
            <Step n={3}>
              Tap <strong>Add</strong>. Open 10IS from your home screen from now on.
            </Step>
          </>
        ) : (
          <>
            <Step n={1}>
              Open your browser menu <MoreVertical className="mx-0.5 inline size-4 -translate-y-0.5" aria-hidden />.
            </Step>
            <Step n={2}>
              Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.
            </Step>
            <Step n={3}>
              Confirm. Open 10IS from your home screen from now on.
            </Step>
          </>
        )}
      </ol>
    </Sheet>
  );
}
