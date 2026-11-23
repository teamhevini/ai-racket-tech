import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-xl border border-line bg-surface px-4 text-ink placeholder:text-faint shadow-[inset_0_1px_0_rgb(var(--shadow)/0.03)] transition-colors duration-150 hover:border-ink/25 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10 disabled:opacity-60 aria-[invalid=true]:border-brand";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(control, "h-12", className)} {...props} />,
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, rows = 3, ...props }, ref) => (
    <textarea ref={ref} rows={rows} className={cn(control, "resize-none py-3 leading-relaxed", className)} {...props} />
  ),
);
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select ref={ref} className={cn(control, "h-12 appearance-none pr-10", className)} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
    </div>
  ),
);
Select.displayName = "Select";

interface FieldProps {
  label: string;
  hint?: React.ReactNode;
  error?: string | null;
  optional?: boolean;
  children: React.ReactElement;
  className?: string;
}

/** Label + control + hint/error, wired up for screen readers. */
export function Field({ label, hint, error, optional, children, className }: FieldProps) {
  const id = React.useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="flex items-baseline justify-between text-sm font-medium text-ink">
        <span>{label}</span>
        {optional && <span className="text-xs font-normal text-faint">Optional</span>}
      </label>
      {React.cloneElement(children, {
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
      })}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-brand" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs leading-relaxed text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Text input with a unit suffix, e.g. "52 lbs". */
export const UnitInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { unit: string }>(
  ({ unit, className, ...props }, ref) => (
    <div className="relative">
      <Input ref={ref} inputMode="decimal" className={cn("pr-14 tabular", className)} {...props} />
      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">{unit}</span>
    </div>
  ),
);
UnitInput.displayName = "UnitInput";

export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label: string;
  description?: React.ReactNode;
  disabled?: boolean;
}) {
  const id = React.useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
        {description && <p className="mt-0.5 text-xs leading-relaxed text-muted">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-50",
          checked ? "bg-grass" : "bg-line",
        )}
      >
        <span
          className={cn(
            "absolute left-0.5 top-0.5 size-6 rounded-full bg-white shadow transition-transform duration-300 ease-spring",
            checked && "translate-x-5",
          )}
        />
      </button>
    </div>
  );
}
