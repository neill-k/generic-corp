import { useOrgStore } from "../store/org-store";

const API_BASE = "/api";

/** Routes that do not require the X-Organization-Slug header. */
const PUBLIC_PREFIXES = ["/organizations", "/health"];

function isPublicRoute(path: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

function getOrgHeaders(): Record<string, string> {
  const slug = useOrgStore.getState().currentOrg?.slug;
  return slug ? { "X-Organization-Slug": slug } : {};
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const orgHeaders = isPublicRoute(path) ? {} : getOrgHeaders();

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...orgHeaders,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  get<T>(path: string): Promise<T> {
    return request<T>(path);
  },

  post<T>(path: string, body: unknown): Promise<T> {
    return request<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  patch<T>(path: string, body: unknown): Promise<T> {
    return request<T>(path, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  put<T>(path: string, body: unknown): Promise<T> {
    return request<T>(path, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  delete<T>(path: string): Promise<T> {
    return request<T>(path, {
      method: "DELETE",
    });
  },
};
