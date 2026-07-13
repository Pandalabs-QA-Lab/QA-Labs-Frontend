import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'

export function useActivity() {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const data = await api.get('/activity')
    setActivities(data)
    setLoading(false)
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount, not a derived-state sync
  useEffect(() => { refresh() }, [refresh])

  const getActivitiesByProject = useCallback((projectId) => {
    return activities.filter((act) => act.projectId === projectId)
  }, [activities])

  const getActivitiesByEntity = useCallback((entityType, entityId) => {
    return activities.filter((act) => act.entityType === entityType && act.entityId === entityId)
  }, [activities])

  return { activities, loading, getActivitiesByProject, getActivitiesByEntity, refresh }
}
