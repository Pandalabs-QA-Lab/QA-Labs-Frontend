import test from 'node:test'
import assert from 'node:assert/strict'
import { api } from '../src/api/client.js'

test('network failures, timeouts and server failures preserve the session; 401 expires it', async () => {
  const previous = { window: globalThis.window, localStorage: globalThis.localStorage, fetch: globalThis.fetch }
  let token = 'saved-session', expired = 0
  globalThis.window = new EventTarget()
  window.addEventListener('qa-auth-expired', () => expired++)
  globalThis.localStorage = { getItem: () => token, removeItem: () => { token = null } }
  try {
    globalThis.fetch = async () => { throw new TypeError('Failed to fetch') }
    await assert.rejects(api.get('/auth/me'), /Cannot connect/)
    assert.equal(token, 'saved-session')
    globalThis.fetch = (_, { signal }) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('aborted'))))
    await assert.rejects(api.get('/auth/me', { timeoutMs: 10 }), /too long/)
    assert.equal(token, 'saved-session')
    globalThis.fetch = async () => new Response('<html>Gateway unavailable</html>', { status: 503 })
    await assert.rejects(api.get('/auth/me'), error => error.status === 503 && /temporarily unavailable/.test(error.message))
    assert.equal(token, 'saved-session')
    assert.equal(expired, 0)
    globalThis.fetch = async () => new Response(JSON.stringify({ error: 'Session expired' }), { status: 401 })
    await assert.rejects(api.get('/auth/me'), error => error.status === 401)
    assert.equal(token, null)
    assert.equal(expired, 1)
  } finally { Object.assign(globalThis, previous) }
})

test('an old unauthorized response cannot clear a newer session', async () => {
  const previous = { window: globalThis.window, localStorage: globalThis.localStorage, fetch: globalThis.fetch }
  let token = 'old-session', respond, expired = false
  globalThis.window = new EventTarget()
  window.addEventListener('qa-auth-expired', () => { expired = true })
  globalThis.localStorage = { getItem: () => token, removeItem: () => { token = null } }
  globalThis.fetch = () => new Promise(resolve => { respond = resolve })
  try {
    const pending = api.get('/auth/me')
    token = 'new-session'
    respond(new Response(JSON.stringify({ error: 'Old token expired' }), { status: 401 }))
    await assert.rejects(pending)
    assert.equal(token, 'new-session')
    assert.equal(expired, false)
  } finally { Object.assign(globalThis, previous) }
})
