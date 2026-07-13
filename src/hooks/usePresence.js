import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useUser } from '../context/UserContext'

const HEARTBEAT_MS = 10000
const POLL_MS = 5000

export function usePresence(projectId, currentPageName) {
  const { user } = useUser()
  const [activeUsers, setActiveUsers] = useState([])

  useEffect(() => {
    if (!projectId || !user) return undefined

    api.post(`/projects/${projectId}/presence`, { currentPage: currentPageName }).catch(() => {})
    const heartbeat = setInterval(() => {
      api.post(`/projects/${projectId}/presence`, { currentPage: currentPageName }).catch(() => {})
    }, HEARTBEAT_MS)

    const poll = setInterval(() => {
      api.get(`/projects/${projectId}/presence`).then(setActiveUsers).catch(() => {})
    }, POLL_MS)
    api.get(`/projects/${projectId}/presence`).then(setActiveUsers).catch(() => {})

    const leave = () => { api.delete(`/projects/${projectId}/presence`).catch(() => {}) }
    window.addEventListener('beforeunload', leave)

    return () => {
      clearInterval(heartbeat)
      clearInterval(poll)
      window.removeEventListener('beforeunload', leave)
      leave()
    }
  }, [projectId, currentPageName, user])

  return activeUsers
}
