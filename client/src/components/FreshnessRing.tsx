import { motion } from "framer-motion";
import type { ReminderJson } from "@/lib/types";
import { cn } from "@/lib/utils";

const toneFor = (status: ReminderJson["status"]) =>
  status === "overdue" ? "rgb(var(--brand))" : status === "due-soon" ? "rgb(var(--clay))" : status === "fresh" ? "rgb(var(--grass))" : "rgb(var(--faint))";

/**
 * How much life is left in a set of strings, drawn as a ring that drains
 * from full (just strung) to empty (due). The centre shows days left.
 */
export function FreshnessRing({
  reminder,
  size = 76,
  stroke = 7,
  className,
  label = true,
}: {
  reminder: ReminderJson;
  size?: number;
  stroke?: number;
  className?: string;
  label?: boolean;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = reminder.status === "never" ? 0 : Math.max(0.02, reminder.freshness);
  const color = toneFor(reminder.status);
  const days = reminder.daysLeft;
  const big = days === null ? "—" : days < 0 ? `+${Math.abs(days)}` : String(days);
  const small = days === null ? "no log" : days < 0 ? "overdue" : days === 1 ? "day" : "days";

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={
        days === null ? "No restring logged yet" : days < 0 ? `${Math.abs(days)} days overdue` : `${days} days until restring`
      }
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--line))" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      {label && (
        <div className="absolute inset-0 grid place-items-center text-center leading-none">
          <div>
            <div className="font-mono text-lg font-semibold tabular" style={{ color: reminder.status === "never" ? undefined : color, fontSize: size * 0.24 }}>
              {big}
            </div>
            <div className="mt-0.5 text-[0.625rem] font-medium uppercase tracking-wider text-muted">{small}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export function statusTone(status: ReminderJson["status"]) {
  return status === "overdue" ? "brand" : status === "due-soon" ? "clay" : status === "fresh" ? "grass" : "neutral";
}

export function statusText(r: ReminderJson) {
  if (r.status === "never") return "No restring logged";
  if (r.daysLeft === null) return "";
  if (r.daysLeft < -1) return `${Math.abs(r.daysLeft)} days overdue`;
  if (r.daysLeft === -1) return "1 day overdue";
  if (r.daysLeft === 0) return "Due today";
  if (r.daysLeft === 1) return "Due tomorrow";
  return `Due in ${r.daysLeft} days`;
}
