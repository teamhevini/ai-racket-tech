import { useMutation } from "@tanstack/react-query";
import { api, type OnboardingInputs } from "@shared/routes";

export function useCreateRecommendation() {
  return useMutation({
    mutationFn: async (data: OnboardingInputs) => {
      const cleanData = { ...data };
      if (cleanData.racketId === 0) cleanData.racketId = null;
      const validated = api.recommend.create.input.parse(cleanData);
      const res = await fetch(api.recommend.create.path, {
        method: api.recommend.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.recommend.create.responses[400].parse(await res.json());
          throw new Error(error.message || "Validation failed");
        }
        throw new Error("Failed to generate recommendation");
      }
      return api.recommend.create.responses[201].parse(await res.json());
    },
  });
}
