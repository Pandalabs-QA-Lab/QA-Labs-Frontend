import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'

export function useMilestones(projectId) {
  const [milestones, setMilestones] = useState([])

  const refresh = useCallback(async () => {
    if (!projectId) return
    setMilestones(await api.get(`/projects/${projectId}/milestones`))
  }, [projectId])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount, not a derived-state sync
  useEffect(() => { refresh() }, [refresh])

  const addMilestone = useCallback(async (data) => {
    const milestone = await api.post(`/projects/${projectId}/milestones`, data)
    setMilestones((prev) => [...prev, milestone])
    return milestone
  }, [projectId])

  // Bidirectional sync with TestPlan.milestoneId happens server-side.
  const updateMilestone = useCallback(async (milestone) => {
    const updated = await api.patch(`/projects/${projectId}/milestones/${milestone.id}`, milestone)
    setMilestones((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
    return updated
  }, [projectId])

  const removeMilestone = useCallback(async (id) => {
    await api.delete(`/projects/${projectId}/milestones/${id}`)
    setMilestones((prev) => prev.filter((m) => m.id !== id))
  }, [projectId])

  return { milestones, addMilestone, updateMilestone, removeMilestone, refresh }
}
