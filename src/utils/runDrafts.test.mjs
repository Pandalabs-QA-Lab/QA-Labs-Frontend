import test from 'node:test'
import assert from 'node:assert/strict'
import { api } from '../api/client.js'
import { saveRunDraft, clearRunDraft } from './runDrafts.js'

test('draft edits remain ordered and clearing waits for outstanding saves', async () => {
  const originalPut = api.put
  const originalDelete = api.delete
  const calls = []
  let releaseFirst
  api.put = async (_, draft) => {
    calls.push(draft.currentIndex)
    if (draft.currentIndex === 1) await new Promise((resolve) => { releaseFirst = resolve })
  }
  api.delete = async () => { calls.push('cleared') }
  try {
    const first = saveRunDraft('ordering-test', { currentIndex: 1 })
    const second = saveRunDraft('ordering-test', { currentIndex: 2 })
    const cleared = clearRunDraft('ordering-test')
    await new Promise((resolve) => setImmediate(resolve))
    assert.deepEqual(calls, [1])
    releaseFirst()
    assert.deepEqual(await Promise.all([first, second]), [true, true])
    await cleared
    assert.deepEqual(calls, [1, 2, 'cleared'])
  } finally { api.put = originalPut; api.delete = originalDelete }
})

test('failed autosave reports failure and allows the next save to recover', async () => {
  const originalPut = api.put
  api.put = async (_, draft) => { if (draft.currentIndex === 1) throw new Error('offline') }
  try {
    const failed = saveRunDraft('retry-test', { currentIndex: 1 })
    const retry = saveRunDraft('retry-test', { currentIndex: 2 })
    assert.equal(await failed, false)
    assert.equal(await retry, true)
  } finally { api.put = originalPut }
})
