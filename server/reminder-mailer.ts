import { reminderState, describeDaysLeft } from "@shared/reminders";
import { storage } from "./storage";
import { log } from "./log";

/**
 * Emails players whose strings are due. Runs on a timer in production and can be
 * triggered by a cron hitting POST /api/cron/reminders. Sends at most one email per
 * racket per string job (lastReminderSentAt resets whenever a new job is logged).
 *
 * Email is sent through Resend when RESEND_API_KEY is set. Without it the job
 * still runs and reports who *would* be emailed; in-app reminders and calendar
 * files work regardless.
 */

export interface ReminderEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export type Sender = (email: ReminderEmail) => Promise<void>;

export const resendSender: Sender = async (email) => {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.REMINDER_FROM_EMAIL ?? "10IS <reminders@10is.app>",
      to: email.to,
      subject: email.subject,
      text: email.text,
      html: email.html,
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
};

export async function runReminderJob(opts: { send?: Sender; now?: Date } = {}) {
  const send = opts.send ?? (process.env.RESEND_API_KEY ? resendSender : null);
  const now = opts.now ?? new Date();
  const appUrl = process.env.APP_URL ?? "https://10is.app";
  const users = await storage.getUsersWithEmailReminders();
  let due = 0;
  let sent = 0;

  for (const user of users) {
    const rackets = (await storage.getSavedRackets(user.id)).filter((r) => r.reminderEnabled);
    if (rackets.length === 0) continue;
    const latest = await storage.getLatestJobs(user.id, rackets.map((r) => r.id));
    const dueRackets = rackets
      .map((r) => {
        const job = latest.get(r.id);
        const state = reminderState(
          {
            hoursPerWeek: r.hoursPerWeek,
            restringIntervalDays: r.restringIntervalDays,
            mains: job?.mains,
            crosses: job?.crosses,
            lastStrungAt: job?.strungAt ?? null,
          },
          now,
        );
        return { racket: r, state, job };
      })
      .filter(({ racket, state, job }) => {
        if (state.status !== "overdue" && !(state.status === "due-soon" && (state.daysLeft ?? 99) <= 1)) return false;
        // Already reminded about this set of strings.
        return !(racket.lastReminderSentAt && job && racket.lastReminderSentAt > job.strungAt);
      });
    if (dueRackets.length === 0) continue;
    due += dueRackets.length;

    const name = user.firstName ? `Hi ${user.firstName},` : "Hi,";
    const lines = dueRackets.map(({ racket, state }) => `• ${racket.nickname} — ${describeDaysLeft(state.daysLeft)}`);
    const email: ReminderEmail = {
      to: user.email,
      subject:
        dueRackets.length === 1 ? `Time to restring ${dueRackets[0].racket.nickname}` : `${dueRackets.length} rackets are due a restring`,
      text: `${name}\n\nYour strings are due:\n${lines.join("\n")}\n\nFresh strings keep your feel consistent and protect your arm. When it's done, log it in 10IS: ${appUrl}/bag\n\nTurn these emails off any time: ${appUrl}/account?tab=notifications`,
      html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;color:#0E1411">
<p>${escapeHtml(name)}</p><p>Your strings are due:</p>
<ul>${dueRackets.map(({ racket, state }) => `<li><strong>${escapeHtml(racket.nickname)}</strong> — ${describeDaysLeft(state.daysLeft)}</li>`).join("")}</ul>
<p>Fresh strings keep your feel consistent and protect your arm.</p>
<p><a href="${appUrl}/bag" style="display:inline-block;background:#C8102E;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:600">Open my bag</a></p>
<p style="color:#5E665F;font-size:12px">You're getting this because restring reminders are on. <a href="${appUrl}/account?tab=notifications">Turn them off</a>.</p></div>`,
    };

    if (!send) {
      log(`would email ${dueRackets.length} reminder(s) to user ${user.id} (RESEND_API_KEY not set)`, "reminders");
      continue;
    }
    try {
      await send(email);
      sent++;
      for (const { racket } of dueRackets) {
        await storage.updateSavedRacket(racket.id, user.id, { lastReminderSentAt: now });
      }
    } catch (err) {
      console.error(`[reminders] failed for user ${user.id}:`, err);
    }
  }
  return { checkedUsers: users.length, dueRackets: due, emailsSent: sent };
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function startReminderSchedule() {
  const every = 6 * 60 * 60 * 1000;
  const tick = () => runReminderJob().catch((err) => console.error("[reminders] job failed:", err));
  setTimeout(tick, 60_000).unref();
  setInterval(tick, every).unref();
}
