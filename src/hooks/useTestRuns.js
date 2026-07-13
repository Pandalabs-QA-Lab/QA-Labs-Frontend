import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'

export function useTestRuns(projectId) {
  const [runs, setRuns] = useState([])

  const refresh = useCallback(async () => {
    if (!projectId) return
    setRuns(await api.get(`/projects/${projectId}/test-runs`))
  }, [projectId])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount, not a derived-state sync
  useEffect(() => { refresh() }, [refresh])

  const addRun = useCallback(async (data) => {
    const run = await api.post(`/projects/${projectId}/test-runs`, data)
    setRuns((prev) => [run, ...prev])
    return run
  }, [projectId])

  const updateRun = useCallback(async (run) => {
    const updated = await api.patch(`/projects/${projectId}/test-runs/${run.id}`, run)
    setRuns((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
    return updated
  }, [projectId])

  return { runs, addRun, updateRun, refresh }
}
