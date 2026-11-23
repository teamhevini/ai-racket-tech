import * as React from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, ShieldCheck } from "lucide-react";
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
      <PageHeader eyebrow="Admin" title="Members" description={`${users.data?.length ?? 0} accounts · ${counts.club ?? 0} Club · ${counts.pro ?? 0} Pro · ${counts.free ?? 0} Free`} />
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
