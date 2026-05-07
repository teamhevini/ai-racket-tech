import { useMutation } from "@tanstack/react-query";
import { api, type InsertFeedback } from "@shared/routes";

export function useSubmitFeedback() {
  return useMutation({
    mutationFn: async (data: InsertFeedback) => {
      const validated = api.feedback.create.input.parse(data);
      const res = await fetch(api.feedback.create.path, {
        method: api.feedback.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to submit feedback");
      }

      return api.feedback.create.responses[201].parse(await res.json());
    },
  });
}
