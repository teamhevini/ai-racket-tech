export default function Privacy() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1
        className="font-display font-black text-3xl text-court-white mb-2"
        style={{ letterSpacing: "0.06em" }}
      >
        PRIVACY POLICY
      </h1>
      <p className="text-net-grey text-sm mb-10">Effective May 2026 · Hevini Sporting</p>

      <div className="space-y-10 text-net-grey text-sm leading-relaxed">
        <section>
          <h2 className="text-court-white font-bold text-base mb-3 uppercase" style={{ letterSpacing: "0.08em" }}>
            1. Information We Collect
          </h2>
          <p className="mb-3">
            When you use 10IS we collect the following information:
          </p>
          <ul className="list-disc list-inside space-y-1.5 ml-2">
            <li><span className="text-court-white font-medium">Account data</span> — your email address, first name, and last name when you sign up.</li>
            <li><span className="text-court-white font-medium">Racket &amp; play data</span> — the racket you select, your playstyle preferences, swing speed, injury history, and stringing history that you enter during onboarding.</li>
            <li><span className="text-court-white font-medium">Payment data</span> — billing is handled entirely by Stripe. We never see or store your card number. We store only a Stripe customer ID and subscription ID to manage your account tier.</li>
            <li><span className="text-court-white font-medium">Usage data</span> — pages visited and features used, collected via Umami Analytics (privacy-first, no personal identifiers) and Google Analytics.</li>
            <li><span className="text-court-white font-medium">Location data</span> — if you use the stringer search, your browser may share your approximate location. This is used only to find nearby stringers and is not stored.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-court-white font-bold text-base mb-3 uppercase" style={{ letterSpacing: "0.08em" }}>
            2. How We Use Your Information
          </h2>
          <ul className="list-disc list-inside space-y-1.5 ml-2">
            <li>To generate your AI-powered string recommendations.</li>
            <li>To manage your account and subscription tier (Free, Pro, or Club).</li>
            <li>To send restringing reminders if you enable that feature in your account.</li>
            <li>To improve the recommendation engine and overall service.</li>
            <li>To process payments securely through Stripe.</li>
          </ul>
          <p className="mt-3">We do not sell your data to third parties. We do not use your data for advertising.</p>
        </section>

        <section>
          <h2 className="text-court-white font-bold text-base mb-3 uppercase" style={{ letterSpacing: "0.08em" }}>
            3. Data Storage
          </h2>
          <p>
            Your data is stored in a PostgreSQL database hosted on Railway (US-based servers). Sessions are encrypted and stored server-side. Passwords are hashed using bcrypt and are never stored in plain text.
          </p>
        </section>

        <section>
          <h2 className="text-court-white font-bold text-base mb-3 uppercase" style={{ letterSpacing: "0.08em" }}>
            4. Third-Party Services
          </h2>
          <ul className="list-disc list-inside space-y-1.5 ml-2">
            <li><span className="text-court-white font-medium">Stripe</span> — payment processing. Subject to <a href="https://stripe.com/privacy" className="text-hevini-red hover:underline" target="_blank" rel="noopener noreferrer">Stripe's Privacy Policy</a>.</li>
            <li><span className="text-court-white font-medium">OpenAI</span> — AI recommendation generation. Your racket and playstyle inputs are sent to OpenAI to generate your recommendation. Subject to <a href="https://openai.com/policies/privacy-policy" className="text-hevini-red hover:underline" target="_blank" rel="noopener noreferrer">OpenAI's Privacy Policy</a>.</li>
            <li><span className="text-court-white font-medium">Google Maps</span> — stringer search results. Location queries are sent to the Google Places API. Subject to <a href="https://policies.google.com/privacy" className="text-hevini-red hover:underline" target="_blank" rel="noopener noreferrer">Google's Privacy Policy</a>.</li>
            <li><span className="text-court-white font-medium">Umami Analytics</span> — privacy-first, GDPR-compliant analytics with no cookies or personal identifiers.</li>
            <li><span className="text-court-white font-medium">Google Analytics (GA4)</span> — aggregate usage analytics. Subject to <a href="https://policies.google.com/privacy" className="text-hevini-red hover:underline" target="_blank" rel="noopener noreferrer">Google's Privacy Policy</a>.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-court-white font-bold text-base mb-3 uppercase" style={{ letterSpacing: "0.08em" }}>
            5. Your Rights
          </h2>
          <p className="mb-3">You can:</p>
          <ul className="list-disc list-inside space-y-1.5 ml-2">
            <li><span className="text-court-white font-medium">Delete your account</span> — from your Account page. This permanently removes all your data.</li>
            <li><span className="text-court-white font-medium">Request a data export</span> — email us at <a href="mailto:contact@hevini.com" className="text-hevini-red hover:underline">contact@hevini.com</a> and we will send you a copy of all data associated with your account.</li>
            <li><span className="text-court-white font-medium">Opt out of reminders</span> — toggle off in your Account settings at any time.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-court-white font-bold text-base mb-3 uppercase" style={{ letterSpacing: "0.08em" }}>
            6. Cookies
          </h2>
          <p>
            We use a single session cookie to keep you logged in. It is HTTP-only, secure, and expires after 30 days of inactivity. We do not use advertising or tracking cookies.
          </p>
        </section>

        <section>
          <h2 className="text-court-white font-bold text-base mb-3 uppercase" style={{ letterSpacing: "0.08em" }}>
            7. Children's Privacy
          </h2>
          <p>
            10IS is not directed at children under 13. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
          </p>
        </section>

        <section>
          <h2 className="text-court-white font-bold text-base mb-3 uppercase" style={{ letterSpacing: "0.08em" }}>
            8. Contact
          </h2>
          <p>
            Questions about this policy? Contact us at{" "}
            <a href="mailto:contact@hevini.com" className="text-hevini-red hover:underline">
              contact@hevini.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
