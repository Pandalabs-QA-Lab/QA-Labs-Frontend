import { useEffect, useState } from 'react'
import { api } from '../api/client'

function inviteUrl(token) {
  return `${window.location.origin}${window.location.pathname}#/join/${token}`
}

export function InvitationPanel({ projectId, projectName }) {
  const [email, setEmail] = useState('')
  const [invitations, setInvitations] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const isProject = Boolean(projectId)

  useEffect(() => {
    let active = true
    const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''
    api.get(`/invites/managed${query}`)
      .then((rows) => { if (active) setInvitations(rows) })
      .catch((err) => { if (active) setError(err.message) })
    return () => { active = false }
  }, [projectId])

  const createInvitation = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const invite = await api.post('/invites/managed', {
        email: email.trim(), ...(projectId ? { projectId } : {}),
      })
      setInvitations((current) => [invite, ...current.filter((row) => row.email !== invite.email)])
      setEmail('')
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  const revoke = async (id) => {
    setError('')
    try {
      await api.delete(`/invites/managed/${id}`)
      setInvitations((current) => current.filter((row) => row.id !== id))
    } catch (err) { setError(err.message) }
  }

  const copy = async (token) => {
    try { await navigator.clipboard.writeText(inviteUrl(token)) }
    catch { setError('Copy failed. Open the email draft or select the link to copy it.') }
  }

  const mailto = (invite) => {
    const subject = `Invitation to ${isProject ? projectName : 'QA Lab workspace'}`
    const body = `You have been invited to ${isProject ? `the ${projectName} project` : 'a QA Lab workspace'}. Sign in or create an account with ${invite.email}, then open this link:\n\n${inviteUrl(invite.token)}\n\nThis invitation expires in seven days.`
    return `mailto:${encodeURIComponent(invite.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  return (
    <div className="invitation-panel">
      <p className="invitation-help">
        {isProject
          ? 'Invite someone to this project by email. They start with Viewer access to this project only.'
          : 'Invite someone to the whole workspace by email. They start as a Viewer and can see its projects.'}
        {' '}Existing QA Lab users will also see the invitation in the app.
      </p>
      <form className="invitation-form" onSubmit={createInvitation}>
        <label htmlFor={isProject ? 'project-invite-email' : 'workspace-invite-email'}>Email address</label>
        <div className="invitation-form-row">
          <input
            id={isProject ? 'project-invite-email' : 'workspace-invite-email'}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="teammate@example.com"
            required
          />
          <button type="submit" className="primary-button" disabled={busy}>{busy ? 'Creating…' : 'Create invitation'}</button>
        </div>
      </form>
      {error && <p className="auth-error" role="alert">{error}</p>}
      {invitations.length > 0 && <div className="invitation-list" aria-label="Pending invitations">
        <strong>Pending invitations</strong>
        {invitations.map((invite) => <div className="invitation-row" key={invite.id}>
          <div className="invitation-person"><strong>{invite.email}</strong><small>Expires {new Date(invite.expiresAt).toLocaleDateString()}</small></div>
          <input readOnly aria-label={`Invitation link for ${invite.email}`} value={inviteUrl(invite.token)} onFocus={(event) => event.target.select()} />
          <div className="invitation-actions">
            <button type="button" className="secondary-button" onClick={() => copy(invite.token)}>Copy link</button>
            <a className="secondary-button" href={mailto(invite)}>Open email draft</a>
            <button type="button" className="secondary-button text-danger" onClick={() => revoke(invite.id)}>Revoke</button>
          </div>
        </div>)}
      </div>}
      <p className="invitation-help">The email draft opens your mail app; QA Lab does not send email automatically yet.</p>
    </div>
  )
}
