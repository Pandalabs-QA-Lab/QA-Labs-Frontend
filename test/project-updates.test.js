import test from 'node:test'
import assert from 'node:assert/strict'
import { api } from '../src/api/client.js'

test('successful project writes notify the summary; reads and failed writes do not', async () => {
  const previous = { window: globalThis.window, localStorage: globalThis.localStorage, fetch: globalThis.fetch }
  globalThis.window = new EventTarget()
  globalThis.localStorage = { getItem: () => null, removeItem() {} }
  const updates = []
  window.addEventListener('qa-project-updated', (event) => updates.push(event.detail.projectId))
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ id: 'case-1' }), { status: 200 })
    await api.get('/projects/demo/test-cases')
    assert.deepEqual(updates, [])
    await api.patch('/projects/demo/test-cases/case-1', { status: 'Pass' })
    assert.deepEqual(updates, ['demo'])
    globalThis.fetch = async () => new Response(null, { status: 204 })
    await api.delete('/projects/demo/bugs/bug-1')
    assert.deepEqual(updates, ['demo', 'demo'])
    globalThis.fetch = async () => new Response(JSON.stringify({ error: 'Denied' }), { status: 403 })
    await assert.rejects(api.post('/projects/demo/test-runs', {}), /Denied/)
    assert.deepEqual(updates, ['demo', 'demo'])
  } finally {
    Object.assign(globalThis, previous)
  }
})
