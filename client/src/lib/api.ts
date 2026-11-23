import { QueryClient } from "@tanstack/react-query";

export class ApiError extends Error {
  status: number;
  upgrade: boolean;
  field?: string;
  constructor(message: string, status: number, body?: { upgrade?: boolean; field?: string }) {
    super(message);
    this.status = status;
    this.upgrade = !!body?.upgrade;
    this.field = body?.field;
  }
}

/** JSON fetch that throws ApiError with the server's human-readable message. */
export async function api<T = unknown>(method: string, url: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      credentials: "include",
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("You appear to be offline. Check your connection and try again.", 0);
  }
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const fallback =
      res.status === 401
        ? "Please log in to continue."
        : res.status === 429
          ? "Too many requests — please wait a moment."
          : "Something went wrong. Please try again.";
    throw new ApiError(data?.message ?? fallback, res.status, data ?? undefined);
  }
  return data as T;
}

export const get = <T,>(url: string) => api<T>("GET", url);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: ({ queryKey }) => get(queryKey[0] as string),
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2,
    },
    mutations: { retry: false },
  },
});
