// With HttpOnly cookies, the token is not accessible via JavaScript.
// The browser sends it automatically with credentials: 'include'.

const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL
  if (typeof window !== 'undefined') {
    return `http://${window.location.hostname}:9001`
  }
  return 'http://localhost:9001'
}

export function getAuthToken(): string | null {
  return null
}

export function authHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json' }
}

export function getUser(): { id: string; email: string; name: string; role: string; organizationId?: string } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('epicvuln_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function logout() {
  // Clear ALL local state FIRST (before any async calls)
  document.cookie = 'epicvuln_session=; path=/; max-age=0'
  document.cookie = 'epicvuln_token=; path=/; max-age=0'
  // Also try clearing with domain variants
  document.cookie = 'epicvuln_session=; path=/; max-age=0; domain=localhost'
  document.cookie = 'epicvuln_token=; path=/; max-age=0; domain=localhost'
  localStorage.removeItem('epicvuln_user')

  // Call backend to clear HttpOnly cookie (fire and forget)
  fetch(`${getApiUrl()}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  }).catch(() => {})

  // Redirect immediately
  window.location.href = '/login'
}
