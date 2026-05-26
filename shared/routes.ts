import { z } from "zod";
import {
  insertFeedbackSchema,
  onboardingInputsSchema,
  recommendationOutputSchema,
} from "./schema";

const racketSchema = z.object({
  id: z.number(),
  sport: z.string(),
  brand: z.string(),
  model: z.string(),
  headSize: z.number().nullable(),
  stringPattern: z.string().nullable(),
  weightUnstrung: z.number().nullable(),
  balance: z.string().nullable(),
  stiffnessRa: z.number().nullable(),
  beamWidth: z.string().nullable(),
  recTensionMin: z.number().nullable(),
  recTensionMax: z.number().nullable(),
  sourceUrl: z.string().nullable(),
  level: z.string().nullable(),
  year: z.number().nullable(),
  createdAt: z.string().nullable(),
});

const stringerSchema = z.object({
  name: z.string(),
  address: z.string(),
  place_id: z.string(),
  geometry: z
    .object({ location: z.object({ lat: z.number(), lng: z.number() }) })
    .optional(),
  types: z.array(z.string()),
  website: z.string().optional(),
  phone: z.string().optional(),
});

const recommendationRunResponseSchema = z.object({
  runId: z.number(),
  recommendation: recommendationOutputSchema,
  confidence: z.enum(["high", "medium", "estimated"]),
});

export const api = {
  rackets: {
    search: {
      path: "/api/rackets/search" as const,
      method: "GET" as const,
      responses: { 200: z.array(racketSchema) },
    },
    get: {
      path: "/api/rackets/:id" as const,
      method: "GET" as const,
      responses: { 200: racketSchema },
    },
  },
  recommend: {
    create: {
      path: "/api/recommend" as const,
      method: "POST" as const,
      input: onboardingInputsSchema,
      responses: {
        201: recommendationRunResponseSchema,
        400: z.object({ message: z.string(), details: z.any().optional() }),
      },
    },
  },
  feedback: {
    create: {
      path: "/api/feedback" as const,
      method: "POST" as const,
      input: insertFeedbackSchema,
      responses: {
        201: z.object({
          id: z.number(),
          recommendationRunId: z.number(),
          ratingPower: z.number().nullable(),
          ratingControl: z.number().nullable(),
          ratingComfort: z.number().nullable(),
          durabilityHours: z.number().nullable(),
          comments: z.string().nullable(),
          createdAt: z.string().nullable(),
        }),
      },
    },
  },
  stringers: {
    search: {
      path: "/api/stringers/search" as const,
      method: "GET" as const,
      responses: { 200: z.array(stringerSchema) },
    },
  },
};

export function buildUrl(
  path: string,
  params: Record<string, string | number>
): string {
  let url = path;
  for (const [key, value] of Object.entries(params)) {
    url = url.replace(`:${key}`, String(value));
  }
  return url;
}

export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type OnboardingInputs = z.infer<typeof onboardingInputsSchema>;
export type Stringer = z.infer<typeof stringerSchema>;
export type RacketResult = z.infer<typeof racketSchema>;
