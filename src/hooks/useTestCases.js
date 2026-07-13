import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'

// Backend enums are SCREAMING_SNAKE_CASE; the frontend has always used the
// display-label strings (used directly for status filtering, dropdown
// values, and STATUS_TONE/TEST_STATUSES lookups). Translate on read only -
// the backend's own alias map already accepts these exact display strings
// on write, so no toApi conversion is needed for these fields.
const STATUS_TO_LABEL = {
  NOT_EXECUTED: 'Not Executed',
  PASS: 'Pass',
  FAIL: 'Fail',
  BLOCKER: 'Blocker',
  SKIPPED: 'Skipped',
  REPORTED: 'Reported',
  NEED_CLARIFICATION: 'Need Clarification',
  TESTING_IN_PROGRESS: 'Testing in Progress',
  HOLD: 'Hold',
}
const PRIORITY_TO_LABEL = { HIGH: 'High', MED: 'Med', LOW: 'Low' }

export function fromApi(tc) {
  if (!tc) return tc
  return {
    ...tc,
    status: STATUS_TO_LABEL[tc.status] || tc.status,
    priority: PRIORITY_TO_LABEL[tc.priority] || tc.priority,
  }
}

export function useTestCases(projectId) {
  const [testCases, setTestCases] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    const data = await api.get(`/projects/${projectId}/test-cases`)
    setTestCases(data.map(fromApi))
    setLoading(false)
  }, [projectId])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount, not a derived-state sync
  useEffect(() => { refresh() }, [refresh])

  const addTestCase = useCallback(async (data) => {
    const tc = fromApi(await api.post(`/projects/${projectId}/test-cases`, data))
    setTestCases((prev) => [...prev, tc])
    return tc
  }, [projectId])

  const removeTestCase = useCallback(async (id) => {
    await api.delete(`/projects/${projectId}/test-cases/${id}`)
    setTestCases((prev) => prev.filter((t) => t.id !== id))
  }, [projectId])

  const removeTestCases = useCallback(async (ids) => {
    await Promise.all(ids.map((id) => api.delete(`/projects/${projectId}/test-cases/${id}`)))
    setTestCases((prev) => prev.filter((t) => !ids.includes(t.id)))
  }, [projectId])

  const updateTestCase = useCallback(async (tc) => {
    const updated = fromApi(await api.patch(`/projects/${projectId}/test-cases/${tc.id}`, tc))
    setTestCases((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    return updated
  }, [projectId])

  return { testCases, loading, addTestCase, removeTestCase, removeTestCases, updateTestCase, refresh }
}
