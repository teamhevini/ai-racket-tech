import type { Response } from "express";
import { z } from "zod";

/** Validate a request body; on failure send a 400 with a readable message and return null. */
export function parseBody<S extends z.ZodTypeAny>(schema: S, body: unknown, res: Response): z.output<S> | null {
  const result = schema.safeParse(body ?? {});
  if (result.success) return result.data;
  const first = result.error.issues[0];
  const field = first?.path?.join(".");
  res.status(400).json({
    message: first ? (field ? `${humanise(field)}: ${first.message}` : first.message) : "Invalid input",
    field: field || undefined,
    issues: result.error.issues,
  });
  return null;
}

function humanise(field: string) {
  const spaced = field.replace(/([A-Z])/g, " $1").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function parseId(raw: string | undefined): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 && n < 2 ** 31 ? n : null;
}
