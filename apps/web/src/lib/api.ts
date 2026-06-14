import { getAccessToken, getRefreshToken, setTokens, setUser, clearAuth } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

type FetchOptions = RequestInit & { token?: string };

class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

let refreshPromise: Promise<string | null> | null = null;

async function attemptRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const newAccess = data.tokens.access_token;
    const newRefresh = data.tokens.refresh_token;
    setTokens(newAccess, newRefresh);
    setUser(data.user);
    return newAccess;
  } catch {
    return null;
  }
}

async function request<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...init } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });

  if (res.status === 401 && token) {
    if (!refreshPromise) {
      refreshPromise = attemptRefresh().finally(() => {
        refreshPromise = null;
      });
    }
    const newToken = await refreshPromise;
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      const retry = await fetch(`${API_URL}${path}`, { ...init, headers });
      if (!retry.ok) {
        const body = await retry.json().catch(() => ({ detail: retry.statusText }));
        throw new ApiError(retry.status, body.detail || retry.statusText);
      }
      return retry.json();
    }
    clearAuth();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new ApiError(401, "Session expired");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, body.detail || res.statusText);
  }

  return res.json();
}

export const api = {
  // Auth
  signup: (data: { email: string; password: string; display_name: string }) =>
    request("/auth/signup", { method: "POST", body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    request("/auth/login", { method: "POST", body: JSON.stringify(data) }),

  refreshToken: (refreshToken: string) =>
    request("/auth/refresh", { method: "POST", body: JSON.stringify({ refresh_token: refreshToken }) }),

  logout: (refreshToken: string) =>
    request("/auth/logout", { method: "POST", body: JSON.stringify({ refresh_token: refreshToken }) }),

  // Organizations
  listOrgs: (token: string) =>
    request("/organizations", { token }),

  createOrg: (data: { name: string; slug: string }, token: string) =>
    request("/organizations", { method: "POST", body: JSON.stringify(data), token }),

  listMembers: (orgId: string, token: string) =>
    request(`/organizations/${orgId}/members`, { token }),

  inviteMember: (orgId: string, data: { email: string; role: string }, token: string) =>
    request(`/organizations/${orgId}/members`, { method: "POST", body: JSON.stringify(data), token }),

  updateMemberRole: (orgId: string, memberId: string, role: string, token: string) =>
    request(`/organizations/${orgId}/members/${memberId}`, { method: "PUT", body: JSON.stringify({ role }), token }),

  removeMember: (orgId: string, memberId: string, token: string) =>
    request(`/organizations/${orgId}/members/${memberId}`, { method: "DELETE", token }),

  // GitHub
  getGitHubInstallUrl: (orgId: string) =>
    request<{ install_url: string }>(`/github/install?org_id=${orgId}`),

  listRepositories: (orgId: string, token: string) =>
    request(`/github/organizations/${orgId}/repositories`, { token }),

  toggleAutoReview: (repoId: string, autoReview: boolean, token: string) =>
    request(`/github/repositories/${repoId}/auto-review`, { method: "PUT", body: JSON.stringify({ auto_review: autoReview }), token }),

  // Reviews
  createReview: (data: { title: string; code: string; language?: string; description?: string; org_id: string }, token: string) =>
    request("/reviews", { method: "POST", body: JSON.stringify(data), token }),

  listReviews: (orgId: string, page: number, token: string, status?: string) =>
    request(`/reviews?org_id=${orgId}&page=${page}${status ? `&status=${status}` : ""}`, { token }),

  getReview: (reviewId: string, token: string) =>
    request(`/reviews/${reviewId}`, { token }),

  getReviewStats: (orgId: string, token: string) =>
    request<{ total: number; in_progress: number; completed: number; failed: number }>(`/reviews/stats?org_id=${orgId}`, { token }),

  // Findings actions
  flagFinding: (reviewId: string, findingId: string, reason: string, token: string) =>
    request(`/reviews/${reviewId}/findings/${findingId}/flag`, { method: "POST", body: JSON.stringify({ reason }), token }),

  unflagFinding: (reviewId: string, findingId: string, token: string) =>
    request(`/reviews/${reviewId}/findings/${findingId}/flag`, { method: "DELETE", token }),

  appealReview: (reviewId: string, reason: string, disputedFindingIds: string[], token: string) =>
    request(`/reviews/${reviewId}/appeal`, { method: "POST", body: JSON.stringify({ reason, disputed_finding_ids: disputedFindingIds }), token }),

  // User
  getMe: (token: string) =>
    request("/users/me", { token }),

  updateMe: (data: { display_name?: string; avatar_url?: string }, token: string) =>
    request("/users/me", { method: "PUT", body: JSON.stringify(data), token }),
};

export { ApiError };
