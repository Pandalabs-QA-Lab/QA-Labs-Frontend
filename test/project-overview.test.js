import test from 'node:test'
import assert from 'node:assert/strict'
import { getProjectOverview, filterAndSortProjects } from '../src/utils/projectOverview.js'

const project = { id: 'one', name: 'Checkout', memberIds: ['member'], createdAt: '2026-10-01T10:00:00Z' }
const data = (statuses, extra = {}) => ({ testCases: statuses.map((status) => ({ status })), bugs: [], runs: [], ...extra })

test('untested projects are neutral and every supported case status is represented', () => {
  assert.equal(getProjectOverview(project, data([])).status.label, 'No test cases')
  const pending = getProjectOverview(project, data(['NOT_EXECUTED', 'Not Executed']))
  assert.equal(pending.status.label, 'Not started')
  assert.equal(pending.recorded, 0)
  const mixed = getProjectOverview(project, data(['Pass', 'Fail', 'Blocker', 'Skipped', 'Reported', 'Hold', 'Need Clarification', 'Testing in Progress', 'Not Executed']))
  assert.equal(mixed.segments.reduce((total, segment) => total + segment.count, 0), 9)
  assert.equal(mixed.segments.every((segment) => segment.count === 1), true)
  assert.equal(mixed.recorded, 5)
  assert.equal(mixed.status.label, 'Needs attention')
})

test('execution status considers open bugs and does not count unfinished work as completed', () => {
  assert.equal(getProjectOverview(project, data(['Pass', 'Not Executed'])).status.label, 'Testing in progress')
  assert.equal(getProjectOverview(project, data(['Testing in Progress'])).recorded, 0)
  assert.equal(getProjectOverview(project, data(['Pass', 'Skipped'])).status.label, 'Execution complete')
  const result = getProjectOverview(project, data(['Pass'], { bugs: [{ status: 'CLOSED' }, { status: 'IN_REVIEW' }] }))
  assert.equal(result.openBugs, 1)
  assert.equal(result.status.label, 'Needs attention')
})

test('latest run and update ordering tolerate missing dates and leave API arrays intact', () => {
  const runs = [{ name: 'Older', date: '2026-10-02T10:00:00Z' }, { name: 'Newer', createdAt: '2026-10-03T10:00:00Z' }]
  const result = getProjectOverview(project, data(['Pass'], { runs }))
  assert.equal(result.lastRun.name, 'Newer')
  assert.equal(result.updated, Date.parse('2026-10-03T10:00:00Z'))
  assert.equal(runs[0].name, 'Older')
})

test('search, status filters and priority sorting use the displayed project data', () => {
  const rows = [getProjectOverview(project, data(['Pass']), [{ id: 'member', name: 'Jaswanth' }]),
    getProjectOverview({ ...project, id: 'two', name: 'Admin', memberIds: [] }, data(['Fail']))]
  assert.equal(filterAndSortProjects(rows, ' jaswanth ', 'all', 'name')[0].id, 'one')
  assert.equal(filterAndSortProjects(rows, '', 'Not started', 'updated').length, 0)
  assert.equal(filterAndSortProjects(rows, '', 'all', 'attention')[0].id, 'two')
  assert.equal(filterAndSortProjects(rows, '', 'all', 'name')[0].name, 'Admin')
  assert.equal(rows[0].id, 'one')
})
