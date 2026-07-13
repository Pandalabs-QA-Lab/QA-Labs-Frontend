import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { api } from '../api/client'

export function JoinPage() {
  const { token } = useParams()
  const { authUser } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState('checking') // checking | joining | done | invalid
  const [workspaceName, setWorkspaceName] = useState('')

  useEffect(() => {
    if (!token) return

    api.get(`/invites/${token}`)
      .then(({ workspaceName: name }) => setWorkspaceName(name))
      .catch(() => setStatus('invalid'))
  }, [token])

  useEffect(() => {
    if (!authUser || !token || status === 'invalid') return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reacting to authUser becoming available, not a derived-state sync
    setStatus('joining')
    api.post(`/invites/${token}/accept`, {})
      .then(({ workspaceName: name }) => {
        setWorkspaceName(name)
        setStatus('done')
        setTimeout(() => navigate('/projects'), 1500)
      })
      .catch(() => setStatus('invalid'))
  }, [authUser, token, navigate, status])

  // Not signed in — prompt to sign in first (the join finishes automatically
  // once authUser becomes truthy, since the hash route survives the auth gate)
  if (!authUser) {
    return (
      <div className="auth-backdrop">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div className="auth-brand"><span>QA Lab</span></div>
          <h1 className="auth-title">You've been invited!</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
            {workspaceName ? `Sign in or create an account to join "${workspaceName}".` : 'Sign in or create an account to join this workspace.'}
          </p>
          <a href="#/" className="primary-button" style={{ textDecoration: 'none', display: 'inline-block' }}>
            Sign in to continue
          </a>
        </div>
      </div>
    )
  }

  const messages = {
    checking: 'Verifying invite link…',
    joining:  workspaceName ? `Adding you to "${workspaceName}"…` : 'Joining workspace…',
    done:     workspaceName ? `You're in! Opening "${workspaceName}"…` : 'Done! Redirecting…',
    invalid:  'This invite link is invalid or has been revoked.',
  }

  return (
    <div className="app-loading">
      <div className="app-loading-card" style={{ textAlign: 'center', gap: '12px' }}>
        {status !== 'invalid' && <div className="app-loading-spinner" aria-label="Loading" />}
        <p style={{ margin: 0, color: status === 'invalid' ? 'var(--danger)' : 'var(--text-strong)' }}>
          {messages[status]}
        </p>
        {status === 'invalid' && (
          <a href="#/" className="secondary-button" style={{ textDecoration: 'none', marginTop: '8px' }}>Go home</a>
        )}
      </div>
    </div>
  )
}
