import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'

// Backend enums are SCREAMING_SNAKE_CASE; the frontend has always used
// display-label strings for these fields. Translate on read only - the
// backend's own alias map already accepts these exact display strings on
// write. `linkedTestCase` (frontend) <-> `linkedTestCaseId` (backend FK
// column) is also translated here to avoid touching every page that reads
// bug.linkedTestCase.
const SEVERITY_TO_LABEL = { CRITICAL: 'Critical', MAJOR: 'Major', MINOR: 'Minor' }
const PRIORITY_TO_LABEL = { HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' }
const STATUS_TO_LABEL = { OPEN: 'Open', IN_REVIEW: 'In review', CLOSED: 'Closed' }
const RETEST_TO_LABEL = { NOT_RETESTED: 'Not Retested', PASSED: 'Passed', FAILED: 'Failed' }

export function fromApi(bug) {
  if (!bug) return bug
  return {
    ...bug,
    severity: SEVERITY_TO_LABEL[bug.severity] || bug.severity,
    priority: PRIORITY_TO_LABEL[bug.priority] || bug.priority,
    status: STATUS_TO_LABEL[bug.status] || bug.status,
    retestStatus: RETEST_TO_LABEL[bug.retestStatus] || bug.retestStatus,
    linkedTestCase: bug.linkedTestCaseId || '',
  }
}

function toApi(data) {
  if (!('linkedTestCase' in data)) return data
  const { linkedTestCase, ...rest } = data
  return { ...rest, linkedTestCaseId: linkedTestCase || null }
}

export function useBugs(projectId) {
  const [bugs, setBugs] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    const data = await api.get(`/projects/${projectId}/bugs`)
    setBugs(data.map(fromApi))
    setLoading(false)
  }, [projectId])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount, not a derived-state sync
  useEffect(() => { refresh() }, [refresh])

  const addBug = useCallback(async (data) => {
    const bug = fromApi(await api.post(`/projects/${projectId}/bugs`, toApi(data)))
    setBugs((prev) => [bug, ...prev])
    return bug
  }, [projectId])

  const removeBug = useCallback(async (id) => {
    await api.delete(`/projects/${projectId}/bugs/${id}`)
    setBugs((prev) => prev.filter((b) => b.id !== id))
  }, [projectId])

  const updateBug = useCallback(async (bug) => {
    const updated = fromApi(await api.patch(`/projects/${projectId}/bugs/${bug.id}`, toApi(bug)))
    setBugs((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
    return updated
  }, [projectId])

  return { bugs, loading, addBug, removeBug, updateBug, refresh }
}
