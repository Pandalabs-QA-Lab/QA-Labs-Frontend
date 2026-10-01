import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchProjectData, getTestCases, getBugs, getTestRuns, getMilestones, getTestPlans } from '../src/utils/workspaceCache.js'

test('aggregate readers use fetched API records in a fresh browser with no legacy data', async () => {
  const previous = { fetch: globalThis.fetch, localStorage: globalThis.localStorage }
  globalThis.localStorage = { getItem: (key) => {
    assert.equal(key, 'qa_jwt', 'aggregate data must not read old browser storage')
    return null
  } }
  const payloads = {
    'test-cases': [{ id: 'case-1', status: 'PASS', priority: 'HIGH' }, { id: 'case-2', status: 'FAIL' }],
    bugs: [{ id: 'bug-1', status: 'OPEN', severity: 'MAJOR', linkedTestCaseId: 'case-2' }],
    'test-runs': [{ id: 'run-1' }], requirements: [{ id: 'req-1' }],
    'test-plans': [{ id: 'plan-1' }], milestones: [{ id: 'milestone-1' }],
  }
  globalThis.fetch = async (url) => new Response(JSON.stringify(payloads[url.split('/').pop()]), { status: 200 })
  try {
    assert.deepEqual(getTestCases('fresh-project'), [])
    await fetchProjectData('fresh-project')
    assert.equal(getTestCases('fresh-project').length, 2)
    assert.equal(getTestCases('fresh-project')[0].status, 'Pass')
    assert.equal(getTestCases('fresh-project')[0].priority, 'High')
    assert.equal(getBugs('fresh-project')[0].status, 'Open')
    assert.equal(getBugs('fresh-project')[0].linkedTestCase, 'case-2')
    assert.equal(getTestRuns('fresh-project')[0].id, 'run-1')
    assert.equal(getTestPlans('fresh-project')[0].id, 'plan-1')
    assert.equal(getMilestones('fresh-project')[0].id, 'milestone-1')
    globalThis.fetch = async () => new Response(JSON.stringify({ error: 'API unavailable' }), { status: 503 })
    await assert.rejects(fetchProjectData('fresh-project'), /API unavailable/)
    assert.equal(getTestCases('fresh-project').length, 2, 'failed refresh must not erase loaded records')
  } finally { Object.assign(globalThis, previous) }
})
