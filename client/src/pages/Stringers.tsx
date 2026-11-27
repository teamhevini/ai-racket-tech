import * as React from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  CalendarCheck,
  Globe,
  LocateFixed,
  Mail,
  MapPin,
  Navigation,
  Pencil,
  Phone,
  Plus,
  Search,
  Star,
  Trash2,
  Wrench,
} from "lucide-react";
import { Page } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Badge, Card, EmptyState, PageHeader, Segmented, Skeleton } from "@/components/ui/surface";
import { ConfirmSheet } from "@/components/ui/sheet";
import { UpgradeCard } from "@/components/UpgradeCard";
import { StringerForm } from "@/features/StringerForm";
import { useMe } from "@/hooks/use-me";
import { useDebounce } from "@/hooks/use-debounce";
import { InviteStringerButton } from "@/features/market/InviteStringer";
import { useDeleteStringer, useMyStringers } from "@/hooks/use-bag";
import { ApiError, get } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { MyStringer, PlaceResult, SavedStringerJson, StringerSearchResponse } from "@/lib/types";

type Tab = "near" | "mine";

function directionsUrl(name: string, address?: string | null, placeId?: string | null) {
  const params = new URLSearchParams({ api: "1", query: [name, address].filter(Boolean).join(", ") });
  if (placeId) params.set("query_place_id", placeId);
  return `https://www.google.com/maps/search/?${params}`;
}

function websiteHref(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export default function Stringers() {
  const { signedIn, loading } = useMe();
  const mine = useMyStringers(signedIn);
  const [tab, setTab] = React.useState<Tab>("near");
  const [chosen, setChosen] = React.useState(false);

  // Default to "My stringers" once we know the player has some.
  React.useEffect(() => {
    if (!chosen && mine.data && mine.data.length > 0) setTab("mine");
  }, [mine.data, chosen]);

  const pick = (t: Tab) => {
    setChosen(true);
    setTab(t);
  };

  return (
    <Page>
      <PageHeader
        eyebrow="Stringers"
        title={
          <>
            The hands behind <em className="text-brand">your strings</em>
          </>
        }
        description="Find a stringer near you, and keep the ones you trust a tap away — with their number, hours and notes."
      />

      <Link href="/shops" className="group mb-6 block">
        <div className="flex items-center gap-4 rounded-2xl bg-ink px-5 py-4 text-bg transition-transform duration-300 ease-spring group-active:scale-[0.99]">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ball text-ball-ink">
            <CalendarCheck className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Book a 10IS stringer online</p>
            <p className="text-sm text-bg/65">Pick a day, track it live, pick it up.</p>
          </div>
          <ArrowRight className="size-5 shrink-0 transition-transform group-hover:translate-x-0.5" />
        </div>
      </Link>

      <Segmented
        label="Stringers view"
        value={tab}
        onChange={pick}
        className="mb-6 w-full sm:w-auto"
        options={[
          { value: "near", label: "Near me" },
          {
            value: "mine",
            label: (
              <span className="inline-flex items-center gap-1.5">
                My stringers
                {signedIn && mine.data && mine.data.length > 0 && (
                  <span className="rounded-full bg-surface-2 px-1.5 text-2xs tabular text-muted">{mine.data.length}</span>
                )}
              </span>
            ),
          },
        ]}
      />

      {tab === "near" ? <NearMe /> : loading ? <ListSkeleton /> : signedIn ? <MyStringers /> : <SignedOutMine />}
    </Page>
  );
}

// ─── Near me ────────────────────────────────────────────────────────────────

function NearMe() {
  const { signedIn } = useMe();
  const saved = useMyStringers(signedIn);
  const [query, setQuery] = React.useState("");
  const [coords, setCoords] = React.useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = React.useState(false);
  const [saving, setSaving] = React.useState<PlaceResult | null>(null);
  const [nudge, setNudge] = React.useState(false);
  const debounced = useDebounce(query.trim(), 600);

  const url = coords
    ? `/api/stringers/search?lat=${coords.lat}&lng=${coords.lng}`
    : debounced.length >= 2
      ? `/api/stringers/search?query=${encodeURIComponent(debounced)}`
      : null;

  const search = useQuery<StringerSearchResponse>({
    queryKey: [url],
    queryFn: () => get<StringerSearchResponse>(url!),
    enabled: !!url,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const savedPlaceIds = new Set((saved.data ?? []).map((s) => s.stringerPlaceId).filter(Boolean));

  function locate() {
    if (!navigator.geolocation) {
      toast.error("Your browser can't share location — search by city instead.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: Number(pos.coords.latitude.toFixed(4)), lng: Number(pos.coords.longitude.toFixed(4)) });
        setQuery("");
        setLocating(false);
      },
      () => {
        setLocating(false);
        toast.error("We couldn't get your location. Check location permissions, or search by city.");
      },
      { timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  }

  function onSave(place: PlaceResult) {
    if (!signedIn) {
      setNudge(true);
      return;
    }
    setSaving(place);
  }

  const data = search.data;
  const err = search.error;

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCoords(null);
            }}
            placeholder="City or zip code"
            className="pl-11"
            aria-label="Search for stringers by city or zip code"
            enterKeyHint="search"
            autoComplete="postal-code"
          />
        </div>
        <Button variant="secondary" onClick={locate} loading={locating} className="shrink-0" aria-label="Use my location">
          {!locating && <LocateFixed />}
          <span className="hidden sm:inline">Use my location</span>
        </Button>
      </div>

      {coords && (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Navigation className="size-3.5 text-grass" /> Showing stringers within about 25 km of you
        </p>
      )}

      {nudge && !signedIn && (
        <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="font-semibold">Save stringers to your account</p>
            <p className="mt-0.5 text-sm text-muted">A free account keeps your stringers, rackets and restring history together.</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup">Join free</Link>
            </Button>
          </div>
        </Card>
      )}

      {!url && (
        <EmptyState
          icon={<MapPin />}
          title="Who strings near you?"
          body="Search by city or zip code, or share your location to see stringers and pro shops nearby."
          action={
            <Button variant="ink" onClick={locate} loading={locating}>
              <LocateFixed /> Use my location
            </Button>
          }
        />
      )}

      {url && search.isLoading && <ListSkeleton />}

      {url && err && (
        <EmptyState
          icon={<MapPin />}
          title="Search is resting"
          body={
            err instanceof ApiError && err.message
              ? `${err.message} You can still add a stringer you know by hand.`
              : "Stringer search is unavailable right now. Try again in a moment."
          }
          action={
            signedIn ? (
              <Button variant="secondary" onClick={() => setSaving({ name: "", address: "", place_id: "", types: [] })}>
                <Plus /> Add a stringer manually
              </Button>
            ) : undefined
          }
        />
      )}

      {data && data.results.length === 0 && (
        <EmptyState
          icon={<Search />}
          title="No stringers found"
          body="Try a nearby city or a wider area. Many club pro shops string too — ask at the front desk."
        />
      )}

      {data && data.results.length > 0 && (
        <>
          <p className="text-sm text-muted">
            {data.total} result{data.total === 1 ? "" : "s"}
          </p>
          <ul className="grid gap-3 md:grid-cols-2">
            {data.results.map((p, i) => (
              <li key={p.place_id} className="animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
                <PlaceCard place={p} saved={savedPlaceIds.has(p.place_id)} onSave={() => onSave(p)} />
              </li>
            ))}
          </ul>
          {data.limited && (
            <UpgradeCard
              title={`See all ${data.total} stringers`}
              body={`Free shows the top ${data.results.length}. Pro unlocks every stringer near you.`}
            />
          )}
        </>
      )}

      <StringerForm
        open={!!saving}
        onOpenChange={(v) => !v && setSaving(null)}
        initial={
          saving
            ? { stringerName: saving.name, stringerAddress: saving.address, stringerPlaceId: saving.place_id || null }
            : undefined
        }
      />
    </div>
  );
}

function PlaceCard({ place, saved, onSave }: { place: PlaceResult; saved: boolean; onSave: () => void }) {
  return (
    <Card className="flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold leading-snug">{place.name}</h3>
          <p className="mt-1 flex items-start gap-1.5 text-sm text-muted">
            <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>{place.address}</span>
          </p>
        </div>
        {saved && (
          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-grass">
            <BookmarkCheck className="size-4" aria-hidden /> Saved
          </span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {place.rating != null && (
          <Badge tone="ball">
            <Star className="size-3 fill-current" /> {place.rating.toFixed(1)}
            {place.ratingCount != null && <span className="font-normal opacity-70">({place.ratingCount})</span>}
          </Badge>
        )}
        {place.openNow === true && <Badge tone="grass">Open now</Badge>}
        {place.openNow === false && <Badge>Closed now</Badge>}
      </div>
      <div className="mt-auto flex gap-2 pt-4">
        <Button asChild variant="outline" size="sm" className="flex-1">
          <a href={directionsUrl(place.name, place.address, place.place_id)} target="_blank" rel="noopener noreferrer">
            <Navigation /> Directions
          </a>
        </Button>
        {!saved && (
          <Button size="sm" variant="ink" className="flex-1" onClick={onSave}>
            <Bookmark /> Save
          </Button>
        )}
      </div>
    </Card>
  );
}

// ─── My stringers ───────────────────────────────────────────────────────────

function MyStringers() {
  const list = useMyStringers();
  const del = useDeleteStringer();
  const [editing, setEditing] = React.useState<SavedStringerJson | null>(null);
  const [adding, setAdding] = React.useState(false);
  const [removing, setRemoving] = React.useState<MyStringer | null>(null);

  if (list.isLoading) return <ListSkeleton />;
  if (list.error) {
    return <EmptyState title="Couldn't load your stringers" body={(list.error as Error).message} action={<Button variant="secondary" onClick={() => list.refetch()}>Try again</Button>} />;
  }

  const stringers = list.data ?? [];

  return (
    <div className="space-y-5">
      {stringers.length === 0 ? (
        <EmptyState
          icon={<Wrench />}
          title="No stringers saved yet"
          body="Save the shop or person who strings your rackets. You can link every restring to them and keep their number handy."
          action={
            <Button onClick={() => setAdding(true)}>
              <Plus /> Add a stringer
            </Button>
          }
        />
      ) : (
        <>
          <ul className="grid gap-3 md:grid-cols-2">
            {stringers.map((s, i) => (
              <li key={s.id} className="animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
                <MyStringerCard stringer={s} onEdit={() => setEditing(s)} onDelete={() => setRemoving(s)} />
              </li>
            ))}
          </ul>
          <Button variant="secondary" onClick={() => setAdding(true)} className="w-full sm:w-auto">
            <Plus /> Add a stringer manually
          </Button>
        </>
      )}

      <StringerForm open={adding || !!editing} onOpenChange={(v) => { if (!v) { setAdding(false); setEditing(null); } }} stringer={editing} />

      <ConfirmSheet
        open={!!removing}
        onOpenChange={(v) => !v && setRemoving(null)}
        title="Remove stringer?"
        body={
          <>
            <strong className="text-ink">{removing?.stringerName}</strong> will be removed from your list.
            {removing && removing.jobCount > 0 && " Your restring history stays — those entries just won't show a stringer."}
          </>
        }
        confirmLabel="Remove"
        loading={del.isPending}
        onConfirm={() =>
          removing &&
          del.mutate(removing.id, {
            onSuccess: () => {
              toast.success("Stringer removed");
              setRemoving(null);
            },
          })
        }
      />
    </div>
  );
}

function MyStringerCard({ stringer: s, onEdit, onDelete }: { stringer: MyStringer; onEdit: () => void; onDelete: () => void }) {
  return (
    <Card className="flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="display text-2xl leading-tight">{s.stringerName}</h3>
          {s.stringerAddress && (
            <p className="mt-1 flex items-start gap-1.5 text-sm text-muted">
              <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              <span>{s.stringerAddress}</span>
            </p>
          )}
        </div>
        <div className="-mr-2 -mt-1 flex shrink-0">
          <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label={`Edit ${s.stringerName}`}>
            <Pencil />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onDelete} aria-label={`Remove ${s.stringerName}`} className="hover:text-brand">
            <Trash2 />
          </Button>
        </div>
      </div>

      <p className="mt-3 text-xs text-muted">
        {s.jobCount > 0 ? (
          <>
            <span className="font-semibold text-ink tabular">{s.jobCount}</span> restring{s.jobCount === 1 ? "" : "s"}
            {s.lastJobAt && <> · last {formatDate(s.lastJobAt)}</>}
          </>
        ) : (
          "No restrings logged with them yet"
        )}
      </p>

      {s.notes && <p className="mt-3 whitespace-pre-line rounded-xl bg-surface-2/70 px-3.5 py-2.5 text-sm leading-relaxed">{s.notes}</p>}

      {s.shopSlug ? (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-grass-soft px-4 py-3">
          <p className="text-sm font-medium text-grass">Takes bookings on 10IS</p>
          <Button asChild size="sm">
            <Link href={`/shops/${s.shopSlug}?book=1`}>
              <CalendarCheck /> Book
            </Link>
          </Button>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-line px-4 py-3">
          <p className="text-sm text-muted">Book {s.stringerName.split(/\s+/)[0]} in two taps next time: invite them to take bookings on 10IS. It's free for them.</p>
          <InviteStringerButton savedStringerId={s.id} name={s.stringerName} size="sm" variant="secondary" className="mt-3" />
        </div>
      )}

      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        {s.phone && (
          <Button asChild size="sm" variant="ink">
            <a href={`tel:${s.phone.replace(/[^\d+]/g, "")}`}>
              <Phone /> Call
            </a>
          </Button>
        )}
        {s.email && (
          <Button asChild size="sm" variant="outline">
            <a href={`mailto:${s.email}`}>
              <Mail /> Email
            </a>
          </Button>
        )}
        {s.website && (
          <Button asChild size="sm" variant="outline">
            <a href={websiteHref(s.website)} target="_blank" rel="noopener noreferrer">
              <Globe /> Website
            </a>
          </Button>
        )}
        {(s.stringerAddress || s.stringerPlaceId) && (
          <Button asChild size="sm" variant="outline">
            <a href={directionsUrl(s.stringerName, s.stringerAddress, s.stringerPlaceId)} target="_blank" rel="noopener noreferrer">
              <Navigation /> Directions
            </a>
          </Button>
        )}
      </div>
    </Card>
  );
}

function SignedOutMine() {
  return (
    <EmptyState
      icon={<Bookmark />}
      title="Keep your stringers together"
      body="Save the people who string your rackets, link every restring to them, and get reminded when it's time to go back."
      action={
        <div className="flex gap-2">
          <Button asChild variant="ghost">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Join free</Link>
          </Button>
        </div>
      }
    />
  );
}

function ListSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2" aria-busy="true" aria-label="Loading">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-40 rounded-2xl" />
      ))}
    </div>
  );
}
