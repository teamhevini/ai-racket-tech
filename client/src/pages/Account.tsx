import { useEffect, useState, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { useUser } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Plus, Trash2, Pencil, Check, X, Copy, AlertTriangle, BookOpen, Bookmark } from "lucide-react";

// ─── shared helpers ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h3 className="text-[11px] font-bold text-net-grey uppercase mb-4" style={{ letterSpacing: "0.12em" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5 mb-4">
      <Label className="text-[11px] font-bold uppercase text-net-grey" style={{ letterSpacing: "0.1em" }}>
        {label}
      </Label>
      {children}
    </div>
  );
}

const inputCls = "h-10 rounded-[2px] bg-[#111] border border-[#2A2A2A] text-court-white placeholder:text-[#444] focus-visible:ring-1 focus-visible:ring-hevini-red focus-visible:border-hevini-red text-sm";
const btnPrimary = "h-9 bg-hevini-red hover:bg-hevini-red-dark text-white rounded-[2px] font-bold uppercase border-0 text-xs px-5";
const btnOutline = "h-9 rounded-[2px] border border-[#333] text-net-grey hover:border-court-white hover:text-court-white font-bold uppercase text-xs px-4";

function TierBadge({ tier }: { tier: string }) {
  const paid = tier !== "free";
  return (
    <span
      className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-[2px] ${paid ? "bg-hevini-red text-white" : "bg-[#1A1A1A] text-net-grey border border-[#2A2A2A]"}`}
      style={{ letterSpacing: "0.1em" }}
    >
      {tier}
    </span>
  );
}

function toast(msg: string) {
  const el = document.createElement("div");
  el.textContent = msg;
  el.className = "fixed bottom-24 left-1/2 -translate-x-1/2 bg-[#1A1A1A] border border-[#333] text-court-white text-xs font-bold px-4 py-2 rounded-[2px] z-[9999] uppercase";
  el.style.letterSpacing = "0.08em";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

// ─── Profile Tab ─────────────────────────────────────────────────────────────

function ProfileTab({ profile, onRefresh }: { profile: any; onRefresh: () => void }) {
  const [firstName, setFirstName] = useState(profile?.firstName ?? "");
  const [lastName, setLastName] = useState(profile?.lastName ?? "");
  const [email, setEmail] = useState(profile?.email ?? "");
  const [saving, setSaving] = useState(false);
  const [profileErr, setProfileErr] = useState("");

  const [curPwd, setCurPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [cfmPwd, setCfmPwd] = useState("");
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwdErr, setPwdErr] = useState("");
  const [pwdOk, setPwdOk] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileErr("");
    setSaving(true);
    const res = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ firstName, lastName, email }),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setProfileErr(d.message || "Failed"); return; }
    toast("Profile saved");
    onRefresh();
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdErr(""); setPwdOk(false);
    if (newPwd !== cfmPwd) { setPwdErr("Passwords don't match"); return; }
    if (newPwd.length < 8) { setPwdErr("Min 8 characters"); return; }
    setChangingPwd(true);
    const res = await fetch("/api/account/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ currentPassword: curPwd, newPassword: newPwd }),
    });
    setChangingPwd(false);
    if (!res.ok) { const d = await res.json(); setPwdErr(d.message || "Failed"); return; }
    setPwdOk(true); setCurPwd(""); setNewPwd(""); setCfmPwd("");
  }

  return (
    <div>
      <Section title="Personal Info">
        <form onSubmit={saveProfile}>
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="First Name">
              <Input value={firstName} onChange={e => setFirstName(e.target.value)} className={inputCls} />
            </FieldRow>
            <FieldRow label="Last Name">
              <Input value={lastName} onChange={e => setLastName(e.target.value)} className={inputCls} />
            </FieldRow>
          </div>
          <FieldRow label="Email">
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} />
          </FieldRow>
          {profileErr && <p className="text-hevini-red text-xs mb-3">{profileErr}</p>}
          <Button type="submit" disabled={saving} className={btnPrimary} style={{ letterSpacing: "0.1em" }}>
            {saving ? "SAVING..." : "SAVE CHANGES"}
          </Button>
        </form>
      </Section>

      <Section title="Account Info">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-bold text-net-grey uppercase mb-1" style={{ letterSpacing: "0.1em" }}>Plan</p>
            <TierBadge tier={profile?.tier ?? "free"} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-net-grey uppercase mb-1" style={{ letterSpacing: "0.1em" }}>Member Since</p>
            <p className="text-sm text-court-white">
              {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "—"}
            </p>
          </div>
        </div>
      </Section>

      <Section title="Change Password">
        <form onSubmit={changePassword} className="max-w-sm">
          <FieldRow label="Current Password">
            <div className="relative">
              <Input type={showCur ? "text" : "password"} value={curPwd} onChange={e => setCurPwd(e.target.value)} className={`${inputCls} pr-10`} placeholder="••••••••" />
              <button type="button" onClick={() => setShowCur(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-net-grey hover:text-court-white" tabIndex={-1}>
                {showCur ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </FieldRow>
          <FieldRow label="New Password">
            <div className="relative">
              <Input type={showNew ? "text" : "password"} value={newPwd} onChange={e => setNewPwd(e.target.value)} className={`${inputCls} pr-10`} placeholder="Min 8 characters" />
              <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-net-grey hover:text-court-white" tabIndex={-1}>
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </FieldRow>
          <FieldRow label="Confirm New Password">
            <Input type="password" value={cfmPwd} onChange={e => setCfmPwd(e.target.value)} className={inputCls} placeholder="••••••••" />
          </FieldRow>
          {pwdErr && <p className="text-hevini-red text-xs mb-3">{pwdErr}</p>}
          {pwdOk && <p className="text-green-400 text-xs mb-3">Password updated successfully</p>}
          <Button type="submit" disabled={changingPwd} className={btnPrimary} style={{ letterSpacing: "0.1em" }}>
            {changingPwd ? "UPDATING..." : "UPDATE PASSWORD"}
          </Button>
        </form>
      </Section>
    </div>
  );
}

// ─── My Rackets Tab ───────────────────────────────────────────────────────────

function RacketsTab({ isPro, isAdmin }: { isPro: boolean; isAdmin: boolean }) {
  const [rackets, setRackets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ nickname: "", brand: "", model: "", headSize: "", stringPattern: "", weight: "" });
  const [err, setErr] = useState("");
  const FREE_LIMIT = 3;

  const load = useCallback(async () => {
    const res = await fetch("/api/account/rackets", { credentials: "include" });
    if (res.ok) setRackets(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addRacket(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    const res = await fetch("/api/account/rackets", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ ...form, headSize: form.headSize || undefined, weight: form.weight || undefined }),
    });
    if (!res.ok) { const d = await res.json(); setErr(d.message || "Failed"); return; }
    setForm({ nickname: "", brand: "", model: "", headSize: "", stringPattern: "", weight: "" });
    setShowAdd(false); load();
  }

  async function saveEdit(id: number) {
    await fetch(`/api/account/rackets/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify(editData),
    });
    setEditId(null); load();
  }

  async function deleteRacket(id: number) {
    if (!confirm("Delete this racket?")) return;
    await fetch(`/api/account/rackets/${id}`, { method: "DELETE", credentials: "include" });
    load();
  }

  const atLimit = !isPro && !isAdmin && rackets.length >= FREE_LIMIT;

  if (loading) return <p className="text-net-grey text-sm">Loading...</p>;

  return (
    <div>
      <div className="space-y-3 mb-6">
        {rackets.length === 0 && <p className="text-net-grey text-sm">No rackets saved yet.</p>}
        {rackets.map(r => (
          <div key={r.id} className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-[4px] p-4">
            {editId === r.id ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Input value={editData.nickname ?? ""} onChange={e => setEditData((p: any) => ({ ...p, nickname: e.target.value }))} placeholder="Nickname" className={`${inputCls} text-xs h-8`} />
                  <Input value={editData.brand ?? ""} onChange={e => setEditData((p: any) => ({ ...p, brand: e.target.value }))} placeholder="Brand" className={`${inputCls} text-xs h-8`} />
                  <Input value={editData.model ?? ""} onChange={e => setEditData((p: any) => ({ ...p, model: e.target.value }))} placeholder="Model" className={`${inputCls} text-xs h-8`} />
                  <Input value={editData.headSize ?? ""} onChange={e => setEditData((p: any) => ({ ...p, headSize: e.target.value }))} placeholder="Head size (sq in)" className={`${inputCls} text-xs h-8`} />
                  <Input value={editData.stringPattern ?? ""} onChange={e => setEditData((p: any) => ({ ...p, stringPattern: e.target.value }))} placeholder="String pattern" className={`${inputCls} text-xs h-8`} />
                  <Input value={editData.weight ?? ""} onChange={e => setEditData((p: any) => ({ ...p, weight: e.target.value }))} placeholder="Weight (g)" className={`${inputCls} text-xs h-8`} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => saveEdit(r.id)} className="h-7 px-3 bg-hevini-red hover:bg-hevini-red-dark text-white rounded-[2px] border-0 text-xs font-bold uppercase" style={{ letterSpacing: "0.08em" }}><Check className="w-3 h-3 mr-1" />SAVE</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditId(null)} className="h-7 px-3 rounded-[2px] border-[#333] text-net-grey text-xs font-bold uppercase" style={{ letterSpacing: "0.08em" }}><X className="w-3 h-3 mr-1" />CANCEL</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-court-white font-bold text-sm mb-0.5">{r.nickname}</p>
                  <p className="text-net-grey text-xs">{[r.brand, r.model].filter(Boolean).join(" ")}</p>
                  <p className="text-[#444] text-xs mt-0.5">{[r.headSize && `${r.headSize} sq in`, r.stringPattern, r.weight && `${r.weight}g`].filter(Boolean).join(" · ")}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Link href="/">
                    <Button size="sm" className="h-7 px-3 bg-hevini-red hover:bg-hevini-red-dark text-white rounded-[2px] border-0 text-[10px] font-bold uppercase" style={{ letterSpacing: "0.08em" }}>GET REC</Button>
                  </Link>
                  <Button size="sm" variant="outline" onClick={() => { setEditId(r.id); setEditData({ ...r }); }} className="h-7 w-7 p-0 rounded-[2px] border-[#333] text-net-grey hover:text-court-white">
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => deleteRacket(r.id)} className="h-7 w-7 p-0 rounded-[2px] border-[#333] text-net-grey hover:border-hevini-red hover:text-hevini-red">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {atLimit && (
        <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-[4px] p-4 mb-4 text-center">
          <p className="text-net-grey text-xs mb-3">Free plan allows up to 3 rackets. Upgrade for unlimited.</p>
          <Link href="/pricing">
            <Button className={btnPrimary} style={{ letterSpacing: "0.1em" }}>UPGRADE TO PRO</Button>
          </Link>
        </div>
      )}

      {!atLimit && (
        showAdd ? (
          <form onSubmit={addRacket} className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-[4px] p-4">
            <p className="text-[11px] font-bold text-net-grey uppercase mb-3" style={{ letterSpacing: "0.1em" }}>Add Racket</p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <Input required value={form.nickname} onChange={e => setForm(p => ({ ...p, nickname: e.target.value }))} placeholder="Nickname *" className={`${inputCls} text-xs h-9`} />
              <Input value={form.brand} onChange={e => setForm(p => ({ ...p, brand: e.target.value }))} placeholder="Brand" className={`${inputCls} text-xs h-9`} />
              <Input value={form.model} onChange={e => setForm(p => ({ ...p, model: e.target.value }))} placeholder="Model" className={`${inputCls} text-xs h-9`} />
              <Input value={form.headSize} onChange={e => setForm(p => ({ ...p, headSize: e.target.value }))} placeholder="Head size (sq in)" className={`${inputCls} text-xs h-9`} type="number" />
              <Input value={form.stringPattern} onChange={e => setForm(p => ({ ...p, stringPattern: e.target.value }))} placeholder="String pattern" className={`${inputCls} text-xs h-9`} />
              <Input value={form.weight} onChange={e => setForm(p => ({ ...p, weight: e.target.value }))} placeholder="Weight (g)" className={`${inputCls} text-xs h-9`} type="number" />
            </div>
            {err && <p className="text-hevini-red text-xs mb-2">{err}</p>}
            <div className="flex gap-2">
              <Button type="submit" className={btnPrimary} style={{ letterSpacing: "0.1em" }}>ADD RACKET</Button>
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)} className={btnOutline} style={{ letterSpacing: "0.1em" }}>CANCEL</Button>
            </div>
          </form>
        ) : (
          <Button onClick={() => setShowAdd(true)} variant="outline" className={btnOutline} style={{ letterSpacing: "0.1em" }}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />ADD RACKET
          </Button>
        )
      )}
    </div>
  );
}

// ─── Recommendations Tab ──────────────────────────────────────────────────────

function RecommendationsTab({ isPro }: { isPro: boolean }) {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/account/recommendations", { credentials: "include" })
      .then(r => r.json()).then(setRuns).finally(() => setLoading(false));
  }, []);

  function share(id: number) {
    navigator.clipboard.writeText(`https://10is.app/recommendation/${id}`);
    toast("Link copied!");
  }

  if (loading) return <p className="text-net-grey text-sm">Loading...</p>;
  if (runs.length === 0) return (
    <div className="text-center py-12">
      <BookOpen className="w-10 h-10 text-[#222] mx-auto mb-4" />
      <p className="text-net-grey text-sm mb-4">No recommendations yet.</p>
      <Link href="/onboarding">
        <Button className={btnPrimary} style={{ letterSpacing: "0.1em" }}>GET YOUR FIRST SETUP</Button>
      </Link>
    </div>
  );

  return (
    <div className="space-y-3">
      {runs.map(run => {
        const out = run.outputJson as any;
        const mains = out?.setup?.mains;
        return (
          <div key={run.id} className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-[4px] p-4">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <p className="text-court-white font-bold text-sm">{mains?.stringFamily ?? "—"}</p>
                <p className="text-net-grey text-xs">{mains?.exampleStrings?.[0]} · {mains?.tension} lbs</p>
                {run.racket && <p className="text-[#444] text-xs mt-0.5">{run.racket.brand} {run.racket.model}</p>}
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-[2px] ${run.confidence === "high" ? "bg-green-900/40 text-green-400" : run.confidence === "medium" ? "bg-yellow-900/40 text-yellow-400" : "bg-[#1A1A1A] text-net-grey"}`} style={{ letterSpacing: "0.08em" }}>
                  {run.confidence}
                </span>
                <p className="text-[10px] text-net-grey">{run.createdAt ? new Date(run.createdAt).toLocaleDateString() : ""}</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Link href="/">
                <Button size="sm" className="h-7 px-3 bg-hevini-red hover:bg-hevini-red-dark text-white rounded-[2px] border-0 text-[10px] font-bold uppercase" style={{ letterSpacing: "0.08em" }}>RE-RUN</Button>
              </Link>
              <Link href="/stringers">
                <Button size="sm" variant="outline" className="h-7 px-3 rounded-[2px] border-[#333] text-net-grey hover:text-court-white text-[10px] font-bold uppercase" style={{ letterSpacing: "0.08em" }}>TAKE TO STRINGER</Button>
              </Link>
              {isPro && (
                <Button size="sm" variant="outline" onClick={() => share(run.id)} className="h-7 px-3 rounded-[2px] border-[#333] text-net-grey hover:text-court-white text-[10px] font-bold uppercase" style={{ letterSpacing: "0.08em" }}>
                  <Copy className="w-3 h-3 mr-1" />SHARE
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Billing Tab ──────────────────────────────────────────────────────────────

function BillingTab({ profile, onRefresh }: { profile: any; onRefresh: () => void }) {
  const tier = profile?.tier ?? "free";
  const [cancelling, setCancelling] = useState(false);
  const [cancelAt, setCancelAt] = useState<string | null>(null);

  async function cancelSub() {
    if (!confirm("Cancel your Club subscription? You'll keep access until the end of the billing period.")) return;
    setCancelling(true);
    const res = await fetch("/api/account/cancel-subscription", { method: "POST", credentials: "include" });
    const d = await res.json();
    setCancelling(false);
    if (res.ok) setCancelAt(d.cancelAt);
  }

  const features: Record<string, string[]> = {
    pro: ["Unlimited racket search results", "All stringer results", "Shareable recommendation links", "Save recommendation history"],
    club: ["Everything in Pro", "Live AI chat with your technician", "Multi-profile management", "Priority support"],
  };

  return (
    <div>
      <Section title="Current Plan">
        <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-[4px] p-6">
          <div className="flex items-center gap-3 mb-4">
            <TierBadge tier={tier} />
            {tier !== "free" && profile?.createdAt && (
              <p className="text-net-grey text-xs">Member since {new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
            )}
          </div>

          {tier === "free" && (
            <>
              <p className="text-net-grey text-sm mb-4">Upgrade to unlock all features.</p>
              <div className="flex gap-3 flex-wrap">
                <Link href="/pricing"><Button className={btnPrimary} style={{ letterSpacing: "0.1em" }}>GET PRO — $4.99</Button></Link>
                <Link href="/pricing"><Button variant="outline" className={btnOutline} style={{ letterSpacing: "0.1em" }}>JOIN CLUB — $1.99/MO</Button></Link>
              </div>
            </>
          )}

          {(tier === "pro" || tier === "club") && (
            <ul className="space-y-1.5">
              {(features[tier] ?? []).map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-net-grey">
                  <Check className="w-3.5 h-3.5 text-hevini-red shrink-0" />{f}
                </li>
              ))}
            </ul>
          )}

          {tier === "club" && (
            <div className="mt-6 pt-4 border-t border-[#1A1A1A]">
              {cancelAt ? (
                <p className="text-net-grey text-sm">Your Club access continues until <span className="text-court-white font-semibold">{new Date(cancelAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>.</p>
              ) : (
                <Button variant="outline" onClick={cancelSub} disabled={cancelling} className="h-8 px-4 rounded-[2px] border-[#333] text-net-grey hover:border-hevini-red hover:text-hevini-red font-bold uppercase text-xs" style={{ letterSpacing: "0.08em" }}>
                  {cancelling ? "CANCELLING..." : "CANCEL SUBSCRIPTION"}
                </Button>
              )}
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}

// ─── Reminders Tab ────────────────────────────────────────────────────────────

function RemindersTab({ profile, onRefresh }: { profile: any; onRefresh: () => void }) {
  const [enabled, setEnabled] = useState(profile?.reminderEnabled ?? false);
  const [freq, setFreq] = useState(String(profile?.reminderFrequencyWeeks ?? 4));
  const [lastDate, setLastDate] = useState(
    profile?.lastRestrungAt ? new Date(profile.lastRestrungAt).toISOString().split("T")[0] : ""
  );
  const [saving, setSaving] = useState(false);

  const nextDate = () => {
    if (!lastDate) return null;
    const d = new Date(lastDate);
    d.setDate(d.getDate() + Number(freq) * 7);
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  };

  async function save() {
    setSaving(true);
    await fetch("/api/account/reminders", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ reminderEnabled: enabled, reminderFrequencyWeeks: Number(freq), lastRestrungAt: lastDate || null }),
    });
    setSaving(false);
    toast("Reminders saved");
    onRefresh();
  }

  return (
    <div>
      <Section title="Restring Reminders">
        <p className="text-net-grey text-sm mb-6">We'll remind you when it's time to restring based on your schedule. (Email sending coming soon — preferences saved now.)</p>

        <div className="space-y-5 max-w-sm">
          <div className="flex items-center justify-between">
            <Label className="text-[11px] font-bold uppercase text-net-grey" style={{ letterSpacing: "0.1em" }}>Enable Reminders</Label>
            <button
              onClick={() => setEnabled(v => !v)}
              className={`w-11 h-6 rounded-full transition-colors relative ${enabled ? "bg-hevini-red" : "bg-[#2A2A2A]"}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${enabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          <FieldRow label="Frequency">
            <select
              value={freq}
              onChange={e => setFreq(e.target.value)}
              className="w-full h-10 rounded-[2px] bg-[#111] border border-[#2A2A2A] text-court-white text-sm px-3 focus:outline-none focus:border-hevini-red"
            >
              <option value="2">Every 2 weeks</option>
              <option value="4">Every 4 weeks</option>
              <option value="6">Every 6 weeks</option>
              <option value="8">Every 8 weeks</option>
            </select>
          </FieldRow>

          <FieldRow label="Last Restrung">
            <Input type="date" value={lastDate} onChange={e => setLastDate(e.target.value)} className={inputCls} />
          </FieldRow>

          {lastDate && (
            <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-[4px] p-3">
              <p className="text-[10px] font-bold text-net-grey uppercase mb-1" style={{ letterSpacing: "0.1em" }}>Next Reminder</p>
              <p className="text-court-white text-sm font-semibold">{nextDate()}</p>
            </div>
          )}

          <Button onClick={save} disabled={saving} className={btnPrimary} style={{ letterSpacing: "0.1em" }}>
            {saving ? "SAVING..." : "SAVE REMINDERS"}
          </Button>
        </div>
      </Section>
    </div>
  );
}

// ─── Saved Stringers Tab ──────────────────────────────────────────────────────

function StringersTab() {
  const [stringers, setStringers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editNotes, setEditNotes] = useState<{ [id: number]: string }>({});
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/account/stringers", { credentials: "include" });
    if (res.ok) setStringers(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveNotes(id: number, notes: string) {
    setSavingId(id);
    await fetch(`/api/account/stringers/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ notes }),
    });
    setSavingId(null);
    toast("Notes saved");
  }

  async function remove(id: number) {
    if (!confirm("Remove this stringer?")) return;
    await fetch(`/api/account/stringers/${id}`, { method: "DELETE", credentials: "include" });
    load();
  }

  if (loading) return <p className="text-net-grey text-sm">Loading...</p>;

  if (stringers.length === 0) return (
    <div className="text-center py-12">
      <Bookmark className="w-10 h-10 text-[#222] mx-auto mb-4" />
      <p className="text-net-grey text-sm mb-4">No saved stringers yet.</p>
      <Link href="/stringers">
        <Button className={btnPrimary} style={{ letterSpacing: "0.1em" }}>FIND A STRINGER</Button>
      </Link>
    </div>
  );

  return (
    <div className="space-y-3">
      {stringers.map(s => (
        <div key={s.id} className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-[4px] p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <p className="text-court-white font-bold text-sm">{s.stringerName}</p>
              {s.stringerAddress && <p className="text-net-grey text-xs mt-0.5">{s.stringerAddress}</p>}
              <p className="text-[#444] text-[10px] mt-0.5">Saved {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : ""}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link href="/stringers">
                <Button size="sm" className="h-7 px-3 bg-hevini-red hover:bg-hevini-red-dark text-white rounded-[2px] border-0 text-[10px] font-bold uppercase" style={{ letterSpacing: "0.08em" }}>BOOK</Button>
              </Link>
              <Button size="sm" variant="outline" onClick={() => remove(s.id)} className="h-7 w-7 p-0 rounded-[2px] border-[#333] text-net-grey hover:border-hevini-red hover:text-hevini-red">
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
          <div className="flex gap-2">
            <textarea
              value={editNotes[s.id] ?? s.notes ?? ""}
              onChange={e => setEditNotes(p => ({ ...p, [s.id]: e.target.value }))}
              placeholder="Add notes..."
              rows={2}
              className="flex-1 rounded-[2px] bg-[#111] border border-[#2A2A2A] text-court-white text-xs p-2 resize-none focus:outline-none focus:border-hevini-red placeholder:text-[#444]"
            />
            <Button
              size="sm"
              onClick={() => saveNotes(s.id, editNotes[s.id] ?? s.notes ?? "")}
              disabled={savingId === s.id}
              className="h-auto self-stretch px-3 bg-[#1A1A1A] hover:bg-[#222] text-net-grey rounded-[2px] border border-[#2A2A2A] text-[10px] font-bold uppercase"
              style={{ letterSpacing: "0.08em" }}
            >
              {savingId === s.id ? "..." : "SAVE"}
            </Button>
          </div>
        </div>
      ))}
      <Link href="/stringers">
        <Button variant="outline" className={btnOutline} style={{ letterSpacing: "0.1em" }}>FIND MORE STRINGERS</Button>
      </Link>
    </div>
  );
}

// ─── Danger Zone Tab ──────────────────────────────────────────────────────────

function DangerZoneTab() {
  const [, navigate] = useLocation();
  const { refetch } = useUser();
  const [confirm, setConfirm] = useState("");
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function deleteAccount() {
    if (confirm !== "DELETE") return;
    setDeleting(true);
    const res = await fetch("/api/account/delete", { method: "DELETE", credentials: "include" });
    if (!res.ok) { setDeleting(false); toast("Delete failed — contact support"); return; }
    const { exportData } = await res.json();
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "10is-data-export.json"; a.click();
    URL.revokeObjectURL(url);
    refetch();
    navigate("/");
  }

  return (
    <div>
      <Section title="Delete Account">
        <div className="bg-[#0D0D0D] border border-hevini-red/30 rounded-[4px] p-5">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-hevini-red shrink-0 mt-0.5" />
            <div>
              <p className="text-court-white font-bold text-sm mb-1">Permanently delete your account</p>
              <p className="text-net-grey text-xs">All your data will be exported as JSON and then permanently deleted. This cannot be undone.</p>
            </div>
          </div>
          {!open ? (
            <Button variant="outline" onClick={() => setOpen(true)} className="h-8 px-4 rounded-[2px] border-hevini-red text-hevini-red hover:bg-hevini-red hover:text-white font-bold uppercase text-xs" style={{ letterSpacing: "0.08em" }}>
              DELETE MY ACCOUNT
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-net-grey text-xs">Type <span className="text-court-white font-bold">DELETE</span> to confirm:</p>
              <Input value={confirm} onChange={e => setConfirm(e.target.value)} className={`${inputCls} max-w-xs`} placeholder="DELETE" />
              <div className="flex gap-2">
                <Button onClick={deleteAccount} disabled={confirm !== "DELETE" || deleting} className="h-8 px-4 bg-hevini-red hover:bg-hevini-red-dark text-white rounded-[2px] border-0 font-bold uppercase text-xs" style={{ letterSpacing: "0.08em" }}>
                  {deleting ? "DELETING..." : "CONFIRM DELETE"}
                </Button>
                <Button variant="outline" onClick={() => { setOpen(false); setConfirm(""); }} className="h-8 px-4 rounded-[2px] border-[#333] text-net-grey font-bold uppercase text-xs" style={{ letterSpacing: "0.08em" }}>CANCEL</Button>
              </div>
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}

// ─── Main Account Page ────────────────────────────────────────────────────────

const TABS = [
  { id: "profile", label: "PROFILE" },
  { id: "rackets", label: "MY RACKETS" },
  { id: "recommendations", label: "RECOMMENDATIONS" },
  { id: "billing", label: "BILLING" },
  { id: "reminders", label: "RESTRING REMINDERS" },
  { id: "stringers", label: "MY STRINGERS" },
  { id: "danger", label: "DANGER ZONE" },
];

export default function Account() {
  const [, navigate] = useLocation();
  const { email, loading, isPro, isAdmin } = useUser();
  const [activeTab, setActiveTab] = useState("profile");
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!loading && !email) navigate("/login");
  }, [loading, email, navigate]);

  const loadProfile = useCallback(async () => {
    const res = await fetch("/api/account/profile", { credentials: "include" });
    if (res.ok) setProfile(await res.json());
    setProfileLoading(false);
  }, []);

  useEffect(() => {
    if (email) loadProfile();
  }, [email, loadProfile]);

  if (loading || profileLoading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <p className="text-net-grey text-sm">Loading...</p>
    </div>
  );

  if (!email) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-8">
        <p className="text-[11px] font-bold text-hevini-red uppercase mb-1" style={{ letterSpacing: "0.15em" }}>Account</p>
        <h1 className="text-3xl font-black text-court-white uppercase" style={{ letterSpacing: "0.06em" }}>
          {profile?.firstName ? `${profile.firstName}'S ACCOUNT` : "MY ACCOUNT"}
        </h1>
      </div>

      <div className="flex gap-8">
        {/* Sidebar */}
        <aside className="w-44 shrink-0">
          <nav className="space-y-0.5">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`w-full text-left px-3 py-2.5 text-[11px] font-bold uppercase rounded-[2px] transition-colors ${
                  activeTab === t.id
                    ? "bg-hevini-red text-white"
                    : t.id === "danger"
                    ? "text-hevini-red/60 hover:text-hevini-red hover:bg-hevini-red/10"
                    : "text-net-grey hover:text-court-white hover:bg-[#111]"
                }`}
                style={{ letterSpacing: "0.08em" }}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0">
          {activeTab === "profile" && <ProfileTab profile={profile} onRefresh={loadProfile} />}
          {activeTab === "rackets" && <RacketsTab isPro={isPro} isAdmin={isAdmin} />}
          {activeTab === "recommendations" && <RecommendationsTab isPro={isPro} />}
          {activeTab === "billing" && <BillingTab profile={profile} onRefresh={loadProfile} />}
          {activeTab === "reminders" && <RemindersTab profile={profile} onRefresh={loadProfile} />}
          {activeTab === "stringers" && <StringersTab />}
          {activeTab === "danger" && <DangerZoneTab />}
        </main>
      </div>
    </div>
  );
}
