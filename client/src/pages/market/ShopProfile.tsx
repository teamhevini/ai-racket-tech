import * as React from "react";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Award, CalendarCheck, Clock, Gift, Globe, Mail, MapPin, Phone, Settings2, Zap } from "lucide-react";
import { Page } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui/surface";
import { useMe } from "@/hooks/use-me";
import { BookingSheet } from "@/features/market/BookingSheet";
import { DemoBadge, RatingInline, VerifiedShopBadge } from "@/features/market/bits";
import {
  cents,
  mergePrefill,
  prefillFromSearch,
  stringName,
  turnaroundLabel,
  type BookingPrefill,
  type SampleProgram,
  type ShopDetail,
  type SuggestResponse,
} from "@/features/market/types";

export default function ShopProfile() {
  const { slug } = useParams<{ slug: string }>();
  const { signedIn, loading: meLoading } = useMe();
  const q = useQuery<ShopDetail>({ queryKey: [`/api/shops/${slug}`] });
  const fromQuery = React.useMemo(() => prefillFromSearch(window.location.search), []);
  const suggest = useQuery<SuggestResponse>({
    queryKey: [`/api/bookings/suggest?racketId=${fromQuery?.savedRacketId}`],
    enabled: signedIn && !!fromQuery?.savedRacketId,
  });

  const [open, setOpen] = React.useState(false);
  const [prefill, setPrefill] = React.useState<BookingPrefill | undefined>();
  const [carried, setCarried] = React.useState<BookingPrefill>({});
  const autoOpened = React.useRef(false);

  // Arrived from a reminder, a setup, a string page or "Book again": open the sheet pre-filled.
  React.useEffect(() => {
    if (autoOpened.current || !fromQuery || !q.data || meLoading) return;
    if (fromQuery.savedRacketId && signedIn && suggest.isLoading) return;
    autoOpened.current = true;
    const { book, ...explicit } = fromQuery;
    let last: BookingPrefill | null = suggest.data?.prefill ?? null;
    if (last && (explicit.stringId || explicit.mains)) last = { ...last, stringId: null, mains: null, crosses: null, gauge: null };
    const next = mergePrefill({ source: "profile" }, last, explicit);
    setCarried(next);
    setPrefill(next);
    if (book && q.data.acceptingBookings) setOpen(true);
  }, [fromQuery, q.data, meLoading, signedIn, suggest.isLoading, suggest.data]);

  function book(extra?: BookingPrefill) {
    // Keep the affiliate code and any carried racket/setup; a sample claim replaces the string.
    const base = extra?.stringId ? { ...carried, stringId: null, mains: null, crosses: null, gauge: null } : carried;
    setPrefill(mergePrefill({ source: "profile" }, base, extra));
    setOpen(true);
  }

  if (q.isLoading) {
    return (
      <Page narrow>
        <Skeleton className="mb-6 h-6 w-24" />
        <Skeleton className="h-64 rounded-3xl" />
        <Skeleton className="mt-4 h-40 rounded-2xl" />
      </Page>
    );
  }
  if (q.isError || !q.data) {
    return (
      <Page narrow>
        <EmptyState
          title="Shop not found"
          body="This shop may have moved or closed its 10IS page."
          action={
            <Button asChild variant="secondary">
              <Link href="/shops">All 10IS stringers</Link>
            </Button>
          }
        />
      </Page>
    );
  }

  const s = q.data;
  const rushHours = Math.max(4, Math.round(s.turnaroundHours / 2));

  return (
    <Page narrow className="pb-28 md:pb-16">
      <Button asChild variant="ghost" size="sm" className="-ml-3 mb-4">
        <Link href="/shops">
          <ArrowLeft /> Stringers
        </Link>
      </Button>

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-ink p-6 text-bg shadow-lift sm:p-9">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full border-[22px] border-bg/[0.06]" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-10 size-56 rounded-full bg-ball/10 blur-3xl" />
        <div className="relative">
          <div className="mb-4 flex flex-wrap gap-1.5">
            {s.pro && <VerifiedShopBadge />}
            {s.acceptingBookings ? <Badge tone="ball">Taking bookings</Badge> : <Badge>Not taking online bookings</Badge>}
            {s.isDemo && <DemoBadge />}
          </div>
          <h1 className="display break-words text-[2.75rem] leading-[0.98] sm:text-6xl">{s.name}</h1>
          {s.tagline && <p className="mt-3 max-w-md text-[0.9375rem] leading-relaxed text-bg/75">{s.tagline}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-bg/80">
            {s.city && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4" /> {s.city}
              </span>
            )}
            <RatingInline rating={s.rating} className="[&_.text-muted]:text-bg/60" />
            {!!s.rating?.jobs && <span>{s.rating.jobs} restrings on 10IS</span>}
          </div>

          <dl className="mt-7 grid grid-cols-3 gap-3 border-t border-bg/15 pt-5">
            <div>
              <dt className="text-xs text-bg/60">Labour from</dt>
              <dd className="mt-1 font-mono text-2xl font-semibold tabular">{cents(s.labourCents)}</dd>
            </div>
            <div>
              <dt className="text-xs text-bg/60">Turnaround</dt>
              <dd className="mt-1 text-lg font-semibold leading-tight">{turnaroundLabel(s.turnaroundHours)}</dd>
            </div>
            <div>
              <dt className="text-xs text-bg/60">Rush</dt>
              <dd className="mt-1 font-mono text-lg font-semibold tabular">+{cents(s.rushCents)}</dd>
              <dd className="text-2xs text-bg/50">~{rushHours} h</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Sample programmes — brand-funded, labelled */}
      {s.samplePrograms.length > 0 && (
        <section className="mt-6 space-y-3" aria-labelledby="samples">
          <h2 id="samples" className="eyebrow">
            Free samples here
          </h2>
          {s.samplePrograms.map((p) => (
            <SampleCard key={p.id} program={p} disabled={!s.acceptingBookings} onClaim={() => book({ sampleProgramId: p.id, sampleTitle: p.title, stringId: p.stringId, source: "sample" })} />
          ))}
        </section>
      )}

      {/* Details */}
      <Card className="mt-6 divide-y divide-line">
        {s.bio && <p className="p-5 text-[0.9375rem] leading-relaxed">{s.bio}</p>}
        <dl className="grid gap-x-6 gap-y-5 p-5 sm:grid-cols-2">
          {s.machine && <Detail icon={<Settings2 />} label="Machine" value={s.machine} />}
          {s.certifications && <Detail icon={<Award />} label="Certification" value={s.certifications} />}
          {s.openingHours && <Detail icon={<Clock />} label="Opening hours" value={<span className="whitespace-pre-line">{s.openingHours}</span>} />}
          {s.address && <Detail icon={<MapPin />} label="Address" value={<span className="whitespace-pre-line">{s.address}</span>} />}
          <Detail icon={<Zap />} label="Rush service" value={`About ${rushHours} hours, +${cents(s.rushCents)}`} />
        </dl>
        {(s.phone || s.email || s.website) && (
          <div className="flex flex-wrap gap-2 p-5">
            {s.phone && (
              <Button asChild variant="secondary" size="sm">
                <a href={`tel:${s.phone.replace(/\s+/g, "")}`}>
                  <Phone /> {s.phone}
                </a>
              </Button>
            )}
            {s.email && (
              <Button asChild variant="secondary" size="sm">
                <a href={`mailto:${s.email}`}>
                  <Mail /> Email
                </a>
              </Button>
            )}
            {s.website && (
              <Button asChild variant="secondary" size="sm">
                <a href={s.website} target="_blank" rel="noopener noreferrer">
                  <Globe /> Website
                </a>
              </Button>
            )}
          </div>
        )}
      </Card>

      {s.popularStrings.length > 0 && (
        <section className="mt-8" aria-labelledby="popular">
          <h2 id="popular" className="eyebrow mb-3">
            Popular here
          </h2>
          <ul className="flex flex-wrap gap-2">
            {s.popularStrings.map((p) => (
              <li key={p.id}>
                <Link href={`/strings/${p.id}`} className="inline-flex items-center gap-2 rounded-full bg-surface px-4 py-2.5 text-sm font-medium shadow-card ring-1 ring-line transition-colors hover:ring-ink/20">
                  {stringName(p)}
                  <span className="text-xs capitalize text-muted">{p.family}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-8 text-center text-xs text-muted">
        Ratings come only from players who booked through 10IS.{" "}
        <Link href="/how-we-rank" className="underline underline-offset-2">
          How we rank
        </Link>
      </p>

      {/* Sticky primary action, above the phone tab bar */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 px-4 md:bottom-6">
        <div className="pointer-events-auto mx-auto max-w-2xl">
          <Button size="lg" className="w-full shadow-lift" onClick={() => book()} disabled={!s.acceptingBookings}>
            <CalendarCheck /> {s.acceptingBookings ? `Book a restring · from ${cents(s.labourCents)}` : "Not taking online bookings"}
          </Button>
        </div>
      </div>

      <BookingSheet open={open} onOpenChange={setOpen} shop={s} prefill={prefill} />
    </Page>
  );
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-muted [&_svg]:size-4">{icon}</span>
      <div className="min-w-0">
        <dt className="text-xs text-muted">{label}</dt>
        <dd className="mt-0.5 text-[0.9375rem] font-medium">{value}</dd>
      </div>
    </div>
  );
}

function SampleCard({ program, onClaim, disabled }: { program: SampleProgram; onClaim: () => void; disabled?: boolean }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center gap-2 border-b border-line bg-ball/25 px-5 py-2 text-xs font-semibold">
        <Gift className="size-3.5" /> Brand-funded sample · sponsored by {program.brandName}
      </div>
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="display text-2xl leading-tight">{program.title}</p>
          {program.pitch && <p className="mt-1 text-sm text-muted">{program.pitch}</p>}
          <p className="mt-2 text-xs text-muted">
            <Link href={`/strings/${program.stringId}`} className="font-medium text-ink underline underline-offset-2">
              {program.brandName} {program.model}
            </Link>{" "}
            · {program.unitsLeft} left · {program.brandName} pays the stringer, you pay nothing
          </p>
        </div>
        <Button variant="ink" onClick={onClaim} disabled={disabled} className="shrink-0">
          Claim
        </Button>
      </div>
    </Card>
  );
}
