import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Drawer } from "vaul";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

function useIsDesktop() {
  const query = "(min-width: 640px)";
  const [desktop, setDesktop] = React.useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  React.useEffect(() => {
    const mql = window.matchMedia(query);
    const on = () => setDesktop(mql.matches);
    mql.addEventListener("change", on);
    return () => mql.removeEventListener("change", on);
  }, []);
  return desktop;
}

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

/**
 * Bottom sheet on phones (thumb-reachable, swipe to dismiss),
 * centred dialog on larger screens.
 */
export function Sheet({ open, onOpenChange, title, description, children, footer, className }: SheetProps) {
  const desktop = useIsDesktop();

  if (desktop) {
    return (
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Dialog.Content
            className={cn(
              "fixed left-1/2 top-1/2 z-50 flex max-h-[min(88vh,760px)] w-[min(92vw,520px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-3xl bg-surface shadow-lift ring-1 ring-line data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=open]:duration-300",
              className,
            )}
          >
            <div className="flex items-start justify-between gap-4 px-6 pb-2 pt-6">
              <div>
                <Dialog.Title className="display text-3xl leading-tight">{title}</Dialog.Title>
                {description ? (
                  <Dialog.Description className="mt-1 text-sm text-muted">{description}</Dialog.Description>
                ) : (
                  <Dialog.Description className="sr-only">{title}</Dialog.Description>
                )}
              </div>
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Close" className="-mr-2 -mt-1">
                  <X />
                </Button>
              </Dialog.Close>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-2">{children}</div>
            {footer && <div className="border-t border-line px-6 py-4">{footer}</div>}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} repositionInputs={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Drawer.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-3xl bg-surface shadow-lift outline-none",
            className,
          )}
        >
          <div className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-line" aria-hidden />
          <div className="px-5 pb-1 pt-4">
            <Drawer.Title className="display text-3xl leading-tight">{title}</Drawer.Title>
            {description ? (
              <Drawer.Description className="mt-1 text-sm text-muted">{description}</Drawer.Description>
            ) : (
              <Drawer.Description className="sr-only">{title}</Drawer.Description>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-3">{children}</div>
          {footer && <div className="safe-bottom border-t border-line px-5 pt-3 [&>*]:mb-3">{footer}</div>}
          {!footer && <div className="safe-bottom" />}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

/** Promise-free confirm dialog to replace window.confirm(). */
export function ConfirmSheet({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel,
  onConfirm,
  loading,
  destructive = true,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  loading?: boolean;
  destructive?: boolean;
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant={destructive ? "primary" : "ink"} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="text-[0.9375rem] leading-relaxed text-muted">{body}</div>
    </Sheet>
  );
}
