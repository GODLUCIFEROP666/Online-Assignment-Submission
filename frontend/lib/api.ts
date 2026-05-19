import { clearAuth, getAccessToken, setAccessToken } from "@/lib/auth";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function refreshSession() {
  const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: "POST",
    credentials: "include"
  });

  if (!response.ok) {
    clearAuth();
    return false;
  }

  const payload = (await response.json()) as { access_token?: string };
  if (payload.access_token) {
    setAccessToken(payload.access_token);
    return true;
  }

  clearAuth();
  return false;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const shouldRefresh = path.startsWith("/api/me") || path.startsWith("/api/admin") || path.startsWith("/api/assignments") || path.startsWith("/api/files") || path.startsWith("/api/analytics");

  async function request() {
    const token = getAccessToken();
    const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;
    return fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {})
      },
      credentials: "include"
    });
  }

  let response = await request();
  if (response.status === 401 && shouldRefresh) {
    const refreshed = await refreshSession();
    if (refreshed) {
      response = await request();
    }
  }

  if (!response.ok) {
    let detail = `API request failed: ${response.status}`;
    try {
      const errorBody = await response.json();
      detail = errorBody?.detail || errorBody?.message || detail;
    } catch {
      const text = await response.text();
      if (text) detail = text;
    }
    throw new Error(detail);
  }

  return (await response.json()) as T;
}
