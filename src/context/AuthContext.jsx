import { useCallback, useEffect, useState } from 'react'
import { api, getToken, setToken } from '../api/client'
import { AuthContext } from './AuthContextCore'

export function AuthProvider({ children }) {
  // undefined = still resolving, null = not signed in, object = signed in
  const [authUser, setAuthUser] = useState(undefined)
  const [workspace, setWorkspace] = useState(null)
  const [role, setRole] = useState(null)

  const applySession = useCallback((session) => {
    setAuthUser(session.user)
    setWorkspace(session.workspace)
    setRole(session.role)
  }, [])

  const clearSession = useCallback(() => {
    setToken(null)
    setAuthUser(null)
    setWorkspace(null)
    setRole(null)
  }, [])

  useEffect(() => {
    let cancelled = false
    if (!getToken()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resolving initial auth state on mount, not a derived-state sync
      setAuthUser(null)
      return undefined
    }
    api.get('/auth/me')
      .then((session) => { if (!cancelled) applySession(session) })
      .catch(() => { if (!cancelled) clearSession() })
    return () => { cancelled = true }
  }, [applySession, clearSession])

  useEffect(() => {
    const onExpired = () => clearSession()
    window.addEventListener('qa-auth-expired', onExpired)
    return () => window.removeEventListener('qa-auth-expired', onExpired)
  }, [clearSession])

  const login = async (email, password) => {
    let session = await api.post('/auth/login', { email, password })
    setToken(session.token)
    const preferredWorkspace = localStorage.getItem('qa_last_workspace')
    if (preferredWorkspace && session.workspace?.id !== preferredWorkspace) {
      try {
        session = await api.post(`/auth/workspaces/${preferredWorkspace}/select`, {})
        setToken(session.token)
      } catch {
        localStorage.removeItem('qa_last_workspace')
      }
    }
    applySession(session)
    return session
  }

  const register = async (email, password, displayName) => {
    const session = await api.post('/auth/register', { email, password, displayName })
    setToken(session.token)
    applySession(session)
  }

  const signOut = () => {
    clearSession()
  }

  const updateDisplayName = async (displayName) => {
    const { user } = await api.patch('/auth/me', { displayName })
    setAuthUser((prev) => ({ ...prev, displayName: user.displayName }))
  }

  const changePassword = async (currentPassword, newPassword) => {
    const { user } = await api.patch('/auth/password', { currentPassword, newPassword })
    setAuthUser(user)
  }

  const switchWorkspace = async (workspaceId) => {
    const session = await api.post(`/auth/workspaces/${workspaceId}/select`, {})
    setToken(session.token)
    localStorage.setItem('qa_last_workspace', workspaceId)
    applySession(session)
    return session
  }

  return (
    <AuthContext.Provider value={{
      authUser,
      workspace,
      role,
      loading: authUser === undefined,
      login,
      register,
      signOut,
      updateDisplayName,
      changePassword,
      switchWorkspace,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
