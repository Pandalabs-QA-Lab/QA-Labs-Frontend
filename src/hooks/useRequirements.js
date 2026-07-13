import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'

export function useRequirements(projectId) {
  const [requirements, setReqs] = useState([])

  const refresh = useCallback(async () => {
    if (!projectId) return
    setReqs(await api.get(`/projects/${projectId}/requirements`))
  }, [projectId])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount, not a derived-state sync
  useEffect(() => { refresh() }, [refresh])

  const addRequirement = useCallback(async (data) => {
    const req = await api.post(`/projects/${projectId}/requirements`, data)
    setReqs((prev) => [...prev, req])
    return req
  }, [projectId])

  const updateRequirement = useCallback(async (req) => {
    const updated = await api.patch(`/projects/${projectId}/requirements/${req.id}`, req)
    setReqs((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
    return updated
  }, [projectId])

  const removeRequirement = useCallback(async (id) => {
    await api.delete(`/projects/${projectId}/requirements/${id}`)
    setReqs((prev) => prev.filter((r) => r.id !== id))
  }, [projectId])

  return { requirements, addRequirement, updateRequirement, removeRequirement, refresh }
}
