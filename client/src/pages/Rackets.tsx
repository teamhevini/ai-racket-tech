import * as React from "react";
import { RacketForm } from "@/features/RacketForm";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Briefcase, ExternalLink, Lock, Search, X } from "lucide-react";
import { Page } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Badge, Card, Chip, EmptyState, PageHeader, Skeleton } from "@/components/ui/surface";
import { Sheet } from "@/components/ui/sheet";
import { UpgradeCard } from "@/components/UpgradeCard";
import { useMe } from "@/hooks/use-me";
import type { CatalogRacket } from "@/lib/types";
import { FREE_CATALOG_PER_BRAND } from "@shared/tiers";
import { cn } from "@/lib/utils";

type Sort = "featured" | "name" | "stiffness" | "weight" | "head";

const LEVEL_TONE: Record<string, "grass" | "hard" | "clay" | "brand"> = {
  beginner: "grass",
  intermediate: "hard",
  advanced: "clay",
  pro: "brand",
};

const isFeatured = (r: CatalogRacket) => r.brand === "Hevini" || r.model.includes("Defyer");

function brandOrder(a: string, b: string) {
  if (a === "Hevini") return -1;
  if (b === "Hevini") return 1;
  if (a === "Wilson") return -1;
  if (b === "Wilson") return 1;
  return a.localeCompare(b);
}

/** Plain-English string guidance from frame specs (carried over from v1). */
function stringGuidance(ra: number | null, headSize: number | null) {
  const recs: { type: string; reason: string }[] = [];
  if (ra != null) {
    if (ra < 60) recs.push({ type: "Natural gut or multifilament", reason: "Low-stiffness frame — lively strings keep the feel responsive and arm-friendly." });
    else if (ra <= 67) recs.push({ type: "Polyester or a gut/poly hybrid", reason: "Mid-range stiffness suits both control-oriented poly and hybrid setups." });
    else recs.push({ type: "Soft multifilament or arm-friendly poly", reason: "Stiff frame — softer strings reduce the shock sent to your arm." });
  }
  if (headSize != null) {
    if (headSize < 95) recs.push({ type: "Higher tension, control strings", reason: "Small head — a tighter bed gives precision and feel." });
    else if (headSize <= 100) recs.push({ type: "Balanced tension, versatile setup", reason: "Mid head size suits most strings at standard tension." });
    else if (headSize <= 107) recs.push({ type: "Mid tension, power strings", reason: "Midplus head — slightly lower tension boosts the natural launch." });
    else recs.push({ type: "Low tension, power strings", reason: "Large head — a looser bed enlarges the sweet spot." });
  }
  return recs;
}

export default function Rackets() {
  const { ent, signedIn } = useMe();
  const { data = [], isLoading, error, refetch } = useQuery<CatalogRacket[]>({
    queryKey: ["/api/rackets/search"],
    staleTime: 10 * 60_000,
  });
  const [query, setQuery] = React.useState("");
  const [brand, setBrand] = React.useState<string | null>(null);
  const [sort, setSort] = React.useState<Sort>("featured");
  const [selected, setSelected] = React.useState<CatalogRacket | null>(null);
  const [addToBag, setAddToBag] = React.useState<CatalogRacket | null>(null);
  const full = ent.fullCatalog;

  const brands = React.useMemo(
    () => Array.from(new Set(data.map((r) => r.brand))).sort(brandOrder),
    [data],
  );

  const filtered = React.useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    let list = data.filter(
      (r) =>
        (!brand || r.brand === brand) &&
        terms.every((t) => `${r.brand} ${r.model} ${r.stringPattern ?? ""}`.toLowerCase().includes(t)),
    );
    const num = (v: number | null) => (v == null ? Number.POSITIVE_INFINITY : v);
    list = [...list].sort((a, b) => {
      switch (sort) {
        case "name":
          return `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`);
        case "stiffness":
          return num(a.stiffnessRa) - num(b.stiffnessRa);
        case "weight":
          return num(a.weightUnstrung) - num(b.weightUnstrung);
        case "head":
          return num(a.headSize) - num(b.headSize);
        default:
          return brandOrder(a.brand, b.brand) || Number(isFeatured(b)) - Number(isFeatured(a)) || a.model.localeCompare(b.model);
      }
    });
    return list;
  }, [data, query, brand, sort]);

  // Free plan: first few frames of each brand are open; the rest are previewed, locked.
  const { visible, lockedCount, lockedPreview } = React.useMemo(() => {
    if (full) return { visible: filtered, lockedCount: 0, lockedPreview: [] as CatalogRacket[] };
    const perBrand = new Map<string, number>();
    const brandRank = new Map<number, number>();
    for (const r of [...data].sort((a, b) => brandOrder(a.brand, b.brand) || Number(isFeatured(b)) - Number(isFeatured(a)) || a.model.localeCompare(b.model))) {
      const n = perBrand.get(r.brand) ?? 0;
      brandRank.set(r.id, n);
      perBrand.set(r.brand, n + 1);
    }
    const open = filtered.filter((r) => (brandRank.get(r.id) ?? 0) < FREE_CATALOG_PER_BRAND);
    const locked = filtered.filter((r) => (brandRank.get(r.id) ?? 0) >= FREE_CATALOG_PER_BRAND);
    return { visible: open, lockedCount: locked.length, lockedPreview: locked.slice(0, 3) };
  }, [filtered, data, full]);

  return (
    <Page>
      <PageHeader
        eyebrow="Racket catalog"
        title={
          <>
            {data.length > 0 ? data.length : "140+"} frames, <em className="text-brand">decoded</em>
          </>
        }
        description="Head size, pattern, stiffness and tension range for every current frame — and what to string it with."
      />

      <div className="sticky top-16 z-20 -mx-4 mb-6 space-y-3 bg-bg/85 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search brand, model or pattern"
              className="pl-11 pr-10"
              aria-label="Search rackets"
              enterKeyHint="search"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <div className="w-36 shrink-0 sm:w-44">
            <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort rackets">
              <option value="featured">Featured</option>
              <option value="name">A–Z</option>
              <option value="stiffness">Softest first</option>
              <option value="weight">Lightest first</option>
              <option value="head">Smallest head</option>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by brand">
          <Chip selected={!brand} onClick={() => setBrand(null)} className="shrink-0 py-2">
            All
          </Chip>
          {brands.map((b) => (
            <Chip key={b} selected={brand === b} onClick={() => setBrand(brand === b ? null : b)} className="shrink-0 py-2">
              {b}
            </Chip>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading rackets">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-2xl" />
          ))}
        </div>
      )}

      {error && (
        <EmptyState title="Couldn't load the catalog" body={(error as Error).message} action={<Button variant="secondary" onClick={() => refetch()}>Try again</Button>} />
      )}

      {!isLoading && !error && filtered.length === 0 && (
        <EmptyState
          icon={<Search />}
          title="No rackets match"
          body="Try a different spelling or clear the brand filter. You can still add any racket to your bag by hand."
          action={
            <Button variant="secondary" onClick={() => { setQuery(""); setBrand(null); }}>
              Clear filters
            </Button>
          }
        />
      )}

      {visible.length > 0 && (
        <>
          <p className="mb-3 text-sm text-muted">
            {filtered.length} racket{filtered.length === 1 ? "" : "s"}
            {!full && lockedCount > 0 && ` · ${visible.length} open on the free plan`}
          </p>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((r, i) => (
              <li key={r.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}>
                <RacketCard racket={r} onOpen={() => setSelected(r)} />
              </li>
            ))}
          </ul>
        </>
      )}

      {!full && lockedCount > 0 && (
        <section className="mt-6" aria-label="Locked rackets">
          <div className="relative overflow-hidden rounded-2xl">
            <ul className="pointer-events-none grid select-none gap-3 opacity-50 blur-[6px] sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
              {lockedPreview.map((r) => (
                <li key={r.id}>
                  <RacketCard racket={r} />
                </li>
              ))}
            </ul>
            <div className="absolute inset-0 grid place-items-center bg-gradient-to-b from-bg/30 via-bg/70 to-bg p-4">
              <div className="w-full max-w-lg">
                <UpgradeCard
                  title={`${lockedCount} more racket${lockedCount === 1 ? "" : "s"} in the catalog`}
                  body={`Free shows the top ${FREE_CATALOG_PER_BRAND} frames per brand. Pro opens every frame and spec.`}
                />
              </div>
            </div>
          </div>
        </section>
      )}

      <RacketSheet
        racket={selected}
        signedIn={signedIn}
        onClose={() => setSelected(null)}
        onAddToBag={(r) => {
          setSelected(null);
          setAddToBag(r);
        }}
      />
      <RacketForm open={!!addToBag} onOpenChange={(v) => !v && setAddToBag(null)} initial={addToBag} />
    </Page>
  );
}

function StiffnessBar({ ra }: { ra: number | null }) {
  if (ra == null) return null;
  // RA 50 (very soft) → 75 (very stiff)
  const pct = Math.max(4, Math.min(100, ((ra - 50) / 25) * 100));
  const tone = ra >= 68 ? "bg-brand" : ra >= 63 ? "bg-clay" : "bg-grass";
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted">Stiffness</span>
        <span className="font-mono font-semibold tabular">RA {ra}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
        <div className={cn("h-full rounded-full", tone)} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-[0.625rem] text-faint" aria-hidden>
        <span>Soft</span>
        <span>Stiff</span>
      </div>
    </div>
  );
}

function Spec({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.6875rem] text-muted">{label}</dt>
      <dd className="truncate font-mono text-sm font-semibold tabular">{value ?? "—"}</dd>
    </div>
  );
}

function RacketCard({ racket: r, onOpen }: { racket: CatalogRacket; onOpen?: () => void }) {
  const featured = isFeatured(r);
  return (
    <Card
      className={cn(
        "group flex h-full flex-col p-5 text-left transition-[box-shadow,transform] duration-300 ease-spring",
        onOpen && "cursor-pointer hover:-translate-y-0.5 hover:shadow-lift",
        featured && "ring-brand/30",
      )}
    >
      <button type="button" onClick={onOpen} disabled={!onOpen} className="flex flex-1 flex-col text-left focus-visible:outline-none" aria-label={`${r.brand} ${r.model} details`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={cn("eyebrow", r.brand === "Hevini" && "text-brand")}>{r.brand}</p>
            <h3 className="mt-1 text-lg font-semibold leading-snug">{r.model}</h3>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {featured && <Badge tone="brand">Featured</Badge>}
            {r.level && <Badge tone={LEVEL_TONE[r.level] ?? "neutral"} className="capitalize">{r.level}</Badge>}
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-3 gap-3">
          <Spec label="Head" value={r.headSize ? `${r.headSize} in²` : null} />
          <Spec label="Pattern" value={r.stringPattern} />
          <Spec label="Weight" value={r.weightUnstrung ? `${r.weightUnstrung} g` : null} />
          <Spec label="Balance" value={r.balance} />
          <Spec label="Tension" value={r.recTensionMin && r.recTensionMax ? `${r.recTensionMin}–${r.recTensionMax}` : null} />
          <Spec label="Beam" value={r.beamWidth} />
        </dl>
        <div className="mt-4">
          <StiffnessBar ra={r.stiffnessRa} />
        </div>
      </button>
      {onOpen && (
        <div className="mt-4 flex gap-2 border-t border-line pt-4">
          <Button asChild size="sm" variant="ink" className="flex-1">
            <Link href={`/setup?racketId=${r.id}`}>
              Get a setup <ArrowRight />
            </Link>
          </Button>
          <Button size="sm" variant="ghost" onClick={onOpen}>
            Details
          </Button>
        </div>
      )}
    </Card>
  );
}

function RacketSheet({
  racket: r,
  signedIn,
  onClose,
  onAddToBag,
}: {
  racket: CatalogRacket | null;
  signedIn: boolean;
  onClose: () => void;
  onAddToBag: (r: CatalogRacket) => void;
}) {
  const guidance = r ? stringGuidance(r.stiffnessRa, r.headSize) : [];
  const specs = r
    ? [
        { label: "Head size", value: r.headSize ? `${r.headSize} in²` : null },
        { label: "Weight (unstrung)", value: r.weightUnstrung ? `${r.weightUnstrung} g` : null },
        { label: "String pattern", value: r.stringPattern },
        { label: "Stiffness", value: r.stiffnessRa != null ? `RA ${r.stiffnessRa}` : null },
        { label: "Beam width", value: r.beamWidth },
        { label: "Balance", value: r.balance },
        { label: "Tension range", value: r.recTensionMin && r.recTensionMax ? `${r.recTensionMin}–${r.recTensionMax} lbs` : null },
        { label: "Year", value: r.year ? String(r.year) : null },
      ].filter((s) => s.value)
    : [];

  return (
    <Sheet
      open={!!r}
      onOpenChange={(v) => !v && onClose()}
      title={r ? r.model : ""}
      description={r ? `${r.brand}${r.level ? ` · ${r.level[0].toUpperCase()}${r.level.slice(1)}` : ""}` : undefined}
      footer={
        r && (
          <div className="flex flex-col gap-2">
            <Button asChild size="lg" className="w-full">
              <Link href={`/setup?racketId=${r.id}`} onClick={onClose}>
                Get a string setup for this racket <ArrowRight />
              </Link>
            </Button>
            {signedIn && (
              <Button variant="secondary" className="w-full" onClick={() => onAddToBag(r)}>
                <Briefcase /> Add one to my bag
              </Button>
            )}
            {r.brand === "Hevini" && r.model === "Solution 1" && (
              <Button asChild variant="danger" className="w-full">
                <a href="https://hevinisporting.com" target="_blank" rel="noopener noreferrer">
                  Get the Hevini Solution 1 <ExternalLink />
                </a>
              </Button>
            )}
          </div>
        )
      }
    >
      {r && (
        <div className="space-y-6">
          <dl className="grid grid-cols-2 gap-2">
            {specs.map((s) => (
              <div key={s.label} className="rounded-xl bg-surface-2/70 px-3.5 py-3">
                <dt className="text-xs text-muted">{s.label}</dt>
                <dd className="mt-0.5 font-mono text-sm font-semibold tabular">{s.value}</dd>
              </div>
            ))}
          </dl>
          <StiffnessBar ra={r.stiffnessRa} />
          {guidance.length > 0 && (
            <section>
              <h3 className="eyebrow mb-3">What to string it with</h3>
              <ul className="space-y-2">
                {guidance.map((g) => (
                  <li key={g.type} className="rounded-xl border border-line p-3.5">
                    <p className="text-sm font-semibold">{g.type}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-muted">{g.reason}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {r.sourceUrl && (
            <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
              <ExternalLink className="size-3.5" /> Manufacturer details
            </a>
          )}
          {!signedIn && (
            <p className="flex items-center gap-2 text-xs text-muted">
              <Lock className="size-3" /> <Link href="/signup" className="underline underline-offset-2">Join free</Link> to keep this racket in your bag and track restrings.
            </p>
          )}
        </div>
      )}
    </Sheet>
  );
}
