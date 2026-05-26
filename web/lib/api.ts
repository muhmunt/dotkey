import { getToken, clearToken } from "./auth"

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(BASE + path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })
  if (res.status === 401) {
    clearToken()
    window.location.href = "/login"
    throw new Error("Session expired. Please log in again.")
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Request failed (${res.status})`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface User { id: string; name: string; email: string; created_at: string; totp_enabled: boolean }
export interface Project { id: string; name: string; description: string; owner_id: string; created_at: string }
export interface ProjectMember { id: string; user_id: string; role: string; user?: User }
export interface Environment { id: string; project_id: string; name: string; locked: boolean; created_at: string }
export interface Variable { id: string; environment_id: string; key: string; value: string; created_at: string; updated_at: string }
export interface VariableVersion { id: string; variable_id: string; environment_id: string; key: string; action: string; actor_id: string; actor?: User; created_at: string }
export interface DiffEntry { key: string; status: "same" | "changed" | "missing_in_a" | "missing_in_b" }

// ── Auth ─────────────────────────────────────────────────────────────────────

export const auth = {
  register: (name: string, email: string, password: string) =>
    req<{ token: string; user: User }>("/api/v1/auth/register", {
      method: "POST", body: JSON.stringify({ name, email, password }),
    }),
  updateMe: (name: string) =>
    req<User>("/api/v1/auth/me", { method: "PUT", body: JSON.stringify({ name }) }),
  changePassword: (current_password: string, new_password: string) =>
    req<{ message: string }>("/api/v1/auth/change-password", {
      method: "POST", body: JSON.stringify({ current_password, new_password }),
    }),
  login: (email: string, password: string) =>
    req<{ token: string }>("/api/v1/auth/login", {
      method: "POST", body: JSON.stringify({ email, password }),
    }),
  me: () => req<User>("/api/v1/auth/me"),
  refresh: () => req<{ token: string }>("/api/v1/auth/refresh", { method: "POST" }),
  logout: () => req<void>("/api/v1/auth/logout", { method: "POST" }),
  deviceCode: () =>
    req<{ device_code: string; user_code: string; expires_in: number }>("/api/v1/auth/device", { method: "POST" }),
  deviceActivate: (user_code: string) =>
    req<{ message: string }>("/api/v1/auth/device/activate", {
      method: "POST", body: JSON.stringify({ user_code }),
    }),
  // 2FA
  login2fa: (state_token: string, code: string) =>
    req<{ token: string }>("/api/v1/auth/login/2fa", {
      method: "POST", body: JSON.stringify({ state_token, code }),
    }),
  setup2fa: () =>
    req<{ qr_url: string }>("/api/v1/auth/2fa/setup", { method: "POST" }),
  confirm2fa: (code: string) =>
    req<{ message: string }>("/api/v1/auth/2fa/confirm", {
      method: "POST", body: JSON.stringify({ code }),
    }),
  disable2fa: (code: string) =>
    req<{ message: string }>("/api/v1/auth/2fa", {
      method: "DELETE", body: JSON.stringify({ code }),
    }),
  revealUnlock: (code: string) =>
    req<{ reveal_token: string; expires_in: number }>("/api/v1/auth/reveal/unlock", {
      method: "POST", body: JSON.stringify({ code }),
    }),
  forgotPassword: (email: string) =>
    req<{ request_id: string }>("/api/v1/auth/forgot-password", {
      method: "POST", body: JSON.stringify({ email }),
    }),
  resetPassword: (request_id: string, code: string, new_password: string) =>
    req<{ message: string }>("/api/v1/auth/reset-password", {
      method: "POST", body: JSON.stringify({ request_id, code, new_password }),
    }),
  deleteMe: (password: string) =>
    req<{ message: string }>("/api/v1/auth/me", {
      method: "DELETE", body: JSON.stringify({ password }),
    }),
}

// ── Users ─────────────────────────────────────────────────────────────────────

export const users = {
  search: (email: string) =>
    req<{ id: string; name: string; email: string }>(`/api/v1/users/search?email=${encodeURIComponent(email)}`),
}

// ── Global search ─────────────────────────────────────────────────────────────

export interface SearchResult {
  type: "project" | "variable"
  id: string
  name?: string
  key?: string
  project_id?: string
  project_name?: string
  environment_id?: string
  environment_name?: string
  updated_at?: string
}

export const globalSearch = {
  query: (q: string) =>
    req<SearchResult[]>(`/api/v1/search?q=${encodeURIComponent(q)}`),
}

// ── Activity ──────────────────────────────────────────────────────────────────

export interface ActivityEntry {
  id: string
  key: string
  action: string
  environment_id: string
  environment_name: string
  actor_id: string
  actor_name: string
  actor_email: string
  created_at: string
}

export const activity = {
  list: (projectId: string, envId?: string, action?: string, offset = 0, limit = 50) => {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
    if (envId) params.set("env", envId)
    if (action) params.set("action", action)
    return req<ActivityEntry[]>(`/api/v1/projects/${projectId}/activity?${params}`)
  },
}

// ── Project tokens ────────────────────────────────────────────────────────────

export interface ProjectToken {
  id: string
  name: string
  token_prefix: string
  permissions: string
  created_by_id: string
  last_used_at?: string
  created_at: string
}

export const tokens = {
  list: (projectId: string) =>
    req<ProjectToken[]>(`/api/v1/projects/${projectId}/tokens`),
  create: (projectId: string, name: string, permissions: string) =>
    req<{ token: string; id: string; name: string; permissions: string; prefix: string; created_at: string }>(
      `/api/v1/projects/${projectId}/tokens`,
      { method: "POST", body: JSON.stringify({ name, permissions }) }
    ),
  revoke: (projectId: string, tokenId: string) =>
    req<void>(`/api/v1/projects/${projectId}/tokens/${tokenId}`, { method: "DELETE" }),
}

// ── Projects ─────────────────────────────────────────────────────────────────

export const projects = {
  list: () => req<Project[]>("/api/v1/projects"),
  create: (name: string, description: string) =>
    req<Project>("/api/v1/projects", { method: "POST", body: JSON.stringify({ name, description }) }),
  get: (id: string) => req<Project>(`/api/v1/projects/${id}`),
  update: (id: string, name: string, description: string) =>
    req<Project>(`/api/v1/projects/${id}`, { method: "PUT", body: JSON.stringify({ name, description }) }),
  delete: (id: string) => req<void>(`/api/v1/projects/${id}`, { method: "DELETE" }),
  members: (id: string) => req<ProjectMember[]>(`/api/v1/projects/${id}/members`),
  // invite by email — backend resolves email → user_id internally
  addMember: (id: string, email: string, role: string) =>
    req<void>(`/api/v1/projects/${id}/members`, { method: "POST", body: JSON.stringify({ email, role }) }),
  updateMemberRole: (id: string, uid: string, role: string) =>
    req<void>(`/api/v1/projects/${id}/members/${uid}`, { method: "PUT", body: JSON.stringify({ role }) }),
  removeMember: (id: string, uid: string) =>
    req<void>(`/api/v1/projects/${id}/members/${uid}`, { method: "DELETE" }),
}

// ── Environments ──────────────────────────────────────────────────────────────

export const environments = {
  list: (projectId: string) => req<Environment[]>(`/api/v1/projects/${projectId}/environments`),
  create: (projectId: string, name: string) =>
    req<Environment>(`/api/v1/projects/${projectId}/environments`, {
      method: "POST", body: JSON.stringify({ name }),
    }),
  rename: (projectId: string, envId: string, name: string) =>
    req<Environment>(`/api/v1/projects/${projectId}/environments/${envId}`, {
      method: "PUT", body: JSON.stringify({ name }),
    }),
  setLock: (projectId: string, envId: string, locked: boolean) =>
    req<Environment>(`/api/v1/projects/${projectId}/environments/${envId}/lock`, {
      method: "PATCH", body: JSON.stringify({ locked }),
    }),
  delete: (projectId: string, envId: string) =>
    req<void>(`/api/v1/projects/${projectId}/environments/${envId}`, { method: "DELETE" }),
  clone: (projectId: string, srcEnvId: string, targetEnvId: string) =>
    req<{ synced: number }>(`/api/v1/projects/${projectId}/environments/${srcEnvId}/clone`, {
      method: "POST", body: JSON.stringify({ target_env_id: targetEnvId }),
    }),
}

// ── Variables ─────────────────────────────────────────────────────────────────

export const variables = {
  list: (projectId: string, envId: string) =>
    req<Variable[]>(`/api/v1/projects/${projectId}/environments/${envId}/variables`),
  create: (projectId: string, envId: string, key: string, value: string) =>
    req<Variable>(`/api/v1/projects/${projectId}/environments/${envId}/variables`, {
      method: "POST", body: JSON.stringify({ key, value }),
    }),
  update: (projectId: string, envId: string, varId: string, value: string) =>
    req<Variable>(`/api/v1/projects/${projectId}/environments/${envId}/variables/${varId}`, {
      method: "PUT", body: JSON.stringify({ value }),
    }),
  delete: (projectId: string, envId: string, varId: string) =>
    req<void>(`/api/v1/projects/${projectId}/environments/${envId}/variables/${varId}`, { method: "DELETE" }),
  export: (projectId: string, envId: string, revealToken?: string): Promise<string> => {
    const token = getToken()
    return fetch(`${BASE}/api/v1/projects/${projectId}/environments/${envId}/export`, {
      headers: {
        Authorization: `Bearer ${token}`,
        ...(revealToken ? { "X-Reveal-Token": revealToken } : {}),
      },
    }).then(async r => {
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        throw new Error(body.error ?? `Export failed (${r.status})`)
      }
      return r.text()
    })
  },
  import: (projectId: string, envId: string, content: string) =>
    req<{ message: string; synced: number }>(`/api/v1/projects/${projectId}/environments/${envId}/import`, {
      method: "POST", body: JSON.stringify({ content }),
    }),
  diff: (projectId: string, fromEnvId: string, toEnvId: string) =>
    req<DiffEntry[]>(`/api/v1/projects/${projectId}/diff?from=${fromEnvId}&to=${toEnvId}`),
}

// ── Webhooks ──────────────────────────────────────────────────────────────────

export interface Webhook {
  id: string
  project_id: string
  url: string
  events: string[]
  active: boolean
  created_at: string
}

export const webhooks = {
  list: (projectId: string) =>
    req<Webhook[]>(`/api/v1/projects/${projectId}/webhooks`),
  create: (projectId: string, url: string, events: string[]) =>
    req<Webhook>(`/api/v1/projects/${projectId}/webhooks`, {
      method: "POST", body: JSON.stringify({ url, events }),
    }),
  delete: (projectId: string, webhookId: string) =>
    req<void>(`/api/v1/projects/${projectId}/webhooks/${webhookId}`, { method: "DELETE" }),
}

// ── History & Rollback ────────────────────────────────────────────────────────

export const history = {
  list: (projectId: string, envId: string, offset = 0, limit = 50) =>
    req<VariableVersion[]>(`/api/v1/projects/${projectId}/environments/${envId}/history?limit=${limit}&offset=${offset}`),
  rollback: (projectId: string, envId: string, versionId: string) =>
    req<{ message: string }>(`/api/v1/projects/${projectId}/environments/${envId}/rollback/${versionId}`, {
      method: "POST",
    }),
}
