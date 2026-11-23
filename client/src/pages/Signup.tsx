import * as React from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { api } from "@/lib/api";
import type { Me } from "@/lib/types";
import { useRefreshMe } from "@/hooks/use-me";
import { AuthShell, PasswordInput, safeNext } from "./Login";
import { cn } from "@/lib/utils";

export default function Signup() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const refreshMe = useRefreshMe();
  const next = safeNext(search, "/bag");
  const [v, setV] = React.useState({ firstName: "", lastName: "", email: "", password: "" });
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV((s) => ({ ...s, [k]: e.target.value }));
  const longEnough = v.password.length >= 8;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!longEnough) return setError("Use at least 8 characters for your password.");
    setLoading(true);
    try {
      const me = await api<Me>("POST", "/api/auth/signup", v);
      await refreshMe(me);
      navigate(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create your account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Join 10IS"
      subtitle="Free forever for up to 3 rackets. Restring reminders included."
      footer={
        <>
          Already have an account?{" "}
          <Link href={`/login${next !== "/bag" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-ink underline-offset-4 hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name">
            <Input autoComplete="given-name" value={v.firstName} onChange={set("firstName")} required autoFocus />
          </Field>
          <Field label="Last name">
            <Input autoComplete="family-name" value={v.lastName} onChange={set("lastName")} required />
          </Field>
        </div>
        <Field label="Email">
          <Input type="email" inputMode="email" autoComplete="email" value={v.email} onChange={set("email")} placeholder="you@example.com" required />
        </Field>
        <Field
          label="Password"
          hint={
            <span className={cn("inline-flex items-center gap-1", longEnough && "text-grass")}>
              <Check className="size-3.5" /> At least 8 characters
            </span>
          }
        >
          <PasswordInput autoComplete="new-password" value={v.password} onChange={set("password")} required minLength={8} />
        </Field>
        {error && (
          <p className="rounded-xl bg-brand-soft px-4 py-3 text-sm text-brand" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Create account
        </Button>
        <p className="text-center text-xs text-muted">
          By joining you agree to our <Link href="/terms" className="underline">Terms</Link> and{" "}
          <Link href="/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </form>
    </AuthShell>
  );
}
