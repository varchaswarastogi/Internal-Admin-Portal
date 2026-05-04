const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

export type Admin = {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "SUPPORT" | "ANALYST";
};

export type User = {
  id: string;
  name: string;
  email: string;
  plan: string;
  country: string;
  status: "ACTIVE" | "DEACTIVATED" | "BANNED";
  createdAt: string;
  lastSeenAt?: string;
};

export type EventItem = {
  id: string;
  userId?: string;
  eventName: string;
  properties: Record<string, unknown>;
  createdAt: string;
  user?: { name: string; email: string };
};

export type AuditLog = {
  id: string;
  action: string;
  targetType: string;
  targetId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  admin?: { name: string; email: string; role: string };
};

export type FeatureFlag = {
  id: string;
  key: string;
  description: string;
  enabled: boolean;
  rollout: number;
};

let token = localStorage.getItem("admin-token");

export function setToken(nextToken: string | null) {
  token = nextToken;
  if (nextToken) {
    localStorage.setItem("admin-token", nextToken);
  } else {
    localStorage.removeItem("admin-token");
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message ?? "Request failed");
  }

  return response.json();
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; admin: Admin }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    }),
  me: () => request<{ admin: Admin }>("/auth/me"),
  overview: () => request<{ metrics: Record<string, number> }>("/analytics/overview"),
  timeseries: () => request<{ series: Array<Record<string, number | string>> }>("/analytics/timeseries"),
  topEvents: () => request<{ events: Array<{ eventName: string; count: number }> }>("/analytics/top-events"),
  funnel: () => request<{ funnel: Array<{ step: string; users: number; conversion: number }> }>("/analytics/funnel"),
  users: (params: URLSearchParams) => request<{ users: User[]; pagination: { total: number; page: number; pages: number } }>(`/users?${params}`),
  userActivity: (id: string) => request<{ user: User; events: EventItem[] }>(`/users/${id}/activity`),
  updateUserStatus: (id: string, status: User["status"], reason: string) =>
    request<{ user: User }>(`/users/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, reason })
    }),
  events: () => request<{ events: EventItem[] }>("/events"),
  auditLogs: () => request<{ logs: AuditLog[] }>("/audit-logs"),
  featureFlags: () => request<{ flags: FeatureFlag[] }>("/feature-flags"),
  updateFeatureFlag: (id: string, data: Partial<Pick<FeatureFlag, "enabled" | "rollout">>) =>
    request<{ flag: FeatureFlag }>(`/feature-flags/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data)
    }),
  trackEvent: (payload: { userId?: string; eventName: string; properties?: Record<string, unknown> }) =>
    request<{ event: EventItem }>("/events/track", {
      method: "POST",
      body: JSON.stringify(payload)
    })
};
