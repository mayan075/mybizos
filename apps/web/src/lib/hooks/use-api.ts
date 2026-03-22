"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiClient, tryFetch } from "@/lib/api-client";
import { getUser } from "@/lib/auth";

// --------------------------------------------------------
// Types
// --------------------------------------------------------

interface UseApiQueryResult<T> {
  data: T;
  isLoading: boolean;
  error: string | null;
  /** True when the data came from the API, false when using mock fallback */
  isLive: boolean;
  /** Re-fetch from API (keeps current data while loading) */
  refetch: () => void;
}

interface UseApiMutationResult<TInput, TOutput> {
  mutate: (input: TInput) => Promise<TOutput | null>;
  isLoading: boolean;
  error: string | null;
}

// --------------------------------------------------------
// Helpers
// --------------------------------------------------------

function getOrgId(): string {
  const user = getUser();
  return user?.orgId ?? "demo";
}

function buildPath(template: string): string {
  return template.replace(":orgId", getOrgId());
}

// --------------------------------------------------------
// useApiQuery — generic GET hook with mock fallback
// --------------------------------------------------------

/**
 * Fetches data from the API and falls back to `mockData`
 * if the request fails (e.g. backend not running).
 *
 * @param endpoint  API path with `:orgId` placeholder
 * @param mockData  Fallback data used when API is unreachable
 * @param params    Optional query-string params
 * @param enabled   Set to false to skip fetching
 */
function useApiQuery<T>(
  endpoint: string,
  mockData: T,
  params?: Record<string, string>,
  enabled = true,
): UseApiQueryResult<T> {
  const [data, setData] = useState<T>(mockData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);

  // Keep a stable ref to the latest mockData so the effect
  // doesn't re-run when the parent creates a new object literal.
  const mockRef = useRef(mockData);
  mockRef.current = mockData;

  const paramsKey = params ? JSON.stringify(params) : "";

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    setError(null);

    const path = buildPath(endpoint);
    const result = await tryFetch(() =>
      apiClient.get<T>(path, params ? { params } : undefined),
    );

    if (result !== null) {
      setData(result);
      setIsLive(true);
    } else {
      // API unavailable — use mock data
      setData(mockRef.current);
      setIsLive(false);
    }

    setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, paramsKey, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, isLive, refetch: fetchData };
}

// --------------------------------------------------------
// useApiMutation — generic POST / PATCH / DELETE hook
// --------------------------------------------------------

type HttpMethod = "post" | "patch" | "delete";

/**
 * Returns a `mutate` function that calls the API and falls
 * back to returning the input (for optimistic UI) on failure.
 */
function useApiMutation<TInput, TOutput = TInput>(
  endpoint: string,
  method: HttpMethod = "post",
): UseApiMutationResult<TInput, TOutput> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (input: TInput): Promise<TOutput | null> => {
      setIsLoading(true);
      setError(null);

      const path = buildPath(endpoint);

      try {
        let result: TOutput | null = null;

        if (method === "post") {
          result = await tryFetch(() =>
            apiClient.post<TOutput>(path, input),
          );
        } else if (method === "patch") {
          result = await tryFetch(() =>
            apiClient.patch<TOutput>(path, input),
          );
        } else if (method === "delete") {
          result = await tryFetch(() =>
            apiClient.delete<TOutput>(path),
          );
        }

        setIsLoading(false);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        setIsLoading(false);
        return null;
      }
    },
    [endpoint, method],
  );

  return { mutate, isLoading, error };
}

export { useApiQuery, useApiMutation, getOrgId, buildPath };
export type { UseApiQueryResult, UseApiMutationResult };
