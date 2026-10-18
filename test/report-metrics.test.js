import test from 'node:test'
import assert from 'node:assert/strict'
import { getTestCaseStatusCounts, getGlobalReportMetrics } from '../src/utils/reportMetrics.js'
import { getReportDrilldown, matchesReportBug } from '../src/utils/reportDrilldown.js'

const recentRun = { completedAt: new Date(Date.now() - 86400000).toISOString() }
function portfolio(cases, runs = [recentRun], bugs = []) {
  return getGlobalReportMetrics({ projects: [{ id: 'a', name: 'Alpha' }],
    getTestCases: () => cases.map((status) => ({ status })), getBugs: () => bugs, getTestRuns: () => runs })
}

test('execution counts results, excluding unfinished statuses, and preserves every status', () => {
  const counts = getTestCaseStatusCounts(['Pass', 'Fail', 'Blocker', 'Skipped', 'Reported', 'Testing in Progress', 'Hold', 'Need Clarification', 'Not Executed'].map((status) => ({ status })))
  assert.equal(counts.total, 9)
  assert.equal(counts.executed, 4)
  assert.equal(counts.coverage, 44)
  assert.equal(portfolio(['Pass', 'Hold']).totals.executed, 1)
})

test('readiness requires all passed, no unresolved bugs and fresh completed evidence', () => {
  assert.equal(portfolio(['Pass']).overallReadiness.label, 'Ready')
  for (const status of ['Not Executed', 'Testing in Progress', 'Reported', 'Hold', 'Need Clarification', 'Skipped']) {
    assert.notEqual(portfolio(['Pass', 'Pass', 'Pass', status]).rows[0].readiness.label, 'Ready')
  }
  for (const runs of [[], [{ completedAt: 'invalid' }], [{ completedAt: new Date(Date.now() - 15 * 86400000).toISOString() }], [{ status: 'In progress', date: recentRun.completedAt }]]) {
    const report = portfolio(['Pass'], runs)
    assert.notEqual(report.rows[0].readiness.label, 'Ready')
    assert.notEqual(report.overallReadiness.label, 'Ready')
  }
  assert.notEqual(portfolio(['Pass'], [recentRun], [{ status: 'In review' }]).overallReadiness.label, 'Ready')
  assert.equal(portfolio([]).overallReadiness.label, 'No data')
})

test('workspace drilldowns preserve counts across projects and match bug filters', () => {
  const bugs = [{ severity: 'Critical', status: 'Open' }, { severity: 'Critical', status: 'In review' }, { severity: 'Critical', status: 'Closed' }, { severity: 'Major', status: 'In review' }, { status: 'Open' }]
  const rows = [{ id: 'a', name: 'Alpha', critical: 2 }, { id: 'b', name: 'Beta', critical: 1 }]
  const detail = getReportDrilldown({ metric: 'critical', rows })
  assert.equal(detail.entries.reduce((n, e) => n + e.count, 0), 3)
  const query = Object.fromEntries(new URL(detail.entries[0].to, 'http://localhost').searchParams)
  assert.equal(bugs.filter((b) => matchesReportBug(b, query)).length, 2)
  assert.equal(bugs.filter((b) => matchesReportBug(b, { status: 'Unresolved', severity: 'Non-critical' })).length, 2)
  assert.equal(getReportDrilldown({ metric: 'unknown', rows }), null)
})

test('risk drilldown isolates same-named modules in different projects and includes cases and defects', () => {
  const detail = getReportDrilldown({ metric: 'risk', projectId: 'a', module: 'Checkout',
    rows: [{ id: 'a', name: 'Alpha' }, { id: 'b', name: 'Beta' }],
    getTestCases: () => [{ module: 'Checkout', status: 'Fail' }, { module: 'Checkout', status: 'Blocker' }, { module: 'Other', status: 'Fail' }],
    getBugs: () => [{ module: 'Checkout', status: 'In review' }, { module: 'Checkout', status: 'Closed' }] })
  assert.equal(detail.entries.length, 3)
  assert.ok(detail.entries.every((e) => e.to.startsWith('/projects/a/') && e.count === 1))
})
