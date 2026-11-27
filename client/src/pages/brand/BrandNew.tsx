import * as React from "react";
import { Link, Redirect, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Mail, Store, Swords, Waves } from "lucide-react";
import { Page } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Card, PageHeader, Skeleton } from "@/components/ui/surface";
import { api, ApiError } from "@/lib/api";
import { useMe, useRefreshMe } from "@/hooks/use-me";
import { cn } from "@/lib/utils";
import { errMsg, type BrandJson } from "@/features/brand/shared";

type Kind = BrandJson["kind"];

const KINDS: Array<{ id: Kind; title: string; body: string; icon: React.ComponentType<{ className?: string }>; points: string[] }> = [
  {
    id: "string",
    title: "String company",
    body: "You make tennis strings.",
    icon: Waves,
    points: ["Manage your catalogue", "Sponsored placements, only where you fit", "Demand and retention insights"],
  },
  {
    id: "racket",
    title: "Racket brand",
    body: "You make frames.",
    icon: Swords,
    points: ["A verified brand page", "Which strings the AI pairs with your frames", "Who plays your rackets"],
  },
  {
    id: "retailer",
    title: "Retailer",
    body: "You sell strings online.",
    icon: Store,
    points: ["List your price on any string", "Cheapest first, commission never buys rank", "Clicks, orders and revenue"],
  },
];

const SWATCHES = ["#101814", "#c8102e", "#1f5e3d", "#26549c", "#c45c34", "#7c3aed", "#d6f04a", "#0f766e"];

export default function BrandNew() {
  const { me, signedIn, loading } = useMe();
  const refreshMe = useRefreshMe();
  const [, navigate] = useLocation();
  const [kind, setKind] = React.useState<Kind | null>(null);
  const [f, setF] = React.useState({ name: "", website: "", tagline: "", accent: "#101814" });
  const [err, setErr] = React.useState<{ field?: string; message: string } | null>(null);

  const create = useMutation({
    mutationFn: () =>
      api<BrandJson>("POST", "/api/brand", {
        name: f.name.trim(),
        kind,
        website: f.website.trim() || null,
        tagline: f.tagline.trim() || null,
        accent: /^#[0-9a-fA-F]{6}$/.test(f.accent) ? f.accent : null,
      }),
    onSuccess: async (b) => {
      toast.success(`${b.name} is set up`);
      await refreshMe();
      navigate("/brand");
    },
    onError: (e) => setErr({ field: e instanceof ApiError ? e.field : undefined, message: errMsg(e) }),
  });

  if (loading) {
    return (
      <Page narrow>
        <Skeleton className="mb-6 h-12 w-2/3" />
        <Skeleton className="h-64 rounded-2xl" />
      </Page>
    );
  }

  if (!signedIn) {
    return (
      <Page narrow>
        <PageHeader eyebrow="10IS for Business" title="Bring your brand to 10IS" description="Create a free player account first. Your brand portal sits alongside it." />
        <Card className="p-6 sm:p-8">
          <p className="text-[0.9375rem] leading-relaxed text-muted">String companies, racket brands and retailers get a verified page, their catalogue in front of the AI technician, and honest insights.</p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/signup?next=/brand/new">Create an account</Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link href="/login?next=/brand/new">I already have one</Link>
            </Button>
          </div>
        </Card>
      </Page>
    );
  }

  if (me.brand) return <Redirect to="/brand" />;

  const nameErr = err?.field === "name" ? err.message : null;
  const listed = nameErr?.includes("partners@10is.app");

  return (
    <Page narrow>
      <PageHeader
        eyebrow={kind ? "Step 2 of 2" : "Step 1 of 2"}
        title={kind ? "Tell players who you are" : "What kind of business?"}
        description={kind ? "You can change all of this later." : "This decides which tools your portal shows. It can't be changed later."}
      />

      {!kind ? (
        <div className="grid gap-3">
          {KINDS.map((k, i) => (
            <button
              key={k.id}
              type="button"
              onClick={() => setKind(k.id)}
              className="group animate-fade-up text-left"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <Card className="flex items-start gap-5 p-5 transition-all duration-200 ease-spring group-hover:shadow-lift group-hover:ring-ink/20 group-active:scale-[0.99] sm:p-7">
                <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-surface-2 text-ink transition-colors group-hover:bg-ink group-hover:text-bg">
                  <k.icon className="size-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="display text-3xl leading-tight">{k.title}</h2>
                  <p className="mt-0.5 text-sm text-muted">{k.body}</p>
                  <ul className="mt-3 space-y-1">
                    {k.points.map((p) => (
                      <li key={p} className="flex gap-2 text-sm">
                        <Check className="mt-0.5 size-4 shrink-0 text-grass" aria-hidden />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
                <ArrowRight className="mt-2 size-5 shrink-0 text-faint transition-transform group-hover:translate-x-1 group-hover:text-ink" aria-hidden />
              </Card>
            </button>
          ))}
        </div>
      ) : (
        <Card className="animate-fade-up p-5 sm:p-8">
          <button type="button" onClick={() => setKind(null)} className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
            <ArrowLeft className="size-4" /> {KINDS.find((k) => k.id === kind)?.title}
          </button>
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              setErr(null);
              create.mutate();
            }}
          >
            <Field label={kind === "retailer" ? "Store name" : "Brand name"} error={listed ? null : nameErr}>
              <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={80} autoFocus required />
            </Field>
            {listed && (
              <div className="flex gap-3 rounded-2xl bg-hard-soft p-4 text-sm leading-relaxed text-ink" role="alert">
                <Mail className="mt-0.5 size-4 shrink-0 text-hard" aria-hidden />
                <p>
                  {nameErr}{" "}
                  <a href="mailto:partners@10is.app" className="font-semibold underline underline-offset-2">
                    Email partners@10is.app
                  </a>
                </p>
              </div>
            )}
            <Field label="Website" optional>
              <Input type="url" inputMode="url" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} placeholder="https://" />
            </Field>
            <Field label="Tagline" optional hint="One line for your public page.">
              <Input value={f.tagline} onChange={(e) => setF({ ...f, tagline: e.target.value })} maxLength={140} />
            </Field>
            <div>
              <p className="text-sm font-medium">Accent colour</p>
              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                {SWATCHES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Use ${c}`}
                    aria-pressed={f.accent.toLowerCase() === c}
                    onClick={() => setF({ ...f, accent: c })}
                    className={cn(
                      "size-9 rounded-full ring-offset-2 ring-offset-surface transition-transform active:scale-90",
                      f.accent.toLowerCase() === c ? "ring-2 ring-ink" : "ring-1 ring-line",
                    )}
                    style={{ background: c }}
                  />
                ))}
                <label className="relative grid size-9 cursor-pointer place-items-center overflow-hidden rounded-full ring-1 ring-line" title="Custom colour">
                  <span className="text-xs text-muted">+</span>
                  <input type="color" value={f.accent} onChange={(e) => setF({ ...f, accent: e.target.value })} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Custom colour" />
                </label>
              </div>
              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-surface-2/70 px-4 py-3">
                <span className="size-8 shrink-0 rounded-full" style={{ background: f.accent }} aria-hidden />
                <span className="min-w-0 truncate display text-xl">{f.name.trim() || "Your brand"}</span>
              </div>
            </div>
            {err && err.field !== "name" && (
              <p className="text-sm text-brand" role="alert">
                {err.message}
              </p>
            )}
            <Button type="submit" size="lg" className="w-full sm:w-auto" loading={create.isPending} disabled={f.name.trim().length < 2}>
              Create brand portal
            </Button>
            <p className="text-xs leading-relaxed text-muted">New brands start unverified. We'll confirm you represent the company before your page shows a verified badge.</p>
          </form>
        </Card>
      )}
    </Page>
  );
}
