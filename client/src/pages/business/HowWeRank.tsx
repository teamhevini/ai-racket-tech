import { Link } from "wouter";
import { Mail, ShieldCheck } from "lucide-react";
import { Page } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/surface";
import { proseClass } from "@/components/ui/prose";
import { K_ANONYMITY, SAMPLE_PLATFORM_FEE_PCT } from "@shared/tiers";

const PARTNERS = "partners@10is.app";

export default function HowWeRank() {
  return (
    <Page narrow className="pb-16">
      <div className="flex flex-col items-center text-center">
        <span className="grid size-16 place-items-center rounded-full bg-grass-soft text-grass">
          <ShieldCheck className="size-8" />
        </span>
        <p className="eyebrow mt-6">How we rank</p>
        <h1 className="display mt-3 text-5xl leading-[1.02] sm:text-6xl">
          What's paid for, what isn't, and <em className="text-brand">how you can tell.</em>
        </h1>
        <p className="mt-5 max-w-lg text-[0.9375rem] leading-relaxed text-muted">
          10IS makes money from businesses as well as players. This page explains, in plain English, exactly where that money does and doesn't
          reach.
        </p>
      </div>

      <article className={`${proseClass} mt-12`}>
        <h2>Your recommendation</h2>
        <p>
          When you ask for a string setup, our AI technician works from your racket, your game, your arm and your current strings. It does not
          see which brands pay us, which retailers pay commission, or which shops are on a paid plan.
        </p>
        <p>
          <strong>No one can pay to change it.</strong> Your recommendation — the primary setup and the “Also worth trying” alternatives — is
          generated and saved before anything commercial is looked up. The sponsored slot is a separate request that reads a frozen copy of your
          result and has no way to write to it.
        </p>

        <h2>The sponsored slot</h2>
        <p>Some string companies pay to show one string to players it genuinely suits. A placement only appears when all of this is true:</p>
        <ul>
          <li>The string passes the same safety checks as your setup — for example, no stiff polyester for a player with arm trouble.</li>
          <li>It's a type of string the technician itself recommended for you, and it isn't your own pick sold back to you.</li>
          <li>It scores at least 70 out of 100 for fit with your game and your recommendation.</li>
          <li>The campaign has budget left this month. Brands can only narrow who sees it, never widen the fit check.</li>
          <li>We've verified the brand is who it says it is, so nobody can advertise under a lookalike name.</li>
        </ul>
        <p>
          When one qualifies, you see <strong>at most one per setup</strong>, shown <strong>after</strong> your recommendation and its
          alternatives, never above or inside them. It is labelled <strong>“Sponsored”</strong> with the name of the company that paid, and
          “Why am I seeing this?” shows the reasons it qualified. Brands pay per click, not per view.
        </p>
        <p>
          <strong>Pro and Club members never see sponsored placements.</strong>
        </p>

        <h2>Where-to-buy links</h2>
        <p>
          When we show where to buy a string, some links are affiliate links: if you buy, the retailer may pay 10IS a commission. It costs you
          nothing extra. Offers are sorted by stock and then price, cheapest first — never by commission — and every outbound link is marked{" "}
          <code>rel="sponsored"</code> so search engines know too. The disclosure appears next to the links every time. Only retailers we've verified can list
          offers, and every link must go to their own website.
        </p>

        <h2>Sample programmes</h2>
        <p>
          A brand can fund free restrings with its string at partner shops. These are always labelled as brand-funded samples on the shop page
          and in the booking. The brand pays the install fee; the stringer keeps {100 - SAMPLE_PLATFORM_FEE_PCT}% and 10IS keeps{" "}
          {SAMPLE_PLATFORM_FEE_PCT}%. Installs and ratings from free samples are tagged and kept out of a string's organic ratings and funnel; brands see
          them separately in their sample results, so a free set can't quietly inflate a score.
        </p>

        <h2>Shops in the directory</h2>
        <p>
          The 10IS shop directory is not ordered by payment. Shop Pro is a toolset — unlimited bookings, history, insights — not a ranking
          boost. The “Verified shop” badge marks shops on Shop Pro; it's a badge, not a boost, and never changes the order.
        </p>

        <h2>Reviews and ratings</h2>
        <p>
          Only players with a verified 10IS booking can rate a shop, and only once the racket is ready. String ratings come from those same
          verified bookings and are shown only once at least {K_ANONYMITY} different players have rated. We never buy reviews, never offer
          anything in exchange for a rating, and never suppress or edit negative ones.
        </p>

        <h2>Your data</h2>
        <p>
          Brands and shops on paid plans can see insights — how often a string is recommended, who re-strings with it, how it's rated. These are
          built from pseudonymised data: each player is a keyed hash rather than a name or account, which is still personal data under GDPR, so
          it never leaves 10IS. Brands only see aggregates, and any figure, including a single week on a chart, is hidden unless it comes from
          at least {K_ANONYMITY} different players. We do not sell personal data. A stringer only sees your racket's string history if you let them, per booking. See our{" "}
          <Link href="/privacy">privacy policy</Link> for the full picture.
        </p>

        <h2>The rules we follow</h2>
        <p>
          We design these disclosures to meet the US FTC Endorsement Guides and the FTC's guidance on native advertising — paid placements must
          be clear and conspicuous, and material connections disclosed — as well as the EU and UK rules that require platforms to disclose
          paid ranking and the main parameters that determine ranking (including the EU Omnibus Directive and the UK's consumer protection
          rules). If you think we've fallen short, tell us.
        </p>
      </article>

      <Card className="mt-10 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="display text-2xl">Questions or concerns?</h2>
          <p className="mt-1 text-sm text-muted">Players, brands and shops can reach the partnerships team directly.</p>
        </div>
        <Button asChild variant="secondary">
          <a href={`mailto:${PARTNERS}`}>
            <Mail /> {PARTNERS}
          </a>
        </Button>
      </Card>
    </Page>
  );
}
