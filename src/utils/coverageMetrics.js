import { normalizeTestStatus } from './status.js'

export function buildLatestStatusMap(runs) {
  const sorted = [...runs].sort(
    (a, b) => new Date(a.completedAt || a.date || a.startedAt || a.createdAt || 0) - new Date(b.completedAt || b.date || b.startedAt || b.createdAt || 0),
  )
  const map = {}
  sorted.forEach(run => {
    ;(run.cases || []).forEach(rc => {
      if (rc.testCaseId) map[rc.testCaseId] = normalizeTestStatus(rc.status)
    })
  })
  return map
}

export function getRequirementCoverage(req, tcById, latestStatusMap) {
  const tcStatuses = [...new Set(req.testCaseIds || [])]
    .map(id => tcById.get(id)).filter(Boolean)
    .map(tc => ({ tc, status: normalizeTestStatus(latestStatusMap[tc.id] || tc.status || 'Not Executed') }))
  const total = tcStatuses.length
  const passed = tcStatuses.filter(t => t.status === 'Pass').length
  const failed = tcStatuses.filter(t => t.status === 'Fail').length
  const blocked = tcStatuses.filter(t => t.status === 'Blocker').length
  const pending = tcStatuses.filter(t => t.status === 'Not Executed').length
  const executed = total - pending
  let verdict = 'In progress', verdictTone = 'pending'
  if (!total) { verdict = 'Uncovered'; verdictTone = 'failed' }
  else if (blocked) { verdict = 'Blocked'; verdictTone = 'blocker' }
  else if (failed) { verdict = 'Failing'; verdictTone = 'failed' }
  else if (passed === total) { verdict = 'Verified'; verdictTone = 'passed' }
  else if (!executed) verdict = 'Pending'
  return { req, tcStatuses, total, passed, failed, blocked, pending, executed, verdict, verdictTone, pct: total ? Math.round(passed / total * 100) : 0 }
}
