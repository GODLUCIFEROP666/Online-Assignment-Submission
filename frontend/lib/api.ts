import { clearAuth, getAccessToken, setAccessToken } from "@/lib/auth";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const DEFAULT_TIMEOUT_MS = 60000; // 60 seconds gives Render free-tier cold starts time to wake up

async function refreshSession() {
  try {
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
  } catch {
    clearAuth();
    return false;
  }
}

async function requestWithAuth(path: string, init?: RequestInit) {
  const token = getAccessToken();
  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;

  let signal = init?.signal;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  // If no external signal is provided, enforce sensible 60-second cold-start timeout
  if (!signal) {
    const controller = new AbortController();
    signal = controller.signal;
    timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal,
      cache: "no-store",
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {})
      },
      credentials: "include"
    });
    return response;
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new Error("Server request timed out. The free cloud backend is taking longer than usual to wake up. Please wait a moment and try again.");
    }
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error("Unable to reach backend server. If the free server is waking up, please wait ~30-50s and retry.");
    }
    throw error;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const shouldRefresh = path.startsWith("/api/me") || path.startsWith("/api/admin") || path.startsWith("/api/assignments") || path.startsWith("/api/files") || path.startsWith("/api/analytics") || path.startsWith("/api/notifications");

  let response = await requestWithAuth(path, init);
  if (response.status === 401 && shouldRefresh) {
    const refreshed = await refreshSession();
    if (refreshed) {
      response = await requestWithAuth(path, init);
    }
  }

  if (!response.ok) {
    if (response.status === 502 || response.status === 503 || response.status === 504) {
      throw new Error("The cloud server is currently waking up from idle sleep. Please wait a few seconds and try again.");
    }

    let detail = `API request failed: ${response.status}`;
    try {
      const errorBody = await response.json();
      if (errorBody?.detail) {
        if (Array.isArray(errorBody.detail)) {
          detail = errorBody.detail.map((err: any) => {
            const field = err.loc ? err.loc[err.loc.length - 1] : "field";
            return `${field}: ${err.msg}`;
          }).join(", ");
        } else if (typeof errorBody.detail === "object") {
          detail = JSON.stringify(errorBody.detail);
        } else {
          detail = errorBody.detail;
        }
      } else if (errorBody?.message) {
        detail = errorBody.message;
      }
    } catch {
      const text = await response.text();
      if (text) detail = text;
    }
    throw new Error(detail);
  }

  return (await response.json()) as T;
}

function inferDownloadFilename(contentDisposition: string | null, fallback: string) {
  if (!contentDisposition) return fallback;
  const match = contentDisposition.match(/filename="?([^"]+)"?/i);
  return match?.[1] ?? fallback;
}

export async function downloadApiFile(path: string, fallbackFilename: string) {
  const targetPath = path.startsWith("/api/")
    ? path
    : path.startsWith("/")
    ? `/api/files${path}`
    : `/api/files/${path}`;

  let response = await requestWithAuth(targetPath, { method: "GET" });
  if (response.status === 401) {
    const refreshed = await refreshSession();
    if (refreshed) {
      response = await requestWithAuth(targetPath, { method: "GET" });
    }
  }

  if (!response.ok) {
    let detail = `API download failed: ${response.status}`;
    try {
      const errorBody = await response.json();
      if (errorBody?.detail) {
        detail = Array.isArray(errorBody.detail)
          ? errorBody.detail.map((err: any) => err?.msg ?? "Download failed").join(", ")
          : String(errorBody.detail);
      }
    } catch {
      const text = await response.text();
      if (text) detail = text;
    }
    throw new Error(detail);
  }

  const blob = await response.blob();
  const resolvedName = inferDownloadFilename(response.headers.get("content-disposition"), fallbackFilename);
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = resolvedName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);
}
