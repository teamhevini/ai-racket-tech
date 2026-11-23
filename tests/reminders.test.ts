import { describe, expect, it } from "vitest";
import {
  detectMaterial,
  restringIntervalDays,
  reminderState,
  describeDaysLeft,
  MAX_INTERVAL_DAYS,
  MIN_INTERVAL_DAYS,
} from "../shared/reminders";

const day = 86_400_000;

describe("detectMaterial", () => {
  it("recognises common polyesters", () => {
    expect(detectMaterial("Luxilon ALU Power 125")).toBe("poly");
    expect(detectMaterial("Babolat RPM Blast")).toBe("poly");
    expect(detectMaterial("Solinco Hyper-G 16L")).toBe("poly");
    expect(detectMaterial("generic co-poly")).toBe("poly");
  });

  it("recognises soft strings", () => {
    expect(detectMaterial("Wilson NXT 16")).toBe("soft");
    expect(detectMaterial("Babolat VS Touch natural gut")).toBe("soft");
    expect(detectMaterial("Tecnifibre X-One Biphase")).toBe("soft");
  });

  it("lets the mains decide a hybrid", () => {
    expect(detectMaterial("ALU Power", "VS Touch")).toBe("poly");
    expect(detectMaterial("VS Touch gut", "ALU Power")).toBe("soft");
    expect(detectMaterial(null, "RPM Blast")).toBe("poly");
  });

  it("returns unknown when there is nothing to go on", () => {
    expect(detectMaterial()).toBe("unknown");
    expect(detectMaterial("my usual")).toBe("unknown");
  });
});

describe("restringIntervalDays", () => {
  it("uses the player's own interval when set", () => {
    expect(restringIntervalDays({ restringIntervalDays: 21, hoursPerWeek: 10 })).toBe(21);
  });

  it("wears polyester out about twice as fast as multifilament", () => {
    const poly = restringIntervalDays({ hoursPerWeek: 4, mains: "ALU Power" });
    const multi = restringIntervalDays({ hoursPerWeek: 4, mains: "Wilson NXT" });
    expect(poly).toBe(35); // 20h / 4h a week = 5 weeks
    expect(multi).toBe(70); // 40h / 4h a week = 10 weeks
  });

  it("plays more, restrings sooner", () => {
    expect(restringIntervalDays({ hoursPerWeek: 10, mains: "RPM" })).toBeLessThan(
      restringIntervalDays({ hoursPerWeek: 2, mains: "RPM" }),
    );
  });

  it("stays within sensible bounds", () => {
    expect(restringIntervalDays({ hoursPerWeek: 60, mains: "RPM" })).toBe(MIN_INTERVAL_DAYS);
    expect(restringIntervalDays({ hoursPerWeek: 0.1, mains: "gut" })).toBe(MAX_INTERVAL_DAYS);
  });
});

describe("reminderState", () => {
  const now = new Date("2026-06-15T12:00:00");

  it("reports 'never' without a logged restring", () => {
    const s = reminderState({ hoursPerWeek: 3 }, now);
    expect(s.status).toBe("never");
    expect(s.dueAt).toBeNull();
    expect(describeDaysLeft(s.daysLeft)).toBe("No restring logged");
  });

  it("is fresh right after a restring", () => {
    const s = reminderState({ restringIntervalDays: 30, lastStrungAt: new Date(now.getTime() - 2 * day) }, now);
    expect(s.status).toBe("fresh");
    expect(s.daysLeft).toBe(28);
    expect(s.freshness).toBeCloseTo(28 / 30);
  });

  it("warns in the final week", () => {
    const s = reminderState({ restringIntervalDays: 30, lastStrungAt: new Date(now.getTime() - 25 * day) }, now);
    expect(s.status).toBe("due-soon");
    expect(s.daysLeft).toBe(5);
  });

  it("flags overdue strings", () => {
    const s = reminderState({ restringIntervalDays: 30, lastStrungAt: new Date(now.getTime() - 40 * day) }, now);
    expect(s.status).toBe("overdue");
    expect(s.daysLeft).toBe(-10);
    expect(s.freshness).toBe(0);
    expect(describeDaysLeft(s.daysLeft)).toBe("10 days overdue");
  });

  it("computes the due date from the last restring", () => {
    const last = new Date("2026-06-01T18:30:00");
    const s = reminderState({ restringIntervalDays: 14, lastStrungAt: last }, now);
    expect(s.dueAt?.toDateString()).toBe(new Date("2026-06-15T00:00:00").toDateString());
    expect(s.daysLeft).toBe(0);
    expect(describeDaysLeft(0)).toBe("Due today");
  });
});
