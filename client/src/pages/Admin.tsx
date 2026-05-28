import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useUser } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";

interface AdminUser {
  id: number;
  email: string;
  tier: "free" | "pro" | "club";
  isAdmin: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export default function Admin() {
  const [, navigate] = useLocation();
  const { isAdmin, loading } = useUser();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);

  useEffect(() => {
    if (!loading && !isAdmin) navigate("/");
  }, [loading, isAdmin, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/admin/users", { credentials: "include" })
      .then((r) => r.json())
      .then(setUsers)
      .catch(console.error)
      .finally(() => setFetching(false));
  }, [isAdmin]);

  async function changeTier(id: number, tier: AdminUser["tier"]) {
    setSaving(id);
    await fetch(`/api/admin/users/${id}/tier`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ tier }),
    });
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, tier } : u)));
    setSaving(null);
  }

  async function toggleAdmin(id: number, current: boolean) {
    setSaving(id);
    await fetch(`/api/admin/users/${id}/admin`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ isAdmin: !current }),
    });
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, isAdmin: !current } : u)));
    setSaving(null);
  }

  const proCount = users.filter((u) => u.tier === "pro").length;
  const clubCount = users.filter((u) => u.tier === "club").length;
  const revenueEstimate = proCount * 4.99 + clubCount * 1.99;

  if (loading || !isAdmin) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-8">
        <p
          className="text-[11px] font-bold text-hevini-red uppercase mb-1"
          style={{ letterSpacing: "0.15em" }}
        >
          Admin
        </p>
        <h1
          className="text-3xl font-black text-court-white uppercase"
          style={{ letterSpacing: "0.08em" }}
        >
          Dashboard
        </h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        {[
          { label: "Total Users", value: users.length },
          { label: "Pro Users", value: proCount },
          { label: "Club Users", value: clubCount },
          {
            label: "Est. Revenue",
            value: `$${revenueEstimate.toFixed(2)}`,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-[4px] p-4"
          >
            <p
              className="text-[10px] font-bold text-net-grey uppercase mb-1"
              style={{ letterSpacing: "0.12em" }}
            >
              {stat.label}
            </p>
            <p className="text-2xl font-black text-court-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* User Table */}
      <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-[4px] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1A1A1A]">
          <h2
            className="text-xs font-bold text-court-white uppercase"
            style={{ letterSpacing: "0.1em" }}
          >
            All Users
          </h2>
        </div>

        {fetching ? (
          <div className="p-8 text-center text-net-grey text-sm">Loading...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-net-grey text-sm">No users yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1A1A1A]">
                  {["Email", "Tier", "Admin", "Joined", "Last Active", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-left text-[10px] font-bold text-net-grey uppercase"
                      style={{ letterSpacing: "0.1em" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-[#1A1A1A] last:border-0 hover:bg-[#111] transition-colors"
                  >
                    <td className="px-4 py-3 text-court-white font-medium truncate max-w-[200px]">
                      {user.email}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={user.tier}
                        disabled={saving === user.id}
                        onChange={(e) => changeTier(user.id, e.target.value as AdminUser["tier"])}
                        className="bg-[#1A1A1A] border border-[#2A2A2A] text-court-white text-xs rounded-[2px] px-2 py-1 cursor-pointer focus:outline-none focus:border-hevini-red"
                      >
                        <option value="free">Free</option>
                        <option value="pro">Pro</option>
                        <option value="club">Club</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-[2px] ${
                          user.isAdmin
                            ? "bg-hevini-red/20 text-hevini-red"
                            : "bg-[#1A1A1A] text-net-grey"
                        }`}
                        style={{ letterSpacing: "0.08em" }}
                      >
                        {user.isAdmin ? "Admin" : "User"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-net-grey text-xs">
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-net-grey text-xs">
                      {user.updatedAt
                        ? new Date(user.updatedAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={saving === user.id}
                        onClick={() => toggleAdmin(user.id, user.isAdmin)}
                        className="h-7 px-3 text-[10px] font-bold uppercase rounded-[2px] border-[#333] text-net-grey hover:border-court-white hover:text-court-white"
                        style={{ letterSpacing: "0.08em" }}
                      >
                        {user.isAdmin ? "Revoke Admin" : "Make Admin"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[10px] text-net-grey mt-4" style={{ letterSpacing: "0.05em" }}>
        Revenue estimate: {proCount} Pro × $4.99 + {clubCount} Club × $1.99/mo
      </p>
    </div>
  );
}
