import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api/client'
import { useToast } from '../context/useToast'

export function useNotifications() {
  const toast = useToast()
  const [notifications, setNotifications] = useState([])
  const prevRef = useRef([])

  const unreadCount = notifications.filter((n) => !n.read).length

  const refresh = useCallback(async () => {
    const data = await api.get('/notifications')
    const fresh = data.filter((n) => !n.read && !prevRef.current.some((prev) => prev.id === n.id))
    if (fresh.length > 0 && toast) fresh.forEach((n) => toast.success(n.message))
    prevRef.current = data
    setNotifications(data)
  }, [toast])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount, not a derived-state sync
  useEffect(() => { refresh() }, [refresh])

  const markAsRead = useCallback(async (id) => {
    await api.post(`/notifications/${id}/read`)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }, [])

  const markAllAsRead = useCallback(async () => {
    await api.post('/notifications/read-all')
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const clearAll = useCallback(async () => {
    await api.delete('/notifications')
    setNotifications([])
  }, [])

  return { notifications, unreadCount, markAsRead, markAllAsRead, clearAll, refresh }
}
