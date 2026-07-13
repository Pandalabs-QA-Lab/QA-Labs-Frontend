import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'

const POLL_MS = 5000

export function useComments(projectId, entityType, entityId) {
  const [comments, setComments] = useState([])

  const refresh = useCallback(() => {
    if (!projectId || !entityId) return
    api.get(`/projects/${projectId}/comments?entityType=${entityType}&entityId=${entityId}`)
      .then(setComments)
      .catch(() => {})
  }, [projectId, entityType, entityId])

  useEffect(() => {
    if (!projectId || !entityId) return undefined
    refresh()
    const poll = setInterval(refresh, POLL_MS)
    return () => clearInterval(poll)
  }, [projectId, entityId, refresh])

  const addComment = useCallback(async (text, { entityTitle, entityOwnerName } = {}) => {
    if (!text.trim()) return null
    const comment = await api.post(`/projects/${projectId}/comments`, {
      entityType, entityId, text: text.trim(), entityTitle, entityOwnerName,
    })
    setComments((prev) => [...prev, comment])
    return comment
  }, [projectId, entityType, entityId])

  const deleteComment = useCallback(async (commentId) => {
    await api.delete(`/projects/${projectId}/comments/${commentId}`)
    setComments((prev) => prev.filter((c) => c.id !== commentId))
  }, [projectId])

  return { comments, addComment, deleteComment }
}
