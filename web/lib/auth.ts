const TOKEN_KEY = "dotkey_token"

export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export function isLoggedIn(): boolean {
  return !!getToken()
}

export function tokenExpiresInSeconds(): number | null {
  const token = getToken()
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split(".")[1]))
    if (!payload.exp) return null
    return payload.exp - Math.floor(Date.now() / 1000)
  } catch {
    return null
  }
}

export function isTokenExpiringSoon(): boolean {
  const remaining = tokenExpiresInSeconds()
  if (remaining === null) return false
  return remaining < 3600 // refresh if less than 1 hour left
}
