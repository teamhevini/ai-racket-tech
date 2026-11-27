import * as React from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, CheckCircle2, Circle, Search, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Page } from "@/components/Layout";
import { Badge, Card, EmptyState, PageHeader, Skeleton } from "@/components/ui/surface";
import { Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useMe } from "@/hooks/use-me";
import { formatDate } from "@/lib/format";
import type { UserTier } from "@shared/schema";

interface AdminUser {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  tier: UserTier;
  isAdmin: boolean;
  hasPassword: boolean;
  createdAt: string | null;
}

interface Integration {
  key: string;
  label: string;
  ok: boolean;
  required: boolean;
  note?: string;
}

interface AdminBrand {
  id: number;
  name: string;
  kind: "string" | "racket" | "retailer";
  website: string | null;
  plan: string;
  claimed: boolean;
  ownerEmail: string | null;
  createdAt: string | null;
}

/** Which keys are set on this server. Shows yes/no only, never the values. */
function Integrations() {
  const q = useQuery<Integration[]>({ queryKey: ["/api/admin/integrations"] });
  if (q.isLoading) return <Skeleton className="mb-10 h-48" />;
  const list = q.data ?? [];
  const missing = list.filter((i) => i.required && !i.ok).length;
  return (
    <section className="mb-10" aria-labelledby="integrations">
      <h2 id="integrations" className="mb-1 text-lg font-semibold">
        Launch setup
      </h2>
      <p className="mb-4 text-sm text-muted">
        {missing ? `${missing} required setting${missing > 1 ? "s" : ""} missing on this server.` : "Every required setting is in place."} Values are never shown here.
      </p>
      <Card className="divide-y divide-line">
        {list.map((i) => (
          <div key={i.key} className="flex items-center gap-3 px-4 py-3">
            {i.ok ? (
              <CheckCircle2 className="size-5 shrink-0 text-grass" aria-label="Set" />
            ) : i.required ? (
              <XCircle className="size-5 shrink-0 text-brand" aria-label="Missing" />
            ) : (
              <Circle className="size-5 shrink-0 text-faint" aria-label="Optional, not set" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium leading-snug">{i.label}</p>
              <p className="truncate font-mono text-xs text-muted">
                {i.key}
                {i.note ? ` · ${i.note}` : ""}
                {!i.required && !i.ok ? " · optional" : ""}
              </p>
            </div>
          </div>
        ))}
      </Card>
    </section>
  );
}

/** Brands and retailers waiting to be verified, so sponsored placements and buy links can go live. */
function Businesses() {
  const qc = useQueryClient();
  const q = useQuery<AdminBrand[]>({ queryKey: ["/api/admin/brands"] });
  const [owner, setOwner] = React.useState<Record<number, string>>({});
  const update = useMutation({
    mutationFn: ({ id, body }: { id: number; body: object }) => api("PATCH", `/api/admin/brands/${id}`, body),
    onSuccess: () => {
      toast.success("Brand updated");
      qc.invalidateQueries({ queryKey: ["/api/admin/brands"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });
  const list = q.data ?? [];
  const waiting = list.filter((b) => b.ownerEmail && !b.claimed).length;
  return (
    <section className="mb-10" aria-labelledby="businesses">
      <h2 id="businesses" className="mb-1 text-lg font-semibold">
        Brands and retailers
      </h2>
      <p className="mb-4 text-sm text-muted">
        Verify a company only after they email partners@10is.app from an address on their own website. {waiting ? `${waiting} waiting.` : ""}
      </p>
      {q.isLoading && <Skeleton className="h-32" />}
      {!q.isLoading && !list.length && <p className="text-sm text-muted">No brands yet.</p>}
      <div className="space-y-3">
        {list.map((b) => (
          <Card key={b.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 font-medium">
                  {b.name} {b.claimed && <BadgeCheck className="size-4 text-grass" aria-label="Verified" />}
                </p>
                <p className="break-all text-xs text-muted">
                  <span className="capitalize">{b.kind}</span> · {b.plan} · {b.website ?? "no website"} · {b.ownerEmail ?? "no owner yet"}
                </p>
              </div>
              <Button size="sm" variant={b.claimed ? "outline" : "primary"} onClick={() => update.mutate({ id: b.id, body: { claimed: !b.claimed } })}>
                {b.claimed ? "Unverify" : "Verify"}
              </Button>
            </div>
            {!b.ownerEmail && (
              <form
                className="mt-3 flex flex-wrap gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (owner[b.id]) update.mutate({ id: b.id, body: { ownerEmail: owner[b.id] } });
                }}
              >
                <Input
                  type="email"
                  value={owner[b.id] ?? ""}
                  onChange={(e) => setOwner({ ...owner, [b.id]: e.target.value })}
                  placeholder="Give to account (email)"
                  aria-label={`Owner email for ${b.name}`}
                  className="h-10 min-w-0 flex-1"
                />
                <Button size="sm" type="submit" variant="outline">
                  Assign
                </Button>
              </form>
            )}
          </Card>
        ))}
      </div>
    </section>
  );
}

export default function Admin() {
  const { me, loading: meLoading } = useMe();
  const qc = useQueryClient();
  const [q, setQ] = React.useState("");
  const users = useQuery<AdminUser[]>({ queryKey: ["/api/admin/users"], enabled: me.isAdmin });

  const update = useMutation({
    mutationFn: ({ id, body, kind }: { id: number; body: object; kind: "tier" | "admin" }) => api("PATCH", `/api/admin/users/${id}/${kind}`, body),
    onSuccess: () => {
      toast.success("User updated");
      qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  if (meLoading) return <Page><Skeleton className="h-40" /></Page>;
  if (!me.isAdmin) {
    return (
      <Page narrow>
        <EmptyState icon={<ShieldCheck />} title="Admins only" body="This area is for the 10IS team." action={<Button asChild><Link href="/">Go home</Link></Button>} />
      </Page>
    );
  }

  const list = (users.data ?? []).filter((u) => `${u.email} ${u.firstName ?? ""} ${u.lastName ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  const counts = (users.data ?? []).reduce<Record<string, number>>((acc, u) => ({ ...acc, [u.tier]: (acc[u.tier] ?? 0) + 1 }), {});

  // Plain render helpers (not components) so React doesn't remount them — keyboard focus survives updates.
  const tierSelect = (u: AdminUser) => (
    <Select
      aria-label={`Plan for ${u.email}`}
      value={u.tier}
      className="h-10 min-w-[7rem]"
      onChange={(e) => update.mutate({ id: u.id, kind: "tier", body: { tier: e.target.value } })}
    >
      <option value="free">Free</option>
      <option value="pro">Pro</option>
      <option value="club">Club</option>
    </Select>
  );
  const adminToggle = (u: AdminUser) => (
    <Button
      size="sm"
      variant={u.isAdmin ? "ink" : "outline"}
      disabled={u.id === me.id}
      onClick={() => update.mutate({ id: u.id, kind: "admin", body: { isAdmin: !u.isAdmin } })}
    >
      {u.isAdmin ? "Admin" : "Make admin"}
    </Button>
  );

  return (
    <Page>
      <PageHeader eyebrow="Admin" title="Run 10IS" description="Launch setup, business verification and members." />
      <Integrations />
      <Businesses />
      <h2 className="mb-1 text-lg font-semibold">Members</h2>
      <p className="mb-4 text-sm text-muted">{`${users.data?.length ?? 0} accounts · ${counts.club ?? 0} Club · ${counts.pro ?? 0} Pro · ${counts.free ?? 0} Free`}</p>
      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email" className="pl-11" aria-label="Search members" />
      </div>

      {users.isLoading && <Skeleton className="h-64" />}

      {/* Phone: cards */}
      <div className="space-y-3 md:hidden">
        {list.map((u) => (
          <Card key={u.id} className="p-4">
            <p className="truncate font-medium">{u.email}</p>
            <p className="text-xs text-muted">
              {[u.firstName, u.lastName].filter(Boolean).join(" ") || "No name"} · joined {formatDate(u.createdAt)}
              {!u.hasPassword && " · no password"}
            </p>
            <div className="mt-3 flex items-center gap-2">
              {tierSelect(u)}
              {adminToggle(u)}
            </div>
          </Card>
        ))}
      </div>

      {/* Desktop: table */}
      <Card className="hidden overflow-hidden md:block">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Member</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Role</th>
            </tr>
          </thead>
          <tbody>
            {list.map((u) => (
              <tr key={u.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <p className="font-medium">{u.email}</p>
                  <p className="text-xs text-muted">
                    {[u.firstName, u.lastName].filter(Boolean).join(" ") || "—"}
                    {!u.hasPassword && <Badge className="ml-2">no password</Badge>}
                  </p>
                </td>
                <td className="px-4 py-3 text-muted">{formatDate(u.createdAt)}</td>
                <td className="px-4 py-3">{tierSelect(u)}</td>
                <td className="px-4 py-3">{adminToggle(u)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {!users.isLoading && list.length === 0 && <p className="mt-6 text-sm text-muted">No members match “{q}”.</p>}
    </Page>
  );
}
