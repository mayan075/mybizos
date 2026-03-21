/**
 * API client for the Hono backend.
 * All API calls go through this module for consistent
 * error handling, auth headers, and response parsing.
 */

import { getToken } from "./auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface ApiError {
  error: string;
  code: string;
  status: number;
  details?: Array<{ field: string; message: string }>;
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

class ApiRequestError extends Error {
  code: string;
  status: number;
  details?: Array<{ field: string; message: string }>;

  constructor(data: ApiError) {
    super(data.error);
    this.name = "ApiRequestError";
    this.code = data.code;
    this.status = data.status;
    this.details = data.details;
  }
}

function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { params, ...init } = options;

  let url = `${API_BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...init.headers,
    },
  });

  if (!response.ok) {
    const errorData = (await response.json()) as ApiError;
    throw new ApiRequestError(errorData);
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: "GET" }),

  post: <T>(endpoint: string, body: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: "POST",
      body: JSON.stringify(body),
    }),

  patch: <T>(endpoint: string, body: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: "DELETE" }),
};

export { ApiRequestError };
