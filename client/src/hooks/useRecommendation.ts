import { useQuery, useMutation } from '@tanstack/react-query';

export interface OnboardingInput {
  racketId?: number;
  racketName?: string;
  goals: string[];
  swingSpeed: string;
  playFrequency: string;
  injuryRisk: string[];
  stringHistory?: string;
  budget?: string;
}

export function useRecommendationRun(runId: string | undefined) {
  return useQuery({
    queryKey: ['recommendation', runId],
    queryFn: async () => {
      const res = await fetch(`/api/recommendation-runs/${runId}`);
      if (!res.ok) throw new Error('Not found');
      return res.json();
    },
    enabled: !!runId,
  });
}

export function useCreateRecommendation() {
  return useMutation({
    mutationFn: async (input: OnboardingInput) => {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Recommendation failed');
      return res.json();
    },
  });
}
