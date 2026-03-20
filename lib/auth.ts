// With HttpOnly cookies, the token is not accessible via JavaScript.
// The browser sends it automatically with credentials: 'include'.

export function getAuthToken(): string | null {
  // Token is now in an HttpOnly cookie - not accessible from JS
  return null
}

export function authHeaders(): HeadersInit {
  // No longer need to send Authorization header - cookie is sent automatically
  return { 'Content-Type': 'application/json' }
}

export function getUser(): { id: string; email: string; name: string; role: string } | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem('vulncontrol_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function logout() {
  // Clear the HttpOnly cookie by making a request, or just clear local state
  // The cookie will be cleared by max-age expiration or server-side
  document.cookie = 'vulncontrol_token=; path=/; max-age=0'
  document.cookie = 'vulncontrol_auth=; path=/; max-age=0'
  localStorage.removeItem('vulncontrol_user')
  window.location.href = '/login'
}
