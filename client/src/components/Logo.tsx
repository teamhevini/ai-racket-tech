import { cn } from "@/lib/utils";

/** Hevini wave-and-ball mark, drawn as SVG so it stays crisp at any size. */
export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("size-8", className)} aria-hidden>
      <path
        fill="rgb(var(--brand))"
        fillRule="evenodd"
        d="M5 33c5-12 14-21 25-21 9 0 12 8 16 13 3.5 4.5 8 7 13 7.5-2 10-10 17-20 17-8 0-11.5-6.5-16-10.5C18.5 34.5 12 33 5 33Zm15.5-15a5.4 6 0 1 0 0 12 5.4 6 0 1 0 0-12Z"
      />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Mark className="size-7" />
      <span className="text-[1.35rem] font-semibold tracking-[-0.04em]">
        10<span className="text-brand">IS</span>
      </span>
    </span>
  );
}
