import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'

export function useTestPlans(projectId) {
  const [plans, setPlans] = useState([])

  const refresh = useCallback(async () => {
    if (!projectId) return
    setPlans(await api.get(`/projects/${projectId}/test-plans`))
  }, [projectId])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount, not a derived-state sync
  useEffect(() => { refresh() }, [refresh])

  const addPlan = useCallback(async (data) => {
    const plan = await api.post(`/projects/${projectId}/test-plans`, data)
    setPlans((prev) => [...prev, plan])
    return plan
  }, [projectId])

  const updatePlan = useCallback(async (plan) => {
    const updated = await api.patch(`/projects/${projectId}/test-plans/${plan.id}`, plan)
    setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    return updated
  }, [projectId])

  // Cascade (clearing testPlanId on linked runs) happens server-side.
  const removePlan = useCallback(async (id) => {
    await api.delete(`/projects/${projectId}/test-plans/${id}`)
    setPlans((prev) => prev.filter((p) => p.id !== id))
  }, [projectId])

  const linkRunToPlan = useCallback(async (planId, runId) => {
    await api.post(`/projects/${projectId}/test-plans/${planId}/link-run`, { runId })
  }, [projectId])

  return { plans, addPlan, updatePlan, removePlan, linkRunToPlan, refresh }
}
