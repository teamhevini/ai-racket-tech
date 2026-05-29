import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import signatureLogo from "@/assets/Hevini_08_Signature.png";

export default function About() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      {/* Logo + headline */}
      <div className="flex flex-col items-center text-center mb-12">
        <img
          src={signatureLogo}
          alt="10IS"
          className="h-16 w-16 object-contain mb-5"
        />
        <h1
          className="font-display font-black text-3xl sm:text-4xl text-court-white mb-3"
          style={{ letterSpacing: "0.06em" }}
        >
          ABOUT 10IS
        </h1>
        <p className="text-net-grey text-base max-w-lg leading-relaxed">
          The AI-powered string recommendation engine built by Hevini Sporting.
        </p>
      </div>

      <div className="space-y-10 text-net-grey text-sm leading-relaxed">
        <section>
          <h2 className="text-court-white font-bold text-base mb-3 uppercase" style={{ letterSpacing: "0.08em" }}>
            What is 10IS?
          </h2>
          <p className="mb-3">
            10IS is an AI-powered string recommendation engine for tennis players of all levels. Too many players string their racket the same way every time — not because it's optimal, but because they don't know where to start.
          </p>
          <p>
            10IS changes that. Answer a few questions about your racket, playing style, swing speed, and injury history, and 10IS generates a personalised string setup recommendation in seconds — explaining the reasoning behind every choice.
          </p>
        </section>

        <section>
          <h2 className="text-court-white font-bold text-base mb-3 uppercase" style={{ letterSpacing: "0.08em" }}>
            Our Mission
          </h2>
          <p
            className="text-court-white font-bold text-xl border-l-2 border-hevini-red pl-4"
            style={{ letterSpacing: "0.02em" }}
          >
            Making string selection simple for every player.
          </p>
          <p className="mt-4">
            String selection is one of the most impactful — and most overlooked — aspects of tennis equipment. The right strings can improve power, comfort, and control. The wrong strings can aggravate injuries and make the game less enjoyable.
          </p>
          <p className="mt-3">
            We believe every player deserves access to the same knowledge that tour-level players and their coaches use. 10IS puts that knowledge in your pocket.
          </p>
        </section>

        <section>
          <h2 className="text-court-white font-bold text-base mb-3 uppercase" style={{ letterSpacing: "0.08em" }}>
            Hevini Sporting
          </h2>
          <p className="mb-3">
            10IS is built and operated by Hevini Sporting — a sporting goods company focused on bringing better tools and education to tennis players worldwide.
          </p>
          <p>
            We're a small, passionate team. If you have feedback, a question, or just want to talk tennis, we'd love to hear from you.
          </p>
        </section>

        <section className="border border-[#1A1A1A] rounded-[4px] p-6 bg-[#0D0D0D]">
          <h2 className="text-court-white font-bold text-base mb-3 uppercase" style={{ letterSpacing: "0.08em" }}>
            Get in Touch
          </h2>
          <p className="mb-4">
            Questions, feedback, or partnership enquiries — reach us at:
          </p>
          <a
            href="mailto:contact@hevini.com"
            className="text-hevini-red font-bold text-base hover:underline"
          >
            contact@hevini.com
          </a>
        </section>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link href="/onboarding">
            <Button
              className="w-full sm:w-auto h-11 px-6 bg-hevini-red hover:bg-hevini-red-dark text-white rounded-[2px] text-xs font-bold uppercase border-0"
              style={{ letterSpacing: "0.1em" }}
            >
              GET YOUR RECOMMENDATION
            </Button>
          </Link>
          <Link href="/pricing">
            <Button
              variant="outline"
              className="w-full sm:w-auto h-11 px-6 rounded-[2px] text-xs font-bold uppercase border-[#333] text-net-grey hover:border-court-white hover:text-court-white"
              style={{ letterSpacing: "0.1em" }}
            >
              SEE PRICING
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
