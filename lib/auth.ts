export function getAuthToken(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/vulncontrol_token=([^;]+)/)
  return match ? match[1] : null
}

export function authHeaders(): HeadersInit {
  const token = getAuthToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
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
  document.cookie = 'vulncontrol_token=; path=/; max-age=0'
  document.cookie = 'vulncontrol_auth=; path=/; max-age=0'
  localStorage.removeItem('vulncontrol_user')
  window.location.href = '/login'
}
