import test from 'node:test'
import assert from 'node:assert/strict'
import { getPlanTestCases, getPlanMetrics, getMilestoneMetrics } from '../src/utils/planMetrics.js'
import { buildLatestStatusMap, getRequirementCoverage } from '../src/utils/coverageMetrics.js'

const cases = [{ id: 'login' }, { id: 'checkout' }]
const requirements = [{ id: 'req', testCaseIds: ['login'] }]
const plan = { id: 'plan', requirementIds: ['req'], testCaseIds: ['login', 'checkout'] }

test('scope combines direct and requirement-linked cases without duplicates', () => {
  assert.deepEqual(getPlanTestCases(plan, requirements, cases), cases)
})

test('latest imported results replace historical passes, including zero passes', () => {
  const runs = [
    { testPlanId: 'plan', date: '2026-09-30', total: 2, passed: 2, cases: cases.map(c => ({ testCaseId: c.id, status: 'PASS' })) },
    { testPlanId: 'plan', date: '2026-10-01', total: 2, passed: 0, linkedBugIds: ['bug'], cases: cases.map(c => ({ testCaseId: c.id, status: 'FAIL' })) },
  ]
  const metrics = getPlanMetrics(plan, runs, requirements, cases, [{ id: 'bug' }])
  assert.equal(metrics.totalCases, 2)
  assert.equal(metrics.passedCases, 0)
  assert.equal(metrics.scopeFailed, 2)
  assert.equal(metrics.progressPct, 100)
  assert.equal(metrics.passRate, 0)
  assert.equal(metrics.bugCount, 1)
  const milestone = getMilestoneMetrics({ testPlanIds: ['plan'] }, [plan], runs, requirements, cases, [{ id: 'bug' }])
  assert.equal(milestone.passedCases, 0)
  assert.equal(milestone.bugCount, 1)
  const coverage = getRequirementCoverage({ testCaseIds: ['login', 'checkout', 'login', 'missing'] }, new Map(cases.map(c => [c.id, c])), buildLatestStatusMap(runs))
  assert.equal(coverage.total, 2)
  assert.equal(coverage.pct, 0)
  assert.equal(coverage.verdict, 'Failing')
})

test('coverage distinguishes missing scope, blocked execution and successful retests', () => {
  const byId = new Map(cases.map(c => [c.id, c]))
  assert.equal(getRequirementCoverage({ testCaseIds: [] }, byId, {}).verdict, 'Uncovered')
  assert.equal(getRequirementCoverage(requirements[0], byId, {}).verdict, 'Pending')
  assert.equal(getRequirementCoverage(requirements[0], byId, { login: 'Blocker' }).verdict, 'Blocked')
  const runs = [{ date: '2026-09-30', cases: [{ testCaseId: 'login', status: 'Fail' }] }, { date: '2026-10-01', cases: [{ testCaseId: 'login', status: 'Pass' }] }]
  assert.equal(getRequirementCoverage(requirements[0], byId, buildLatestStatusMap(runs)).verdict, 'Verified')
})
