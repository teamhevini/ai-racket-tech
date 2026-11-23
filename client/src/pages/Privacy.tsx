import { Page } from "@/components/Layout";
import { SUPPORT_EMAIL } from "@shared/contact";
import { proseClass } from "@/components/ui/prose";


const Mail = () => <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>;
const Ext = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} target="_blank" rel="noopener noreferrer">
    {children}
  </a>
);

export default function Privacy() {
  return (
    <Page narrow className="pb-16">
      <p className="eyebrow mb-3">Legal</p>
      <h1 className="display text-5xl leading-none sm:text-6xl">Privacy policy</h1>
      <p className="mt-4 text-sm text-muted">Updated November 2026 · Hevini Sporting</p>

      <article className={`${proseClass} mt-10`}>
        <h2>1. Information we collect</h2>
        <p>When you use 10IS we collect the following information:</p>
        <ul>
          <li>
            <strong>Account data</strong> — your email address, first name and last name when you sign up.
          </li>
          <li>
            <strong>Racket &amp; play data</strong> — the racket you select, your playstyle preferences, swing speed, injury history and
            stringing history that you enter when getting a setup.
          </li>
          <li>
            <strong>Your bag and racket history</strong> — rackets you save, and each restring you log (date, strings, tension, gauge,
            price, rating and notes).
          </li>
          <li>
            <strong>Saved stringers</strong> — names, addresses and any contact details (phone, email, website) and notes you choose to
            save about your stringers.
          </li>
          <li>
            <strong>Payment data</strong> — billing is handled entirely by Stripe. We never see or store your card number. We store only a
            Stripe customer ID and subscription ID to manage your plan.
          </li>
          <li>
            <strong>Usage data</strong> — pages visited and features used, collected via Umami Analytics (privacy-first, no personal
            identifiers) and Google Analytics.
          </li>
          <li>
            <strong>Location data</strong> — if you use the stringer search, your browser may share your approximate location. This is
            used only to find nearby stringers and is not stored.
          </li>
        </ul>

        <h2>2. How we use your information</h2>
        <ul>
          <li>To generate your AI-powered string recommendations.</li>
          <li>To keep your racket history and calculate when each racket is due a restring.</li>
          <li>To email you restring reminders — only if you turn reminder emails on. In-app reminders and calendar files need no email.</li>
          <li>To manage your account and plan (Free, Pro or Club).</li>
          <li>To improve the recommendation engine and overall service.</li>
          <li>To process payments securely through Stripe.</li>
        </ul>
        <p>We do not sell your data to third parties. We do not use your data for advertising.</p>

        <h2>3. Data storage</h2>
        <p>
          Your data is stored in a PostgreSQL database hosted on Railway (US-based servers). Sessions are signed and stored server-side.
          Passwords are hashed using bcrypt and are never stored in plain text.
        </p>

        <h2>4. Third-party services</h2>
        <ul>
          <li>
            <strong>Stripe</strong> — payment processing. Subject to <Ext href="https://stripe.com/privacy">Stripe's Privacy Policy</Ext>.
          </li>
          <li>
            <strong>OpenAI</strong> — AI recommendations and the Club chat. Your racket and playstyle inputs, and chat messages, are sent to
            OpenAI to generate replies. Subject to <Ext href="https://openai.com/policies/privacy-policy">OpenAI's Privacy Policy</Ext>.
          </li>
          <li>
            <strong>Google Maps</strong> — stringer search results. Location queries are sent to the Google Places API. Subject to{" "}
            <Ext href="https://policies.google.com/privacy">Google's Privacy Policy</Ext>.
          </li>
          <li>
            <strong>Resend</strong> — delivers restring reminder emails if you turn them on. Only your email address, name and the
            rackets that are due are shared.
          </li>
          <li>
            <strong>Umami Analytics</strong> — privacy-first, GDPR-compliant analytics with no cookies or personal identifiers.
          </li>
          <li>
            <strong>Google Analytics (GA4)</strong> — aggregate usage analytics. Subject to{" "}
            <Ext href="https://policies.google.com/privacy">Google's Privacy Policy</Ext>.
          </li>
        </ul>

        <h2>5. Your rights</h2>
        <p>You can:</p>
        <ul>
          <li>
            <strong>Download your data</strong> — export everything (profile, rackets, racket history, stringers and recommendations) as a
            file from your Account page at any time.
          </li>
          <li>
            <strong>Delete your account</strong> — from your Account page. This permanently removes all your data, and you get a copy of
            it first.
          </li>
          <li>
            <strong>Opt out of reminders</strong> — turn reminder emails off in your Account settings, or reminders off for any single
            racket, at any time.
          </li>
          <li>
            <strong>Ask us anything</strong> — email <Mail /> and we'll help.
          </li>
        </ul>

        <h2>6. Cookies</h2>
        <p>
          We use a single session cookie to keep you logged in. It is HTTP-only, secure, and expires after 30 days. We also remember your
          day/night theme choice in your browser. We do not use advertising or tracking cookies.
        </p>

        <h2>7. Children's privacy</h2>
        <p>
          10IS is not directed at children under 13. We do not knowingly collect personal information from children. If you believe we
          have collected information from a child, please contact us immediately.
        </p>

        <h2>8. Contact</h2>
        <p>
          Questions about this policy? Contact us at <Mail />.
        </p>
      </article>
    </Page>
  );
}
