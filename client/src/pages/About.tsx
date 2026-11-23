import { Link } from "wouter";
import { ArrowRight, Mail as MailIcon } from "lucide-react";
import { Page } from "@/components/Layout";
import { Mark } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/surface";
import { SUPPORT_EMAIL } from "@shared/contact";
import { proseClass } from "@/components/ui/prose";

export default function About() {
  return (
    <Page narrow className="pb-16">
      <div className="flex flex-col items-center text-center">
        <Mark className="size-16" />
        <p className="eyebrow mt-6">About 10IS</p>
        <h1 className="display mt-3 text-5xl leading-[1.02] sm:text-6xl">
          Making string selection simple for <em className="text-brand">every</em> player.
        </h1>
        <p className="mt-5 max-w-lg text-[0.9375rem] leading-relaxed text-muted">
          The AI-powered string recommendation engine — and racket notebook — built by Hevini Sporting.
        </p>
      </div>

      <article className={`${proseClass} mt-12`}>
        <h2>What is 10IS?</h2>
        <p>
          10IS is an AI-powered string recommendation engine for tennis players of all levels. Too many players string their racket the same
          way every time — not because it's optimal, but because they don't know where to start.
        </p>
        <p>
          10IS changes that. Answer a few questions about your racket, playing style, swing speed and injury history, and 10IS generates a
          personalised string setup recommendation in seconds — explaining the reasoning behind every choice.
        </p>
        <p>
          Then it keeps track for you. Log every restring against each racket in your bag, keep your favourite stringers one tap away, and
          get reminded when your strings are past their best — worked out from how much you actually play.
        </p>

        <h2>Our mission</h2>
        <blockquote className="not-italic">
          <p className="display !text-2xl !text-ink">Making string selection simple for every player.</p>
        </blockquote>
        <p>
          String selection is one of the most impactful — and most overlooked — aspects of tennis equipment. The right strings can improve
          power, comfort and control. The wrong strings can aggravate injuries and make the game less enjoyable.
        </p>
        <p>
          We believe every player deserves access to the same knowledge that tour-level players and their coaches use. 10IS puts that
          knowledge in your pocket.
        </p>

        <h2>Hevini Sporting</h2>
        <p>
          10IS is built and operated by Hevini Sporting — a sporting goods company focused on bringing better tools and education to tennis
          players worldwide.
        </p>
        <p>We're a small, passionate team. If you have feedback, a question, or just want to talk tennis, we'd love to hear from you.</p>
      </article>

      <Card className="mt-10 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="display text-2xl">Get in touch</h2>
          <p className="mt-1 text-sm text-muted">Questions, feedback, or partnership enquiries.</p>
        </div>
        <Button asChild variant="secondary">
          <a href={`mailto:${SUPPORT_EMAIL}`}>
            <MailIcon /> {SUPPORT_EMAIL}
          </a>
        </Button>
      </Card>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/setup">
            Get your recommendation <ArrowRight />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/pricing">See pricing</Link>
        </Button>
      </div>
    </Page>
  );
}
