import { summarizeStatuses } from './status.js'
import { isOpenBug } from './reportMetrics.js'

const timestamp = (value) => {
  const time = Date.parse(value)
  return Number.isFinite(time) ? time : 0
}

export function getProjectOverview(project, data, members = []) {
  const counts = summarizeStatuses(data.testCases)
  const openBugs = data.bugs.filter(isOpenBug).length
  const segments = [
    { label: 'Passed', count: counts.passed, tone: 'passed' },
    { label: 'Failed', count: counts.failed, tone: 'failed' },
    { label: 'Blocked', count: counts.blocker, tone: 'blocked' },
    { label: 'Not executed', count: counts.pending, tone: 'pending' },
    { label: 'In progress', count: counts.testingInProgress, tone: 'active' },
    { label: 'Reported', count: counts.reported, tone: 'reported' },
    { label: 'On hold', count: counts.hold, tone: 'hold' },
    { label: 'Needs clarification', count: counts.needClarification, tone: 'clarification' },
    { label: 'Skipped', count: counts.skipped, tone: 'skipped' },
  ]
  const recorded = counts.passed + counts.failed + counts.blocker + counts.skipped + counts.reported
  const needsAttention = counts.failed + counts.blocker + counts.hold + counts.needClarification + openBugs > 0
  const status = needsAttention ? { label: 'Needs attention', tone: 'failed' }
    : counts.total === 0 ? { label: 'No test cases', tone: 'neutral' }
    : recorded === 0 && counts.testingInProgress === 0 ? { label: 'Not started', tone: 'neutral' }
    : recorded < counts.total ? { label: 'Testing in progress', tone: 'pending' }
    : { label: 'Execution complete', tone: 'passed' }
  const lastRun = [...data.runs].sort((a, b) =>
    timestamp(b.completedAt || b.date || b.createdAt) - timestamp(a.completedAt || a.date || a.createdAt))[0]
  const updated = [...data.testCases, ...data.bugs, ...data.runs].reduce((latest, item) =>
    Math.max(latest, timestamp(item.updatedAt), timestamp(item.completedAt), timestamp(item.createdAt), timestamp(item.date)),
  timestamp(project.updatedAt || project.createdAt))
  return { ...project, counts, segments, recorded, openBugs, status, lastRun, updated,
    totalRuns: data.runs.length,
    projectMembers: members.filter((member) => project.memberIds?.includes(member.id)) }
}

export function filterAndSortProjects(projects, search, filter, sort) {
  const query = search.trim().toLocaleLowerCase()
  return projects.filter((project) => {
    const matchesSearch = [project.name, project.description, ...project.projectMembers.map((member) => member.name)]
      .some((value) => String(value || '').toLocaleLowerCase().includes(query))
    return matchesSearch && (filter === 'all' || project.status.label === filter)
  }).sort((a, b) => {
    if (sort === 'name') return a.name.localeCompare(b.name)
    if (sort === 'attention') return Number(b.status.label === 'Needs attention') - Number(a.status.label === 'Needs attention')
      || b.openBugs - a.openBugs || b.updated - a.updated || a.name.localeCompare(b.name)
    return b.updated - a.updated || a.name.localeCompare(b.name)
  })
}
