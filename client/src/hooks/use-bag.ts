import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import type { BagRacket, BagResponse, MyStringer, RacketDetail, StringJobJson, SavedStringerJson } from "@/lib/types";
import type { SavedRacketInput, SavedStringerInput, StringJobInput } from "@shared/schema";

export const bagKey = ["/api/bag"] as const;
export const racketKey = (id: number) => [`/api/bag/rackets/${id}`] as const;
export const stringersKey = ["/api/stringers/saved"] as const;

export function useBag(enabled = true) {
  return useQuery<BagResponse>({ queryKey: bagKey, enabled });
}

export function useRacket(id: number) {
  return useQuery<RacketDetail>({ queryKey: racketKey(id), enabled: Number.isFinite(id) });
}

export function useMyStringers(enabled = true) {
  return useQuery<MyStringer[]>({ queryKey: stringersKey, enabled });
}

function useInvalidateBag() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: bagKey }),
      qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("/api/bag/rackets/") }),
      qc.invalidateQueries({ queryKey: stringersKey }),
    ]);
}

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");
const onError = (e: unknown) => toast.error(errorMessage(e));

export function useSaveRacket() {
  const invalidate = useInvalidateBag();
  return useMutation({
    mutationFn: ({ id, data }: { id?: number; data: Partial<SavedRacketInput> }) =>
      id ? api<BagRacket>("PATCH", `/api/bag/rackets/${id}`, data) : api<BagRacket>("POST", "/api/bag/rackets", data),
    onSuccess: invalidate,
  });
}

export function useDeleteRacket() {
  const invalidate = useInvalidateBag();
  return useMutation({
    mutationFn: (id: number) => api("DELETE", `/api/bag/rackets/${id}`),
    onSuccess: invalidate,
    onError,
  });
}

export function useSaveJob() {
  const invalidate = useInvalidateBag();
  return useMutation({
    mutationFn: ({ racketId, jobId, data }: { racketId?: number; jobId?: number; data: Partial<StringJobInput> }) =>
      jobId
        ? api<StringJobJson>("PATCH", `/api/bag/jobs/${jobId}`, data)
        : api<StringJobJson>("POST", `/api/bag/rackets/${racketId}/jobs`, data),
    onSuccess: invalidate,
  });
}

export function useDeleteJob() {
  const invalidate = useInvalidateBag();
  return useMutation({
    mutationFn: (jobId: number) => api("DELETE", `/api/bag/jobs/${jobId}`),
    onSuccess: invalidate,
    onError,
  });
}

export function useSaveStringer() {
  const invalidate = useInvalidateBag();
  return useMutation({
    mutationFn: ({ id, data }: { id?: number; data: Partial<SavedStringerInput> }) =>
      id
        ? api<SavedStringerJson>("PATCH", `/api/stringers/saved/${id}`, data)
        : api<SavedStringerJson & { alreadySaved?: boolean }>("POST", "/api/stringers/saved", data),
    onSuccess: invalidate,
  });
}

export function useDeleteStringer() {
  const invalidate = useInvalidateBag();
  return useMutation({
    mutationFn: (id: number) => api("DELETE", `/api/stringers/saved/${id}`),
    onSuccess: invalidate,
    onError,
  });
}

export { ApiError };
