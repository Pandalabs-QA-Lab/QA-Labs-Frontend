import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { api } from '../api/client'

export function JoinPage() {
  const { token } = useParams()
  const { authUser, switchWorkspace, signOut } = useAuth()
  const [invitation, setInvitation] = useState(null)
  const [status, setStatus] = useState('checking')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    api.get(`/invites/${encodeURIComponent(token)}`)
      .then((details) => { if (active) { setInvitation(details); setStatus('ready') } })
      .catch((err) => { if (active) { setError(err.message); setStatus('invalid') } })
    return () => { active = false }
  }, [token])

  const accept = async () => {
    setStatus('joining')
    setError('')
    try {
      const joined = await api.post(`/invites/${encodeURIComponent(token)}/accept`, {})
      await switchWorkspace(joined.workspaceId)
      window.location.hash = joined.projectId ? `#/projects/${joined.projectId}/dashboard` : '#/projects'
      window.location.reload()
    } catch (err) {
      setError(err.message)
      setStatus('ready')
    }
  }

  const target = invitation?.projectName
    ? `the ${invitation.projectName} project in ${invitation.workspaceName}`
    : `the ${invitation?.workspaceName || 'QA Lab'} workspace`

  return <main className="auth-backdrop">
    <div className="auth-card" style={{ textAlign: 'center' }}>
      <div className="auth-brand"><span>QA Lab</span></div>
      <h1 className="auth-title">{status === 'invalid' ? 'Invitation unavailable' : `Invitation to ${target}`}</h1>
      {status === 'checking' && <p>Checking invitation…</p>}
      {error && <p className="auth-error" role="alert">{error}</p>}
      {status === 'invalid' && <a className="secondary-button" href="#/">Go home</a>}
      {status === 'ready' && !authUser && <>
        <p>Sign in or create an account with {invitation?.email || 'the invited email address'} to accept.</p>
        <a href="#/" onClick={() => sessionStorage.setItem('qa_pending_invite', token)} className="primary-button">Sign in to continue</a>
      </>}
      {status === 'ready' && authUser && <>
        {invitation?.email && <p>This invitation is for {invitation.email}. You are signed in as {authUser.email}.</p>}
        <button className="primary-button" type="button" onClick={accept} disabled={Boolean(invitation?.email && invitation.email.toLowerCase() !== authUser.email.toLowerCase())}>Accept invitation</button>
        {invitation?.email && invitation.email.toLowerCase() !== authUser.email.toLowerCase() &&
          <button className="secondary-button" type="button" onClick={signOut}>Use another account</button>}
      </>}
      {status === 'joining' && <p>Adding you to {target}…</p>}
    </div>
  </main>
}
