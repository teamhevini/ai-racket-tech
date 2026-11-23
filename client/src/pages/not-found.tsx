import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <div className="relative mb-8 h-24 w-40" aria-hidden>
        <div className="absolute inset-x-0 bottom-0 h-px bg-line" />
        <div className="absolute bottom-0 left-1/2 h-14 w-px -translate-x-1/2 bg-line" />
        <span className="absolute left-[62%] top-0 size-7 animate-ball-bounce rounded-full bg-ball shadow-[inset_-4px_-4px_0_rgb(0_0_0/0.12)]" />
      </div>
      <p className="eyebrow">404 · Out</p>
      <h1 className="display mt-3 text-5xl leading-none">That one's long.</h1>
      <p className="mt-4 text-[0.9375rem] leading-relaxed text-muted">
        This page doesn't exist. Head back and we'll get you dialled in.
      </p>
      <div className="mt-8 flex gap-3">
        <Button asChild>
          <Link href="/">Go home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/setup">Get a setup</Link>
        </Button>
      </div>
    </div>
  );
}
