const API_BASE = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:4000/api'
const TOKEN_KEY = 'qa_jwt'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

async function request(path, { method = 'GET', body, isForm = false, timeoutMs = method === 'GET' ? 20000 : 120000 } = {}) {
  const headers = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (!isForm && body !== undefined) headers['Content-Type'] = 'application/json'

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let res
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method, headers, signal: controller.signal,
      body: isForm ? body : body !== undefined ? JSON.stringify(body) : undefined,
    })
    // Read the body within the deadline as well as the response headers.
    const text = res.status === 204 ? '' : await res.text()
    res = { status: res.status, ok: res.ok, statusText: res.statusText, text }
  } catch (cause) {
    throw new Error(controller.signal.aborted
      ? 'The server took too long to respond. Please try again.'
      : 'Cannot connect to QA Lab. Check your connection and try again.', { cause })
  } finally { clearTimeout(timer) }

  if (res.status === 401 && getToken() === token) {
    setToken(null)
    window.dispatchEvent(new Event('qa-auth-expired'))
  }

  if (!res.ok) {
    let err
    try { err = JSON.parse(res.text) } catch { err = {} }
    const error = new Error(err?.error || (res.status >= 500 ? 'QA Lab is temporarily unavailable. Please try again.' : res.statusText || 'Request failed'))
    error.status = res.status
    throw error
  }
  if (method !== 'GET') {
    const match = path.match(/^\/projects\/([^/]+)\/(test-cases|bugs|test-runs)(?:\/|$)/)
    if (match) window.dispatchEvent(new CustomEvent('qa-project-updated', { detail: { projectId: match[1] } }))
  }
  if (res.status === 204) return null
  try { return JSON.parse(res.text) } catch {
    throw new Error('QA Lab returned an unexpected response. Please try again.')
  }
}

export const api = {
  get: (path, options) => request(path, options),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  delete: (path, body) => request(path, { method: 'DELETE', body }),
  upload: (path, formData) => request(path, { method: 'POST', body: formData, isForm: true }),
}

export function attachmentDownloadUrl(id) {
  return `${API_BASE}/attachments/${id}/download`
}
