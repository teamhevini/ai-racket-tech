import { z } from "zod";
import { insertFeedbackSchema, onboardingInputsSchema, recommendationOutputSchema } from "./schema";

// Re-export types for convenience
export type { OnboardingInputs } from "./schema";
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;

// Helper to build URLs with path params
export function buildUrl(path: string, params: Record<string, string | number>): string {
  let url = path;
  for (const [key, value] of Object.entries(params)) {
    url = url.replace(`:${key}`, String(value));
  }
  return url;
}

// API route definitions
export const api = {
  rackets: {
    search: {
      path: "/api/rackets/search",
      method: "GET" as const,
      responses: {
        200: z.array(
          z.object({
            id: z.number(),
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
            createdAt: z.string().or(z.date()),
          })
        ),
      },
    },
    get: {
      path: "/api/rackets/:id",
      method: "GET" as const,
      responses: {
        200: z.object({
          id: z.number(),
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
          createdAt: z.string().or(z.date()),
        }),
      },
    },
  },
  recommend: {
    create: {
      path: "/api/recommend",
      method: "POST" as const,
      input: onboardingInputsSchema,
      responses: {
        201: z.object({
          runId: z.number(),
          recommendation: recommendationOutputSchema,
          confidence: z.string(),
        }),
        400: z.object({
          message: z.string(),
          details: z.array(z.any()).optional(),
        }),
      },
    },
  },
  feedback: {
    create: {
      path: "/api/feedback",
      method: "POST" as const,
      input: insertFeedbackSchema,
      responses: {
        201: z.object({
          id: z.number(),
          runId: z.number().nullable(),
          rating: z.number().nullable(),
          comment: z.string().nullable(),
          createdAt: z.string().or(z.date()),
        }),
      },
    },
  },
  stringers: {
    search: {
      path: "/api/stringers/search",
      method: "GET" as const,
      responses: {
        200: z.array(
          z.object({
            name: z.string(),
            address: z.string(),
            place_id: z.string(),
            geometry: z.object({
              location: z.object({ lat: z.number(), lng: z.number() }),
            }).optional(),
            types: z.array(z.string()),
            website: z.string().optional(),
            phone: z.string().optional(),
          })
        ),
      },
    },
  },
} as const;
