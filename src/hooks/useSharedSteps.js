import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'

export function useSharedSteps(projectId) {
  const [sharedSteps, setSharedSteps] = useState([])

  const refresh = useCallback(async () => {
    if (!projectId) return
    setSharedSteps(await api.get(`/projects/${projectId}/shared-steps`))
  }, [projectId])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount, not a derived-state sync
  useEffect(() => { refresh() }, [refresh])

  const addSharedStep = useCallback(async (name, description = '', steps = []) => {
    const group = await api.post(`/projects/${projectId}/shared-steps`, { name, description, steps })
    setSharedSteps((prev) => [...prev, group])
    return group
  }, [projectId])

  const updateSharedStep = useCallback(async (group) => {
    const updated = await api.patch(`/projects/${projectId}/shared-steps/${group.id}`, group)
    setSharedSteps((prev) => prev.map((g) => (g.id === updated.id ? updated : g)))
    return updated
  }, [projectId])

  const removeSharedStep = useCallback(async (id) => {
    await api.delete(`/projects/${projectId}/shared-steps/${id}`)
    setSharedSteps((prev) => prev.filter((g) => g.id !== id))
  }, [projectId])

  return { sharedSteps, addSharedStep, updateSharedStep, removeSharedStep, refresh }
}
