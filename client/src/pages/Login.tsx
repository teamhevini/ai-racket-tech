import * as React from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Card } from "@/components/ui/surface";
import { Mark } from "@/components/Logo";
import { api } from "@/lib/api";
import type { Me } from "@/lib/types";
import { useRefreshMe } from "@/hooks/use-me";

/** Only allow same-site relative redirects. */
export function safeNext(search: string, fallback = "/") {
  const next = new URLSearchParams(search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

export function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = React.useState(false);
  return (
    <div className="relative">
      <Input {...props} type={show ? "text" : "password"} className="pr-12" />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[78vh] w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8 text-center">
        <Mark className="mx-auto mb-5 size-12" />
        <h1 className="display text-[2.75rem] leading-none">{title}</h1>
        <p className="mt-3 text-[0.9375rem] text-muted">{subtitle}</p>
      </div>
      <Card className="p-6 sm:p-8">{children}</Card>
      <p className="mt-6 text-center text-sm text-muted">{footer}</p>
    </div>
  );
}

export default function Login() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const refreshMe = useRefreshMe();
  const next = safeNext(search);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const me = await api<Me>("POST", "/api/auth/login", { email, password });
      await refreshMe(me);
      navigate(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't log you in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Your rackets, strings and stringers are waiting."
      footer={
        <>
          New to 10IS?{" "}
          <Link href={`/signup${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-ink underline-offset-4 hover:underline">
            Create a free account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Email">
          <Input type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoFocus />
        </Field>
        <Field label="Password">
          <PasswordInput autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        {error && (
          <p className="rounded-xl bg-brand-soft px-4 py-3 text-sm text-brand" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Log in
        </Button>
      </form>
    </AuthShell>
  );
}
