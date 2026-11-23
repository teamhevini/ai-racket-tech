const dateFmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });
const shortFmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const monthFmt = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });

export const formatDate = (d: string | Date | null | undefined) => (d ? dateFmt.format(new Date(d)) : "—");
export const formatShortDate = (d: string | Date | null | undefined) => (d ? shortFmt.format(new Date(d)) : "—");
export const formatMonth = (d: string | Date | null | undefined) => (d ? monthFmt.format(new Date(d)) : "—");

export function relativeDays(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const days = Math.round((startOfDay(new Date()).getTime() - startOfDay(new Date(d)).getTime()) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 0) return `in ${Math.abs(days)} days`;
  if (days < 7) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  return `${Math.round(days / 30)} months ago`;
}

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

/** yyyy-mm-dd for <input type="date"> in local time. */
export function toDateInput(d: Date | string = new Date()): string {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

/** Local midday for a yyyy-mm-dd string, so time zones never shift the day. */
export function fromDateInput(s: string): string {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 12).toISOString();
}

export const money = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);

export function racketName(r: { brand?: string | null; model?: string | null }) {
  return [r.brand, r.model].filter(Boolean).join(" ");
}

export function tensionLabel(mains?: number | null, crosses?: number | null) {
  if (mains == null && crosses == null) return null;
  if (crosses == null || crosses === mains) return `${mains} lbs`;
  return `${mains}/${crosses} lbs`;
}

export function setupLabel(mains?: string | null, crosses?: string | null) {
  if (!mains && !crosses) return null;
  if (!crosses || crosses === mains) return mains ?? crosses;
  return `${mains} / ${crosses}`;
}
