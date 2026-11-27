import { Page } from "@/components/Layout";
import { SUPPORT_EMAIL } from "@shared/contact";
import { proseClass } from "@/components/ui/prose";

const Mail = () => <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>;

export default function Terms() {
  return (
    <Page narrow className="pb-16">
      <p className="eyebrow mb-3">Legal</p>
      <h1 className="display text-5xl leading-none sm:text-6xl">Terms of service</h1>
      <p className="mt-4 text-sm text-muted">Updated November 2026 · Hevini Sporting</p>

      <article className={`${proseClass} mt-10`}>
        <h2>1. Acceptance</h2>
        <p>
          By accessing or using 10IS (“the Service”), you agree to be bound by these Terms of Service. If you do not agree, do not use the
          Service. These terms apply to all visitors, users and others who access 10IS.
        </p>

        <h2>2. Description of service</h2>
        <p>10IS is an AI-powered tennis string recommendation engine operated by Hevini Sporting. The Service provides:</p>
        <ul>
          <li>Personalised string setup recommendations based on your racket, playstyle and physical profile.</li>
          <li>“My bag” — a record of your rackets and the full history of every restring you log.</li>
          <li>Restring reminders, shown in the app, as calendar files, and optionally by email.</li>
          <li>A list of your saved stringers, plus a stringer locator tool.</li>
          <li>A searchable database of tennis rackets.</li>
          <li>An AI chat assistant (Club plan only).</li>
          <li>Booking a restring with a stringer who has a 10IS shop page.</li>
          <li>Business tools for stringers, retailers and string brands (see section 6).</li>
        </ul>
        <p>
          Recommendations and reminder dates are generated automatically and are for informational purposes only. They do not constitute
          professional sports science or medical advice. Always consult a qualified stringer or coach before making equipment changes,
          particularly if you have an injury.
        </p>

        <h2>3. Accounts</h2>
        <p>
          You must provide a valid email address to create an account, and you need an account to buy a paid plan. You are responsible for
          maintaining the confidentiality of your password. You may not share your account or use another person's account without
          permission.
        </p>
        <p>
          We reserve the right to suspend or terminate accounts that violate these terms, engage in abusive behaviour, or attempt to
          circumvent plan limits.
        </p>

        <h2>4. Plans</h2>
        <ul>
          <li>
            <strong>Free</strong> — AI string setups, up to 3 rackets in your bag with your latest 3 restrings shown for each, restring
            reminders, saved stringers, and a preview of stringer search and the racket catalog. No payment required.
          </li>
          <li>
            <strong>Pro ($6.99/month or $49/year)</strong> — Unlimited rackets, full restring history for every racket, every stringer search
            result, the full racket catalog, shareable setup links and no sponsored placements. Billed via Stripe; cancel anytime and keep
            access to the end of the period. Pro bought earlier as a one-time purchase stays active for good.
          </li>
          <li>
            <strong>Club ($12.99/month or $99/year)</strong> — Everything in Pro plus the AI racket technician chat. Billed via Stripe. Cancel
            anytime from your Account page or by contacting us.
          </li>
          <li>
            <strong>Pro Lifetime ($149 once)</strong> — Everything in Pro with no renewal, while founder pricing lasts.
          </li>
        </ul>
        <p>Prices are in USD and may be subject to applicable taxes.</p>

        <h2>5. Refunds</h2>
        <ul>
          <li>
            <strong>Subscriptions (Pro, Club and business plans)</strong> — You may cancel at any time. Cancellation takes effect at the end
            of the current billing period. No partial refunds are issued for unused time.
          </li>
          <li>
            <strong>One-time purchases (Pro Lifetime, earlier one-time Pro)</strong> — All sales are final.
          </li>
        </ul>
        <p>
          If you believe you were charged in error, contact us at <Mail /> within 7 days and we will review your case.
        </p>

        <h2>6. Stringers, shops and brands</h2>
        <p>These extra terms apply if you use 10IS for a business.</p>
        <ul>
          <li>
            <strong>Your listing</strong> — you are responsible for keeping your business details, prices, opening hours and catalogue
            accurate. You must be entitled to use any name, logo or product image you upload. We may remove listings that are misleading or
            that we cannot verify.
          </li>
          <li>
            <strong>Bookings</strong> — a booking is an agreement between the player and the shop. The shop sets its own prices, does the
            work and takes payment directly. 10IS is not a party to that agreement and is not responsible for the work, the strings or the
            racket. Shops must use player details only to handle that booking.
          </li>
          <li>
            <strong>Racket history</strong> — when a player shares their history with you, use it only to service their racket. Do not
            copy it out of 10IS for marketing.
          </li>
          <li>
            <strong>Business plans</strong> — features and limits are shown on the pricing page at the time you subscribe. Prices are in
            USD, billed by Stripe, and may change with at least 30 days’ notice before your next renewal.
          </li>
          <li>
            <strong>Sponsored placements</strong> — sponsored suggestions are always labelled “Sponsored”, shown only to players whose
            profile the string fits, and never shown to paying players. Paying for a placement never changes, reorders or removes a
            player’s own recommendation, and never buys a better rating or review. Clicks are billed at the price you set, which may not be
            lower than the minimum shown in your campaign settings. We filter clicks we believe are invalid and do not charge for them.
          </li>
          <li>
            <strong>Insights</strong> — brand insights are aggregated and anonymous. You must not try to identify any player from them.
          </li>
          <li>
            <strong>Sample programmes</strong> — the brand supplies the strings and pays the agreed amount per completed sample job; 10IS
            keeps the platform fee shown when the programme is created. Players must be told a string came from a sample programme.
          </li>
          <li>
            <strong>Affiliate links</strong> — some links to retailers earn 10IS a commission. They are marked and never affect which
            string we recommend.
          </li>
        </ul>

        <h2>7. Intellectual property</h2>
        <p>
          All content, branding and software on 10IS — including the Hevini and 10IS trademarks, logos and recommendation output — are
          owned by Hevini Sporting or its licensors. You may not reproduce, distribute or create derivative works without written
          permission. The racket history, notes and stringer details you enter remain yours.
        </p>

        <h2>8. Disclaimer of warranties</h2>
        <p>
          The Service is provided “as is” without warranties of any kind. We do not guarantee that recommendations or reminders will be
          accurate, complete, timely or suitable for your specific situation. Use of the Service is at your own risk.
        </p>

        <h2>9. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, Hevini Sporting shall not be liable for any indirect, incidental or consequential damages
          arising from your use of the Service, including equipment damage or personal injury resulting from following a recommendation.
        </p>

        <h2>10. Governing law</h2>
        <p>
          These terms are governed by the laws of the State of Maryland, United States, without regard to conflict of law principles. Any
          disputes shall be resolved in the courts of Maryland.
        </p>

        <h2>11. Changes to terms</h2>
        <p>
          We may update these terms from time to time. We will notify registered users by email of material changes. Continued use of the
          Service after changes constitutes acceptance of the updated terms.
        </p>

        <h2>12. Contact</h2>
        <p>
          Questions about these terms? Contact us at <Mail />.
        </p>
      </article>
    </Page>
  );
}
