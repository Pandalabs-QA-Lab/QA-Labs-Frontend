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
  const [feedback, setFeedback] = useState('')
  const [emailConfigured, setEmailConfigured] = useState(null)
  const isProject = Boolean(projectId)

  useEffect(() => {
    let active = true
    const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''
    Promise.all([api.get(`/invites/managed${query}`), api.get('/invites/delivery-status')])
      .then(([rows, delivery]) => { if (active) { setInvitations(rows); setEmailConfigured(delivery.configured) } })
      .catch((err) => { if (active) setError(err.message) })
    return () => { active = false }
  }, [projectId])

  const createInvitation = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setFeedback('')
    try {
      const invite = await api.post('/invites/managed', {
        email: email.trim(), ...(projectId ? { projectId } : {}),
      })
      setInvitations((current) => [invite, ...current.filter((row) => row.email !== invite.email)])
      setEmail('')
      setFeedback(invite.emailStatus === 'SENT' ? 'Invitation email sent.' : 'Invitation created. You can copy its link below.')
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  const revoke = async (id) => {
    setError('')
    setBusy(true)
    try {
      await api.delete(`/invites/managed/${id}`)
      setInvitations((current) => current.filter((row) => row.id !== id))
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  const resend = async (id) => {
    setBusy(true)
    setError('')
    setFeedback('')
    try {
      const invite = await api.post(`/invites/managed/${id}/resend`, {})
      setInvitations((current) => current.map((row) => row.id === id ? invite : row))
      setFeedback(invite.emailStatus === 'SENT' ? 'Invitation email sent again.' : 'Email could not be sent. Copy the invitation link instead.')
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  const copy = async (token) => {
    try { await navigator.clipboard.writeText(inviteUrl(token)); setFeedback('Invitation link copied.'); setError('') }
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
            disabled={busy}
          />
          <button type="submit" className="primary-button" disabled={busy || emailConfigured === null}>{busy ? 'Please wait…' : emailConfigured ? 'Send invitation' : 'Create invitation link'}</button>
        </div>
      </form>
      {emailConfigured === false && <p className="invitation-help">Email sending is currently unavailable. Create an invitation link and share it with your teammate.</p>}
      {error && <p className="auth-error" role="alert">{error}</p>}
      {feedback && <p className="invitation-help" role="status">{feedback}</p>}
      {invitations.length > 0 && <div className="invitation-list" aria-label="Pending invitations">
        <strong>Pending invitations</strong>
        {invitations.map((invite) => <div className="invitation-row" key={invite.id}>
          <div className="invitation-person"><strong>{invite.email}</strong><small>Viewer · Expires {new Date(invite.expiresAt).toLocaleDateString()}</small>
            <small className={`invitation-delivery ${invite.emailStatus === 'FAILED' ? 'text-danger' : ''}`}>
              {invite.emailStatus === 'SENT' ? `Email sent ${new Date(invite.emailSentAt).toLocaleString()}`
                : invite.emailStatus === 'FAILED' ? 'Email failed — retry or share the link'
                  : invite.emailStatus === 'NOT_CONFIGURED' || invite.emailConfigured === false ? 'Email unavailable — share the link' : 'Email not sent yet'}
            </small>
          </div>
          <input readOnly aria-label={`Invitation link for ${invite.email}`} value={inviteUrl(invite.token)} onFocus={(event) => event.target.select()} />
          <div className="invitation-actions">
            <button type="button" className="secondary-button" onClick={() => copy(invite.token)}>Copy link</button>
            {invite.emailStatus !== 'NOT_CONFIGURED' && invite.emailConfigured !== false && <button type="button" className="secondary-button" disabled={busy} onClick={() => resend(invite.id)}>Resend email</button>}
            {invite.emailStatus !== 'SENT' && <a className="secondary-button" href={mailto(invite)}>Open email draft</a>}
            <button type="button" className="secondary-button text-danger" disabled={busy} onClick={() => revoke(invite.id)}>Revoke</button>
          </div>
        </div>)}
      </div>}
      <p className="invitation-help">Invitations expire after seven days. “Email sent” means the mail provider accepted the message; ask your teammate to check their spam folder if needed.</p>
    </div>
  )
}
