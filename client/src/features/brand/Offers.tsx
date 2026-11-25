import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowUpRight, Pencil, Plus, Scale, Search, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Switch } from "@/components/ui/field";
import { ConfirmSheet, Sheet } from "@/components/ui/sheet";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui/surface";
import { useDebounce } from "@/hooks/use-debounce";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { dollars, errMsg, toCents, type CatalogString, type OfferRow } from "./shared";

const offersKey = ["/api/brand/offers"] as const;

export function OffersTab() {
  const q = useQuery<OfferRow[]>({ queryKey: offersKey });
  const [sheet, setSheet] = React.useState<OfferRow | "new" | null>(null);
  const [removing, setRemoving] = React.useState<OfferRow | null>(null);
  const qc = useQueryClient();
  const del = useMutation({
    mutationFn: (id: number) => api("DELETE", `/api/brand/offers/${id}`),
    onSuccess: () => {
      toast.success("Offer removed");
      qc.invalidateQueries({ queryKey: offersKey });
      setRemoving(null);
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-xl">
          <h2 className="display text-4xl leading-tight">Offers</h2>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">List your price for any string in the 10IS catalogue. Players tap through to your product page.</p>
        </div>
        {(q.data?.length ?? 0) > 0 && (
          <Button onClick={() => setSheet("new")}>
            <Plus /> Add offer
          </Button>
        )}
      </div>

      <Card className="flex gap-4 p-5 sm:p-6">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-hard-soft text-hard">
          <Scale className="size-5" />
        </span>
        <div className="text-sm leading-relaxed">
          <p className="font-semibold">Cheapest first, always</p>
          <p className="mt-0.5 text-muted">
            Offers for a string are listed by price, lowest first, with in-stock offers ahead of out-of-stock ones. Your commission rate is only used for
            billing and never affects the order.
          </p>
        </div>
      </Card>

      {q.isLoading ? (
        <Skeleton className="h-48 rounded-2xl" />
      ) : q.isError ? (
        <EmptyState title="Couldn't load offers" body={errMsg(q.error)} action={<Button onClick={() => q.refetch()}>Try again</Button>} />
      ) : !q.data?.length ? (
        <EmptyState
          icon={<ShoppingBag />}
          title="No offers yet"
          body="Add the strings you stock. They'll appear on each string's page and under matching recommendations."
          action={
            <Button size="lg" onClick={() => setSheet("new")}>
              <Plus /> Add your first offer
            </Button>
          }
        />
      ) : (
        <Card className="divide-y divide-line">
          {q.data.map((o) => (
            <div key={o.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4 sm:p-5">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  <span className="text-muted">{o.brandName}</span> {o.model}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <Badge tone={o.inStock ? "grass" : "neutral"}>{o.inStock ? "In stock" : "Out of stock"}</Badge>
                  <span className="tabular">{o.commissionPct.toFixed(1)}% commission</span>
                  <a href={o.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 hover:text-ink">
                    Product page <ArrowUpRight className="size-3" />
                  </a>
                </p>
              </div>
              <p className="display text-2xl tabular">{dollars(o.priceCents)}</p>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon-sm" aria-label="Edit offer" onClick={() => setSheet(o)}>
                  <Pencil />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label="Remove offer" onClick={() => setRemoving(o)}>
                  <Trash2 />
                </Button>
              </div>
            </div>
          ))}
        </Card>
      )}

      <OfferSheet value={sheet} onClose={() => setSheet(null)} />
      <ConfirmSheet
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title="Remove offer?"
        body={removing ? `${removing.brandName} ${removing.model} will no longer be listed with your price.` : ""}
        confirmLabel="Remove"
        loading={del.isPending}
        onConfirm={() => removing && del.mutate(removing.id)}
      />
    </div>
  );
}

function OfferSheet({ value, onClose }: { value: OfferRow | "new" | null; onClose: () => void }) {
  const qc = useQueryClient();
  const o = value && value !== "new" ? value : null;
  const [picked, setPicked] = React.useState<{ id: number; label: string } | null>(null);
  const [search, setSearch] = React.useState("");
  const dq = useDebounce(search.trim(), 250);
  const [f, setF] = React.useState({ price: "", url: "", inStock: true, commission: "8" });
  const [err, setErr] = React.useState<{ field?: string; message: string } | null>(null);

  React.useEffect(() => {
    if (!value) return;
    setErr(null);
    setSearch("");
    if (o) {
      setPicked({ id: o.stringId, label: `${o.brandName} ${o.model}` });
      setF({ price: (o.priceCents / 100).toFixed(2), url: o.url, inStock: o.inStock, commission: String(o.commissionPct) });
    } else {
      setPicked(null);
      setF({ price: "", url: "https://", inStock: true, commission: "8" });
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const results = useQuery<CatalogString[]>({ queryKey: [`/api/strings?q=${encodeURIComponent(dq)}`], enabled: !!value && !picked && dq.length >= 2 });

  const save = useMutation({
    mutationFn: () => {
      const priceCents = toCents(f.price);
      if (Number.isNaN(priceCents)) throw new ApiError("Enter a price like 18.95", 400, { field: "priceCents" });
      const commissionPct = f.commission.trim() ? parseFloat(f.commission) : 0;
      return api("POST", "/api/brand/offers", { stringId: picked!.id, priceCents, url: f.url.trim(), inStock: f.inStock, commissionPct });
    },
    onSuccess: () => {
      toast.success("Offer saved");
      qc.invalidateQueries({ queryKey: offersKey });
      onClose();
    },
    onError: (e) => setErr({ field: e instanceof ApiError ? e.field : undefined, message: errMsg(e) }),
  });

  const fe = (k: string) => (err?.field === k ? err.message : null);

  return (
    <Sheet
      open={!!value}
      onOpenChange={(v) => !v && onClose()}
      title={o ? "Edit offer" : "Add an offer"}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!picked || !f.price || !f.url}>
            Save offer
          </Button>
        </div>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (picked) save.mutate();
        }}
      >
        {picked ? (
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface-2/70 px-4 py-3">
            <div className="min-w-0">
              <p className="text-xs text-muted">String</p>
              <p className="truncate font-medium">{picked.label}</p>
            </div>
            {!o && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setPicked(null)}>
                Change
              </Button>
            )}
          </div>
        ) : (
          <div>
            <Field label="String" error={fe("stringId")}>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
                <Input className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search brand or model" autoFocus />
              </div>
            </Field>
            {dq.length >= 2 && (
              <ul className="mt-2 max-h-60 divide-y divide-line overflow-y-auto rounded-2xl ring-1 ring-line">
                {results.isLoading ? (
                  <li className="p-4">
                    <Skeleton className="h-5" />
                  </li>
                ) : !results.data?.length ? (
                  <li className="p-4 text-sm text-muted">No strings match "{dq}".</li>
                ) : (
                  results.data.slice(0, 30).map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => setPicked({ id: s.id, label: `${s.brandName} ${s.model}` })}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-surface-2/60"
                      >
                        <span className="min-w-0 truncate">
                          <span className="text-muted">{s.brandName}</span> <span className="font-medium">{s.model}</span>
                        </span>
                        <span className="shrink-0 text-xs text-faint">{s.family}</span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        )}

        <div className={cn("space-y-4", !picked && "pointer-events-none opacity-50")}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price per set" error={fe("priceCents")}>
              <Input inputMode="decimal" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} placeholder="18.95" />
            </Field>
            <Field label="Commission" hint="% paid to 10IS per order" error={fe("commissionPct")}>
              <Input inputMode="decimal" value={f.commission} onChange={(e) => setF({ ...f, commission: e.target.value })} />
            </Field>
          </div>
          <Field label="Product page" error={fe("url")} hint="Must be an https link.">
            <Input type="url" inputMode="url" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} />
          </Field>
          <Switch checked={f.inStock} onCheckedChange={(v) => setF({ ...f, inStock: v })} label="In stock" description="Out-of-stock offers are listed after in-stock ones." />
          <p className="text-xs leading-relaxed text-muted">Commission never affects where your offer appears. Players always see the cheapest in-stock price first.</p>
        </div>
        {err && !["stringId", "priceCents", "commissionPct", "url"].includes(err.field ?? "") && (
          <p className="text-sm text-brand" role="alert">
            {err.message}
          </p>
        )}
      </form>
    </Sheet>
  );
}
