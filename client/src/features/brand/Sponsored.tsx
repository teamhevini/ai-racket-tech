import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Ban, Eye, MousePointerClick, Pause, Pencil, Play, Plus, ShieldCheck, Sparkles, Target, UserX } from "lucide-react";
import { FIT_THRESHOLD } from "@shared/sponsor-fit";
import { SPONSORED_MIN_CPC_CENTS } from "@shared/tiers";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { Card, Chip, EmptyState, Skeleton } from "@/components/ui/surface";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { cap, dollars, errMsg, int, Note, pct, StatusPill, toCents, VerifyNotice, type BrandJson, type BrandString, type CampaignRow, type ReachResponse } from "./shared";

const campaignsKey = ["/api/brand/campaigns"] as const;
const LEVELS = ["beginner", "intermediate", "advanced", "pro"] as const;

export function SponsoredTab({ brand, strings }: { brand: BrandJson; strings: BrandString[] }) {
  const q = useQuery<CampaignRow[]>({ queryKey: campaignsKey });
  const [sheet, setSheet] = React.useState<CampaignRow | "new" | null>(null);
  const canCreate = strings.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-xl">
          <h2 className="display text-4xl leading-tight">Sponsored</h2>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">Reach players your string already fits, right after they get their setup. You pay only when they tap.</p>
        </div>
        {canCreate && (q.data?.length ?? 0) > 0 && (
          <Button onClick={() => setSheet("new")}>
            <Plus /> New campaign
          </Button>
        )}
      </div>

      <VerifyNotice brand={brand} what="Campaigns you create are saved as drafts. They" />
      <RulesCard />

      {q.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      ) : q.isError ? (
        <EmptyState title="Couldn't load campaigns" body={errMsg(q.error)} action={<Button onClick={() => q.refetch()}>Try again</Button>} />
      ) : !q.data?.length ? (
        <EmptyState
          icon={<Target />}
          title="No campaigns yet"
          body={canCreate ? "Start with one string and a small budget. You'll see its fit reach before you spend anything." : "Add a string to your catalogue first."}
          action={
            canCreate ? (
              <Button size="lg" onClick={() => setSheet("new")}>
                <Plus /> New campaign
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {q.data.map((c) => (
            <CampaignCard key={c.id} c={c} onEdit={() => setSheet(c)} />
          ))}
        </div>
      )}

      <CampaignSheet value={sheet} onClose={() => setSheet(null)} strings={strings} brand={brand} />
    </div>
  );
}

function RulesCard() {
  const rules = [
    { icon: Sparkles, text: "Shown only after the AI's pick, clearly labelled Sponsored." },
    { icon: ShieldCheck, text: `Only to players your string genuinely fits: same safety rules as the technician, fit score of ${FIT_THRESHOLD} or more.` },
    { icon: Ban, text: "Never replaces or reorders the pick. Money only breaks ties between strings that already fit." },
    { icon: UserX, text: "Paid players never see sponsored placements." },
    { icon: MousePointerClick, text: "Impressions are free. You pay per click, capped by your monthly budget." },
  ];
  return (
    <Card className="p-5 sm:p-6">
      <p className="eyebrow mb-4">How sponsored placements work</p>
      <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        {rules.map((r) => (
          <li key={r.text} className="flex gap-3 text-sm leading-snug">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-grass-soft text-grass">
              <r.icon className="size-3.5" />
            </span>
            <span className="pt-1">{r.text}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function CampaignCard({ c, onEdit }: { c: CampaignRow; onEdit: () => void }) {
  const qc = useQueryClient();
  const toggle = useMutation({
    mutationFn: () => api("PATCH", `/api/brand/campaigns/${c.id}`, { status: c.status === "active" ? "paused" : "active" }),
    onSuccess: () => {
      toast.success(c.status === "active" ? "Campaign paused" : "Campaign live");
      qc.invalidateQueries({ queryKey: campaignsKey });
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  const used = c.monthlyBudgetCents ? Math.min(100, (c.monthSpendCents / c.monthlyBudgetCents) * 100) : 0;
  const stats = [
    { label: "Impressions", value: int(c.impressions) },
    { label: "Clicks", value: int(c.clicks) },
    { label: "CTR", value: pct(c.ctr) },
    { label: "Bookings", value: int(c.bookings) },
    { label: "Avg fit", value: c.avgFit == null ? "—" : String(c.avgFit) },
    { label: "Spend", value: dollars(c.spendCents) },
  ];
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="display text-2xl leading-tight">{c.name}</h3>
            <StatusPill status={c.status} />
          </div>
          <p className="mt-1 text-sm text-muted">
            {c.stringModel} · {dollars(c.cpcCents)} per click · {c.levels.length ? c.levels.map(cap).join(", ") : "All levels that fit"}
          </p>
          <p className="mt-2 text-sm italic text-ink/80">"{c.headline}"</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon-sm" aria-label="Edit campaign" onClick={onEdit}>
            <Pencil />
          </Button>
          {c.status !== "ended" && (
            <Button variant={c.status === "active" ? "outline" : "ink"} size="sm" loading={toggle.isPending} onClick={() => toggle.mutate()}>
              {c.status === "active" ? (
                <>
                  <Pause /> Pause
                </>
              ) : (
                <>
                  <Play /> {c.status === "draft" ? "Launch" : "Resume"}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
      <dl className="mt-5 grid grid-cols-3 gap-4 sm:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label}>
            <dt className="text-xs text-muted">{s.label}</dt>
            <dd className="mt-1 font-mono text-base font-semibold tabular">{s.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-5">
        <div className="mb-1.5 flex justify-between text-xs text-muted">
          <span>This month</span>
          <span className="font-mono tabular">
            {dollars(c.monthSpendCents)} of {dollars(c.monthlyBudgetCents)}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div className={cn("h-full rounded-full", used >= 100 ? "bg-clay" : "bg-ink")} style={{ width: `${used}%` }} />
        </div>
      </div>
    </Card>
  );
}

/** As players see it: under the technician's pick, labelled Sponsored. */
export function SponsoredPreview({ brandName, s, headline }: { brandName: string; s: BrandString | undefined; headline: string }) {
  return (
    <div className="rounded-2xl border border-line bg-bg p-3">
      <p className="mb-2 px-1 text-[10px] uppercase tracking-wider text-faint">Preview · below the player's setup</p>
      <div className="rounded-2xl bg-surface p-4 shadow-card ring-1 ring-line/70">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Sponsored</span>
          <span className="text-[11px] text-faint">by {brandName}</span>
        </div>
        <p className="mt-3 font-semibold leading-snug">{headline.trim() || "Your headline appears here"}</p>
        <p className="mt-1 text-sm text-muted">
          {s ? (
            <>
              {brandName} {s.model} · {s.family}
              {s.setPriceCents != null && <> · {dollars(s.setPriceCents)}</>}
            </>
          ) : (
            "Pick a string"
          )}
        </p>
        <p className="mt-3 text-[11px] leading-relaxed text-faint">
          Paid placement. It passed the same fit and safety checks as your setup, but it did not influence your recommendation.
        </p>
      </div>
    </div>
  );
}

export function FitReach({ stringId }: { stringId: number | null }) {
  const q = useQuery<ReachResponse>({ queryKey: [`/api/brand/strings/${stringId}/reach`], enabled: !!stringId, staleTime: 5 * 60_000 });
  if (!stringId) return null;
  return (
    <div className="rounded-2xl bg-surface-2/70 p-4">
      <div className="flex items-center gap-2">
        <Eye className="size-4 text-muted" aria-hidden />
        <p className="text-sm font-semibold">Fit reach</p>
      </div>
      {q.isLoading ? (
        <Skeleton className="mt-3 h-20" />
      ) : q.isError || !q.data ? (
        <p className="mt-2 text-sm text-brand">{errMsg(q.error)}</p>
      ) : q.data.specsPending ? (
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Specs pending review. Until 10IS sets this string's lab specs it can't pass the fit check, so it won't be shown to anyone.
        </p>
      ) : (
        <>
          <div className="mt-3 flex items-end gap-4">
            <p className="display text-5xl leading-none tabular">{q.data.eligiblePct.toFixed(1)}%</p>
            <p className="pb-1 text-sm leading-snug text-muted">
              of the last {int(q.data.sampled)} players would qualify
              {q.data.avgFit != null && <> · avg fit {q.data.avgFit}</>}
            </p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface">
            <div className="h-full rounded-full bg-grass" style={{ width: `${Math.max(1, q.data.eligiblePct)}%` }} />
          </div>
          {q.data.heldBack.length > 0 && (
            <div className="mt-4">
              <p className="eyebrow mb-2">Held back for the rest</p>
              <ul className="space-y-1.5">
                {q.data.heldBack.slice(0, 5).map((h) => (
                  <li key={h.reason} className="flex justify-between gap-3 text-sm">
                    <span className="min-w-0 text-ink/90">{h.reason}</span>
                    <span className="shrink-0 font-mono text-xs tabular text-muted">{int(h.n)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Note className="mt-3">A bigger budget or higher bid can't change this number. Only players the string genuinely fits ever see it.</Note>
        </>
      )}
    </div>
  );
}

function CampaignSheet({ value, onClose, strings, brand }: { value: CampaignRow | "new" | null; onClose: () => void; strings: BrandString[]; brand: BrandJson }) {
  const qc = useQueryClient();
  const isNew = value === "new";
  const c = value && value !== "new" ? value : null;
  const blank = () => ({ stringId: strings[0]?.id ?? 0, name: "", headline: "", cpc: "1.20", budget: "250", levels: [] as string[] });
  const [f, setF] = React.useState(blank);
  const [err, setErr] = React.useState<{ field?: string; message: string } | null>(null);

  React.useEffect(() => {
    if (!value) return;
    setErr(null);
    setF(
      c
        ? { stringId: c.stringId, name: c.name, headline: c.headline, cpc: (c.cpcCents / 100).toFixed(2), budget: (c.monthlyBudgetCents / 100).toFixed(2), levels: c.levels }
        : blank(),
    );
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const s = strings.find((x) => x.id === f.stringId);

  const save = useMutation({
    mutationFn: () => {
      const cpcCents = toCents(f.cpc);
      const monthlyBudgetCents = toCents(f.budget);
      if (Number.isNaN(cpcCents) || cpcCents < SPONSORED_MIN_CPC_CENTS) throw new ApiError(`Minimum bid is ${dollars(SPONSORED_MIN_CPC_CENTS)} per click.`, 400, { field: "cpcCents" });
      if (Number.isNaN(monthlyBudgetCents) || monthlyBudgetCents < 5000) throw new ApiError("Minimum budget is $50.00 a month.", 400, { field: "monthlyBudgetCents" });
      const body = { name: f.name.trim() || `${s?.model ?? "String"} campaign`, headline: f.headline, cpcCents, monthlyBudgetCents, levels: f.levels };
      return isNew ? api("POST", "/api/brand/campaigns", { ...body, stringId: f.stringId, status: brand.claimed ? "active" : "draft" }) : api("PATCH", `/api/brand/campaigns/${c!.id}`, body);
    },
    onSuccess: () => {
      toast.success(isNew ? "Campaign live" : "Campaign saved");
      qc.invalidateQueries({ queryKey: campaignsKey });
      onClose();
    },
    onError: (e) => setErr({ field: e instanceof ApiError ? e.field : undefined, message: errMsg(e) }),
  });

  const fe = (k: string) => (err?.field === k ? err.message : null);

  return (
    <Sheet
      open={!!value}
      onOpenChange={(o) => !o && onClose()}
      title={isNew ? "New campaign" : "Edit campaign"}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!f.stringId || f.headline.trim().length < 4}>
            {isNew ? "Launch campaign" : "Save"}
          </Button>
        </div>
      }
    >
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <Field label="String" error={fe("stringId")} hint={isNew ? undefined : "A campaign's string can't change."}>
          <Select value={f.stringId} onChange={(e) => setF({ ...f, stringId: Number(e.target.value) })} disabled={!isNew}>
            {strings.map((x) => (
              <option key={x.id} value={x.id}>
                {x.model}
                {x.stiffness == null ? " (specs pending)" : ""}
              </option>
            ))}
          </Select>
        </Field>

        <FitReach stringId={f.stringId || null} />

        <Field label="Campaign name" optional>
          <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder={`${s?.model ?? "String"} spring push`} maxLength={80} />
        </Field>
        <Field label="Headline" error={fe("headline")} hint={`${f.headline.length}/90 · factual and specific works best.`}>
          <Input value={f.headline} onChange={(e) => setF({ ...f, headline: e.target.value })} placeholder="Soft co-poly with real bite" maxLength={90} />
        </Field>
        <SponsoredPreview brandName={brand.name} s={s} headline={f.headline} />

        <div className="grid grid-cols-2 gap-3">
          <Field label="Bid per click" error={fe("cpcCents")} hint={`Min ${dollars(SPONSORED_MIN_CPC_CENTS)}`}>
            <Input inputMode="decimal" value={f.cpc} onChange={(e) => setF({ ...f, cpc: e.target.value })} placeholder="1.20" />
          </Field>
          <Field label="Monthly budget" error={fe("monthlyBudgetCents")} hint="Min $50.00">
            <Input inputMode="decimal" value={f.budget} onChange={(e) => setF({ ...f, budget: e.target.value })} placeholder="250" />
          </Field>
        </div>

        <div>
          <p className="text-sm font-medium">Levels</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">Optional. You can narrow who sees it, never widen it beyond players the string fits.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {LEVELS.map((l) => {
              const on = f.levels.includes(l);
              return (
                <Chip key={l} selected={on} onClick={() => setF({ ...f, levels: on ? f.levels.filter((x) => x !== l) : [...f.levels, l] })}>
                  {cap(l)}
                </Chip>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-faint">{f.levels.length ? `Only ${f.levels.map(cap).join(", ")} players who fit.` : "All levels the string fits."}</p>
        </div>

        {err && !["stringId", "headline", "cpcCents", "monthlyBudgetCents"].includes(err.field ?? "") && (
          <p className="text-sm text-brand" role="alert">
            {err.message}
          </p>
        )}
      </form>
    </Sheet>
  );
}
