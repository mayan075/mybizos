"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiClient, tryFetch } from "@/lib/api-client";
import { getUser } from "@/lib/auth";

// In production, don't fall back to mock data — show empty/error states instead
const IS_PRODUCTION = typeof window !== "undefined" &&
  !window.location.hostname.includes("localhost");

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
  if (!user?.orgId) {
    // No authenticated org — redirect to login instead of leaking data
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("No authenticated organization");
  }
  return user.orgId;
}

function buildPath(template: string): string {
  return template.replace(":orgId", getOrgId());
}

// --------------------------------------------------------
// useApiQuery — generic GET hook with mock fallback
// --------------------------------------------------------

/**
 * Fetches data from the API and falls back to `mockData`
 * only when the API is completely unreachable (network error).
 *
 * While the initial fetch is in progress, returns `null` data
 * and `isLoading: true` so pages can show a loading spinner
 * instead of flashing mock data.
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
  // Start with null data and loading=true so we never flash mock data
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const hasFetched = useRef(false);

  // Keep a stable ref to the latest mockData so the effect
  // doesn't re-run when the parent creates a new object literal.
  const mockRef = useRef(mockData);
  mockRef.current = mockData;

  const paramsKey = params ? JSON.stringify(params) : "";

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    setError(null);

    try {
      const path = buildPath(endpoint);
      // Add 5-second timeout to prevent hanging
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const result = await tryFetch(() =>
        apiClient.get<T | { data: T }>(path, { ...(params ? { params } : {}), signal: controller.signal }),
      );

      clearTimeout(timeout);

      if (result !== null) {
        // Unwrap { data: ... } wrapper if the API returns one.
        const unwrapped =
          result !== null &&
          typeof result === "object" &&
          !Array.isArray(result) &&
          "data" in (result as Record<string, unknown>)
            ? ((result as Record<string, unknown>).data as T)
            : (result as T);
        // Guard: if unwrapped is null/undefined, fall back to mock data
        setData(unwrapped ?? mockRef.current);
        setIsLive(unwrapped != null);
      } else {
        // API unavailable — in dev use mock data, in prod show null (empty state)
        if (!IS_PRODUCTION) {
          setData(mockRef.current);
        }
        setIsLive(false);
      }
    } catch {
      // Any error — in dev use mock data, in prod show null (empty state)
      if (!IS_PRODUCTION) {
        setData(mockRef.current);
      }
      setIsLive(false);
    }

    hasFetched.current = true;
    setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, paramsKey, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // While loading (before first fetch completes), return mock data shape
  // as null-ish to prevent rendering stale mock data.
  // After fetch, return real data (which may be empty array/object from API
  // or mock data on network error).
  const resolvedData: T = data ?? mockRef.current;

  return { data: resolvedData, isLoading, error, isLive, refetch: fetchData };
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
