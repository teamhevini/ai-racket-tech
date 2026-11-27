import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Copy, MessageSquare, Send } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { api, ApiError } from "@/lib/api";

interface InviteResponse {
  code: string;
  url: string;
  message: string;
  stringerName: string;
  phone: string | null;
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

/**
 * "Invite {stringer} to 10IS": the player sends a link from their own phone.
 * 10IS never messages the stringer itself.
 */
export function InviteStringerButton({
  savedStringerId,
  name,
  children,
  ...buttonProps
}: { savedStringerId: number; name: string; children?: React.ReactNode } & Omit<ButtonProps, "onClick" | "asChild">) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button {...buttonProps} onClick={() => setOpen(true)}>
        {children ?? (
          <>
            <Send /> Invite {firstName(name)} to 10IS
          </>
        )}
      </Button>
      <InviteStringerSheet open={open} onOpenChange={setOpen} savedStringerId={savedStringerId} name={name} />
    </>
  );
}

export function InviteStringerSheet({
  open,
  onOpenChange,
  savedStringerId,
  name,
  title,
  description,
  extra,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  savedStringerId: number;
  name: string;
  title?: string;
  description?: string;
  /** Rendered under the message, e.g. a way to book someone else instead. */
  extra?: React.ReactNode;
}) {
  const [copied, setCopied] = React.useState(false);
  const invite = useMutation({
    mutationFn: () => api<InviteResponse>("POST", `/api/stringers/saved/${savedStringerId}/invite`),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Couldn't create the invite. Try again."),
  });

  React.useEffect(() => {
    if (open && !invite.data && !invite.isPending) invite.mutate();
    if (!open) setCopied(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const data = invite.data;
  const canShare = typeof navigator !== "undefined" && !!navigator.share;
  const smsHref = data?.phone ? `sms:${data.phone.replace(/[^\d+]/g, "")}?&body=${encodeURIComponent(data.message)}` : null;

  async function share() {
    if (!data) return;
    try {
      await navigator.share({ text: data.message });
      toast.success("Invite sent", { description: `We'll link ${firstName(name)} to your rackets when they open their shop.` });
      onOpenChange(false);
    } catch {
      /* share sheet dismissed */
    }
  }

  async function copy() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.message);
      setCopied(true);
      toast.success("Copied", { description: "Paste it into a text or WhatsApp to your stringer." });
    } catch {
      toast.error("Couldn't copy. Select the message and copy it yourself.");
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={title ?? `Invite ${firstName(name)}`}
      description={description ?? "Send it from your phone. 10IS never messages your stringer."}
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          {smsHref && (
            <Button asChild variant="outline" size="lg" className="sm:order-1">
              <a href={smsHref}>
                <MessageSquare /> Text {firstName(name)}
              </a>
            </Button>
          )}
          {canShare ? (
            <Button size="lg" onClick={share} disabled={!data} loading={invite.isPending} className="sm:order-2">
              <Send /> Share invite
            </Button>
          ) : (
            <Button size="lg" onClick={copy} disabled={!data} loading={invite.isPending} className="sm:order-2">
              {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy message"}
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        <ol className="space-y-2 text-sm leading-relaxed text-muted">
          <li>
            <span className="font-semibold text-ink">1.</span> {firstName(name)} gets a free shop on 10IS: online bookings and a job queue.
          </li>
          <li>
            <span className="font-semibold text-ink">2.</span> When they open it from your link, they're linked to you automatically.
          </li>
          <li>
            <span className="font-semibold text-ink">3.</span> Next time your strings are due, “Book a restring” goes straight to them.
          </li>
        </ol>
        <div className="rounded-2xl bg-surface-2/70 p-4">
          <p className="eyebrow mb-2">Your message</p>
          {data ? (
            <p className="select-all whitespace-pre-line text-[0.9375rem] leading-relaxed">{data.message}</p>
          ) : (
            <div className="space-y-2" aria-busy="true">
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-5/6" />
              <div className="skeleton h-4 w-2/3" />
            </div>
          )}
        </div>
        {canShare && data && (
          <button type="button" onClick={copy} className="text-sm font-semibold text-muted underline-offset-4 hover:text-ink hover:underline">
            {copied ? "Copied" : "Or copy the message"}
          </button>
        )}
        {extra}
      </div>
    </Sheet>
  );
}
