import * as React from "react";
import { Link } from "wouter";
import { ArrowRight, Check, ChevronDown, Gift, MousePointerClick, ShieldCheck, ShoppingBag, Store, Tags, Wrench } from "lucide-react";
import { Page } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/surface";
import { useMe } from "@/hooks/use-me";
import { BRAND_PLANS, K_ANONYMITY, SAMPLE_PLATFORM_FEE_PCT, SHOP_CLUB, SHOP_PLANS, SPONSORED_MIN_CPC_CENTS } from "@shared/tiers";
import { cn } from "@/lib/utils";

const minCpc = `$${(SPONSORED_MIN_CPC_CENTS / 100).toFixed(2)}`;
const stringerShare = 100 - SAMPLE_PLATFORM_FEE_PCT;

const AUDIENCES = [
  {
    icon: Wrench,
    who: "Stringers",
    pitch: "Bookings that arrive with the racket's whole story.",
    gets: ["Online booking with live status for players", "Every customer racket's string history, with their consent", "Rebook prompts when strings are due", "Paid installs from brand sample programmes"],
  },
  {
    icon: Tags,
    who: "String companies",
    pitch: "Reach players at the moment they choose.",
    gets: ["A verified brand page and catalogue", "Sponsored placements that only show when they fit", "Demand, retention and switching insights", "Sample programmes through partner stringers"],
  },
  {
    icon: ShoppingBag,
    who: "Retailers",
    pitch: "Be where the setup becomes a purchase.",
    gets: ["Free listing of your prices and stock", "Offers sorted by price, never by deal", "Affiliate commission on the sales you make", "Clean click and conversion reporting"],
  },
  {
    icon: Store,
    who: "Racket brands",
    pitch: "Know what goes into your frames after the sale.",
    gets: ["A verified brand page", "Which strings and tensions players pair with your frames", "Aggregated insight by level and playstyle", "Partner sample programmes"],
  },
];

const FAQ = [
  {
    q: "Can I pay to be the AI's recommendation?",
    a: "No. The recommendation is generated before any commercial data is looked at and is stored before the sponsored slot is even requested. No plan, budget or partnership changes it.",
  },
  {
    q: "Do Shop Pro shops rank higher in the directory?",
    a: "No. The directory is ordered without regard to plan. Shop Pro buys tools — unlimited bookings, history, insights — not position. Pro shops carry a “Verified shop” badge, but it never changes the order.",
  },
  {
    q: "When does a sponsored placement show?",
    a: "Only when the string passes the same fit and safety checks as the player's own setup and scores 70 or more out of 100 for that player. One per setup at most, always after the recommendation and its alternatives, always labelled “Sponsored”. Paying players never see one.",
  },
  {
    q: "What data do brands see?",
    a: `Aggregates only. Insights are built from hashed identifiers and never show a group with fewer than ${K_ANONYMITY} distinct players. We never sell personal data or hand over player lists.`,
  },
  {
    q: "How do sample programmes work?",
    a: `A brand funds a number of free restrings with its string at partner shops. Players claim one from the shop's page; the brand pays the install fee, and the stringer keeps ${stringerShare}% of it. Every sample is labelled as brand-funded, and ratings from sampled players are marked as such.`,
  },
  {
    q: "Is there a contract?",
    a: "No. Paid plans are monthly and cancel any time from your console. Sponsored budgets have a monthly cap you set, and you only pay for clicks on placements we actually showed.",
  },
];

export default function Business() {
  const { me, signedIn } = useMe();
  const shopHref = signedIn && me.shop ? "/shop" : "/shop/new";
  const brandHref = signedIn && me.brand ? "/brand" : "/brand/new";
  const shopCta = me.shop ? "Open your shop console" : "Open your shop";
  const brandCta = me.brand ? "Open your brand portal" : "Set up your brand";

  return (
    <div className="pb-16">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line bg-ink text-bg">
        <div aria-hidden className="pointer-events-none absolute -right-32 -top-32 size-[28rem] rounded-full border-[40px] border-bg/[0.05]" />
        <div aria-hidden className="pointer-events-none absolute -bottom-40 left-1/4 size-96 rounded-full bg-ball/10 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-12 sm:px-6 sm:pb-24 sm:pt-20">
          <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-ball">10IS for Business</p>
          <h1 className="display mt-4 max-w-3xl text-[3rem] leading-[0.95] sm:text-7xl lg:text-8xl">
            The home of tennis <em className="text-ball">equipment.</em>
          </h1>
          <p className="mt-6 max-w-xl text-[1.0625rem] leading-relaxed text-bg/75">
            One place where players decide what goes in their racket next — and book the hands that put it there. Join as a stringer, a string
            company, a retailer or a racket brand.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" variant="ball">
              <Link href={shopHref}>
                {shopCta} <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-bg/25 text-bg hover:border-bg/50 hover:bg-bg/10">
              <Link href={brandHref}>{brandCta}</Link>
            </Button>
          </div>
        </div>
      </section>

      <Page className="pt-12 sm:pt-16">
        {/* Who it's for */}
        <section aria-labelledby="who">
          <p className="eyebrow mb-2">Who it's for</p>
          <h2 id="who" className="display max-w-2xl text-4xl leading-tight sm:text-5xl">
            Every side of the string bed.
          </h2>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {AUDIENCES.map((a) => (
              <Card key={a.who} className="flex flex-col p-5">
                <span className="grid size-10 place-items-center rounded-full bg-surface-2">
                  <a.icon className="size-5" />
                </span>
                <h3 className="display mt-4 text-2xl">{a.who}</h3>
                <p className="mt-1 text-sm text-muted">{a.pitch}</p>
                <ul className="mt-4 space-y-2 text-sm">
                  {a.gets.map((g) => (
                    <li key={g} className="flex gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-grass" />
                      {g}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </section>

        {/* Integrity promise */}
        <section aria-labelledby="promise" className="mt-16 overflow-hidden rounded-3xl bg-grass-soft p-6 sm:mt-24 sm:p-10">
          <div className="flex items-center gap-2 text-grass">
            <ShieldCheck className="size-5" />
            <p className="text-2xs font-semibold uppercase tracking-[0.14em]">The integrity promise</p>
          </div>
          <h2 id="promise" className="display mt-3 max-w-2xl text-4xl leading-tight sm:text-5xl">
            The AI pick is never for sale.
          </h2>
          <p className="mt-3 max-w-xl text-[0.9375rem] leading-relaxed text-muted">
            Players trust 10IS because the recommendation is theirs. That trust is the product we're offering you — so we protect it.
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              ["Recommendations can't be bought", "No plan, budget or partnership touches what the AI recommends."],
              ["Sponsored means labelled", "A clear “Sponsored” label and who paid, shown only when it fits the player."],
              ["Never replaces or reorders", "At most one placement, always after the pick and its alternatives."],
              ["Paid players see none", "Pro and Club members never see a sponsored placement."],
              ["Aggregated insights", `Players are pseudonymised (a keyed hash), only aggregates leave 10IS, and never a group smaller than ${K_ANONYMITY} players.`],
              ["Real ratings only", "Only verified 10IS bookings can rate a shop or string. We never buy or bury reviews."],
            ].map(([t, d]) => (
              <li key={t} className="flex gap-3">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-grass text-white">
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
                <span>
                  <span className="block font-semibold">{t}</span>
                  <span className="text-sm text-muted">{d}</span>
                </span>
              </li>
            ))}
          </ul>
          <Button asChild variant="secondary" className="mt-8">
            <Link href="/how-we-rank">
              Read how we rank <ArrowRight />
            </Link>
          </Button>
        </section>

        {/* Pricing */}
        <section aria-labelledby="pricing" className="mt-16 sm:mt-24">
          <p className="eyebrow mb-2">Pricing</p>
          <h2 id="pricing" className="display max-w-2xl text-4xl leading-tight sm:text-5xl">
            Start free. Pay when it pays.
          </h2>

          <h3 className="mb-4 mt-10 flex items-center gap-2 text-sm font-semibold text-muted">
            <Wrench className="size-4" /> For stringers
          </h3>
          <div className="grid gap-3 md:grid-cols-3">
            {Object.entries(SHOP_PLANS).map(([id, p]) => (
              <PlanCard key={id} plan={p} featured={id === "pro"} cta={shopCta} href={shopHref} />
            ))}
            <PlanCard plan={SHOP_CLUB} cta="Talk to us" href="mailto:partners@10is.app" />
          </div>

          <h3 className="mb-4 mt-12 flex items-center gap-2 text-sm font-semibold text-muted">
            <Tags className="size-4" /> For string companies and racket brands
          </h3>
          <div className="grid gap-3 md:grid-cols-3">
            {Object.entries(BRAND_PLANS).map(([id, p]) => (
              <PlanCard key={id} plan={p} featured={id === "insights"} cta={brandCta} href={brandHref} />
            ))}
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <Extra icon={<MousePointerClick />} title="Sponsored placements" body={`Pay per click from ${minCpc}, with a monthly cap you set. Impressions are free.`} />
            <Extra icon={<ShoppingBag />} title="Retailers" body="Free listing. You pay an affiliate commission only on the sales 10IS sends you." />
            <Extra icon={<Gift />} title="Sample programmes" body={`The brand pays the install fee; the stringer keeps ${stringerShare}%.`} />
          </div>
        </section>

        {/* FAQ */}
        <section aria-labelledby="faq" className="mx-auto mt-16 max-w-3xl sm:mt-24">
          <h2 id="faq" className="display text-4xl leading-tight sm:text-5xl">
            Questions
          </h2>
          <div className="mt-6 divide-y divide-line border-y border-line">
            {FAQ.map((f) => (
              <FaqItem key={f.q} {...f} />
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="mt-16 rounded-3xl bg-surface p-6 text-center shadow-card ring-1 ring-line/70 sm:mt-24 sm:p-12">
          <h2 className="display mx-auto max-w-xl text-4xl leading-tight sm:text-5xl">Be part of the next restring.</h2>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href={shopHref}>
                <Wrench /> {shopCta}
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href={brandHref}>
                <Tags /> {brandCta}
              </Link>
            </Button>
          </div>
          <p className="mt-6 text-sm text-muted">
            Retailer or something else?{" "}
            <a href="mailto:partners@10is.app" className="font-medium text-ink underline underline-offset-4">
              partners@10is.app
            </a>
          </p>
        </section>
      </Page>
    </div>
  );
}

function PlanCard({
  plan,
  featured,
  cta,
  href,
}: {
  plan: { name: string; price: string; cadence: string; features: readonly string[] };
  featured?: boolean;
  cta: string;
  href: string;
}) {
  return (
    <Card className={cn("flex flex-col p-6", featured && "bg-ink text-bg ring-ink")}>
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold">{plan.name}</h4>
        {featured && <Badge tone="ball">Most chosen</Badge>}
      </div>
      <p className="mt-3 flex items-baseline gap-2">
        <span className="display text-5xl">{plan.price}</span>
        <span className={cn("text-sm", featured ? "text-bg/60" : "text-muted")}>{plan.cadence}</span>
      </p>
      <ul className="mt-5 flex-1 space-y-2.5">
        {plan.features.map((f) => (
          <li key={f} className="flex gap-2.5 text-sm">
            <Check className={cn("mt-0.5 size-4 shrink-0", featured ? "text-ball" : "text-grass")} />
            {f}
          </li>
        ))}
      </ul>
      <Button asChild variant={featured ? "ball" : "outline"} className="mt-6 w-full">
        {href.startsWith("mailto:") ? <a href={href}>{cta}</a> : <Link href={href}>{cta}</Link>}
      </Button>
    </Card>
  );
}

function Extra({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex gap-3 rounded-2xl bg-surface-2/60 p-5">
      <span className="mt-0.5 text-muted [&_svg]:size-5">{icon}</span>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 text-sm text-muted">{body}</p>
      </div>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = React.useState(false);
  const id = React.useId();
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left text-[1.0625rem] font-semibold"
      >
        {q}
        <ChevronDown className={cn("size-5 shrink-0 text-muted transition-transform duration-300", open && "rotate-180")} />
      </button>
      {open && (
        <p id={id} className="-mt-1 pb-5 text-[0.9375rem] leading-relaxed text-muted">
          {a}
        </p>
      )}
    </div>
  );
}
