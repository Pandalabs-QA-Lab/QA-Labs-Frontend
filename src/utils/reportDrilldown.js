import { isOpenBug } from './reportMetrics.js'
import { normalizeTestStatus } from './status.js'

const caseMetrics = {
  passed: 'Pass', failed: 'Fail', blocker: 'Blocker', skipped: 'Skipped',
  pending: 'Not Executed', reported: 'Reported', inProgress: 'Testing in Progress',
  hold: 'Hold', needClarification: 'Need Clarification',
}

export function matchesReportBug(bug, { status = '', severity = '', module = '' } = {}) {
  if (status === 'Unresolved' ? !isOpenBug(bug) : status && bug.status !== status) return false
  const normalizedSeverity = ['critical', 'major'].includes(String(bug.severity || '').trim().toLowerCase())
    ? String(bug.severity).trim().toLowerCase() : 'minor'
  if (severity === 'Non-critical' ? normalizedSeverity === 'critical'
    : severity && normalizedSeverity !== severity.toLowerCase()) return false
  return !module || (bug.module || 'Unassigned') === module
}

export function getReportDrilldown({ metric, rows, projectId, module, getTestCases, getBugs }) {
  const status = Object.hasOwn(caseMetrics, metric) ? caseMetrics[metric] : null
  const severity = ['critical', 'major', 'minor'].includes(metric) ? metric[0].toUpperCase() + metric.slice(1) : ''
  if (!status && !severity && metric !== 'openBugs' && metric !== 'risk') return null
  const entries = []
  for (const row of rows) {
    if (metric === 'risk') {
      if (row.id !== projectId || module == null) continue
      for (const result of ['Fail', 'Blocker']) {
        const count = getTestCases(row.id).filter((tc) => (tc.module || 'Unassigned') === module && normalizeTestStatus(tc.status) === result).length
        if (count) entries.push({ name: `${row.name} · ${module} · ${result}`, count, unit: 'cases', to: `/projects/${row.id}/test-cases?module=${encodeURIComponent(module)}&status=${result}` })
      }
      const count = getBugs(row.id).filter((b) => matchesReportBug(b, { status: 'Unresolved', module })).length
      if (count) entries.push({ name: `${row.name} · ${module}`, count, unit: 'unresolved bugs', to: `/projects/${row.id}/bugs?module=${encodeURIComponent(module)}&status=Unresolved` })
    } else {
      const count = status ? row[metric] : severity ? row[metric] : row.openBugs
      if (count > 0) entries.push({ name: row.name, count, unit: status ? 'cases' : 'bugs',
        to: `/projects/${row.id}/${status ? `test-cases?status=${encodeURIComponent(status)}` : `bugs?status=Unresolved${severity ? `&severity=${severity}` : ''}`}` })
    }
  }
  return { title: metric === 'risk' ? 'Risk details' : status ? `${status} cases by project` : `${severity || 'Unresolved'} bugs by project`,
    description: 'Choose a project to review the matching records.', entries }
}
