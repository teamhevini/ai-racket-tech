import { describe, expect, it } from "vitest";
import { codeTables, planChanges } from "../script/predeploy-check";

const v1Live = () =>
  new Map<string, Set<string>>([
    ["users", new Set(["id", "email", "tier", "is_admin", "first_name", "last_name", "stripe_customer_id", "stripe_subscription_id", "password_hash", "reminder_enabled", "reminder_frequency_weeks", "last_restrung_at", "created_at", "updated_at"])],
    ["saved_rackets", new Set(["id", "user_id", "nickname"])],
    ["user_sessions", new Set(["sid", "sess", "expire"])],
  ]);

describe("pre-deploy check", () => {
  it("knows every table in the schema", () => {
    const code = codeTables();
    for (const t of ["users", "saved_rackets", "string_jobs", "shops", "bookings", "brands", "strings", "campaigns", "string_signals", "stringer_invites"]) {
      expect(code.has(t), t).toBe(true);
    }
  });

  it("reports a v1 database as additive only (nothing deleted), and never touches the session table", () => {
    const plan = planChanges(v1Live(), codeTables());
    expect(plan.dropTables).toEqual([]);
    expect(plan.dropColumns).toEqual([]);
    expect(plan.addTables).toContain("bookings");
    expect(plan.addColumns).toContain("saved_rackets.restring_interval_days");
  });

  it("flags tables and columns a deploy would delete", () => {
    const live = v1Live();
    live.set("legacy_payments", new Set(["id"]));
    live.get("users")!.add("old_column");
    const plan = planChanges(live, codeTables());
    expect(plan.dropTables).toEqual(["legacy_payments"]);
    expect(plan.dropColumns).toEqual(["users.old_column"]);
  });
});
