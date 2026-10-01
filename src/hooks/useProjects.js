import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'

const PROJECTS_CHANGED = 'qa-projects-changed'

export function useProjects() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.get('/projects')
      setProjects(data)
    } catch (err) {
      setError(err.message || 'Could not load projects')
      throw err
    } finally { setLoading(false) }
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount, not a derived-state sync
  useEffect(() => { refresh().catch(() => {}) }, [refresh])

  useEffect(() => {
    const onChange = () => refresh().catch(() => {})
    window.addEventListener(PROJECTS_CHANGED, onChange)
    return () => window.removeEventListener(PROJECTS_CHANGED, onChange)
  }, [refresh])

  const addProject = useCallback(async (data) => {
    const project = await api.post('/projects', data)
    setProjects((prev) => [project, ...prev])
    window.dispatchEvent(new Event(PROJECTS_CHANGED))
    return { project, remoteSaved: true, remoteReady: true }
  }, [])

  const removeProject = useCallback(async (id) => {
    await api.delete(`/projects/${id}`)
    setProjects((prev) => prev.filter((p) => p.id !== id))
    window.dispatchEvent(new Event(PROJECTS_CHANGED))
  }, [])

  const updateProject = useCallback(async (project) => {
    const updated = await api.patch(`/projects/${project.id}`, project)
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    window.dispatchEvent(new Event(PROJECTS_CHANGED))
    return updated
  }, [])

  const setPublicShare = useCallback(async (id, enabled) => {
    const updated = await api.post(`/projects/${id}/public-share`, { enabled })
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    return updated
  }, [])

  return { projects, loading, error, addProject, removeProject, updateProject, setPublicShare, refresh }
}
