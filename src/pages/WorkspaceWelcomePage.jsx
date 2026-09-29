import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/useAuth'

const ADMIN_CONTACT = 'jaswanth@bugauralabs.studio'

export function WorkspaceWelcomePage() {
  const { authUser, signOut, switchWorkspace } = useAuth()
  const [workspaces, setWorkspaces] = useState([])
  const [requests, setRequests] = useState([])
  const [invitations, setInvitations] = useState([])
  const [kind, setKind] = useState('TEAM')
  const [workspaceName, setWorkspaceName] = useState('')
  const [projectName, setProjectName] = useState('')
  const [invite, setInvite] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true)

  const refresh = useCallback(async () => {
    if (authUser?.isPlatformAdmin) {
      const summary = await api.get('/access/admin/overview')
      setWorkspaces(summary.workspaces.map((item) => ({
        id: item.id,
        name: item.name,
        role: item.memberships.find((membership) => membership.userId === authUser.id)?.role || null,
      })))
      return
    }
    const [available, mine, pending] = await Promise.all([
      api.get('/auth/workspaces'), api.get('/access/requests/mine'), api.get('/invites/pending'),
    ])
    setWorkspaces(available)
    setRequests(mine)
    setInvitations(pending)
  }, [authUser])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- state changes after the API reads resolve
  useEffect(() => { refresh().catch((err) => setError(err.message)).finally(() => setLoadingWorkspaces(false)) }, [refresh])

  const selectWorkspace = async (id) => {
    setBusy(true)
    setError('')
    try {
      if (authUser?.isPlatformAdmin) {
        await api.post(`/access/admin/workspaces/${id}/enter`, {})
      }
      await switchWorkspace(id)
      window.location.assign('#/projects')
      window.location.reload()
    } catch (err) { setError(err.message); setBusy(false) }
  }

  const join = (event) => {
    event.preventDefault()
    const token = invite.trim().match(/\/join\/([^/?#]+)/)?.[1] || invite.trim()
    if (!token) return
    window.location.hash = `#/join/${encodeURIComponent(token)}`
  }

  const submitRequest = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.post('/access/requests', { kind, workspaceName, projectName })
      await refresh()
      setWorkspaceName('')
      setProjectName('')
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  const latest = requests[0]
  if (authUser?.isPlatformAdmin) {
    return <main className="auth-backdrop welcome-backdrop">
      <div className="auth-card welcome-card">
        <div className="auth-brand"><span className="brand-mark" aria-hidden="true">✓</span> QA Lab</div>
        <h1 className="auth-title">Switch workspace</h1>
        <p className="welcome-intro">Choose a workspace to open. You’ll join it as a QA Lead if you aren’t already a member.</p>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <section className="welcome-section">
          {loadingWorkspaces ? <p className="welcome-section-copy">Loading workspaces…</p> : workspaces.length === 0 ? <p className="welcome-section-copy">No workspaces are available yet.</p> :
            workspaces.map((item) => <div className="welcome-workspace" key={item.id}>
              <button type="button" className="secondary-button" disabled={busy} onClick={() => selectWorkspace(item.id)}>
                Open {item.name}{item.role ? ` · ${item.role.replace('_', ' ')}` : ''}
              </button>
            </div>)}
        </section>
        <a className="welcome-admin-link" href="#/admin">Back to platform administration</a>
        <footer className="welcome-footer">
          <div className="welcome-contact"><span>Questions?</span><a href={`mailto:${ADMIN_CONTACT}`}>{ADMIN_CONTACT}</a></div>
          <button className="welcome-signout" type="button" onClick={signOut}>Sign out</button>
        </footer>
      </div>
    </main>
  }

  return (
    <main className="auth-backdrop welcome-backdrop">
      <div className="auth-card welcome-card">
        <div className="auth-brand"><span className="brand-mark" aria-hidden="true">✓</span> QA Lab</div>
        <h1 className="auth-title">Welcome, {authUser?.displayName}</h1>
        <p className="welcome-intro">Join an existing team, or ask an admin to create a workspace and its first project.</p>
        {error && <p className="auth-error" role="alert">{error}</p>}

        {workspaces.length > 0 && <section className="welcome-section">
          <h2>Your workspaces</h2>
          {workspaces.map((item) => <div className="welcome-workspace" key={item.id}>
            <button type="button" className="secondary-button" disabled={busy} onClick={() => selectWorkspace(item.id)}>
              Open {item.name} · {item.role.replace('_', ' ')}
            </button>
          </div>)}
        </section>}

        {invitations.length > 0 && <section className="welcome-section">
          <h2>Your invitations</h2>
          {invitations.map((item) => <div className="welcome-workspace" key={item.id}>
            <span>{item.projectName ? `${item.projectName} · ${item.workspaceName}` : item.workspaceName}</span>
            <a className="secondary-button" href={`#/join/${item.token}`}>Review invitation</a>
          </div>)}
        </section>}

        <section className="welcome-section">
          <h2>Join a team</h2>
          <p className="welcome-section-copy">Have an invitation? Paste the link or code below.</p>
          <form className="auth-form" onSubmit={join}>
            <label>Invitation link or code
              <input value={invite} onChange={(event) => setInvite(event.target.value)} placeholder="Paste your team invitation link" required />
            </label>
            <button className="secondary-button" type="submit" disabled={busy}>Join as Viewer</button>
          </form>
        </section>

        <section className="welcome-section">
          <h2>Request a workspace and project</h2>
          {latest?.status === 'PENDING' ? <div className="welcome-pending" role="status">
            <span className="welcome-pending-icon" aria-hidden="true">✓</span>
            <div>
              <strong>Request sent</strong>
              <p>Your request is waiting for admin approval. We’ll make your workspace available here once it’s approved.</p>
            </div>
          </div> :
            <form className="auth-form" onSubmit={submitRequest}>
              <fieldset className="welcome-purpose">
                <legend>How will you use this workspace?</legend>
                <div className="welcome-purpose-options">
                  <label className={`welcome-purpose-option${kind === 'TEAM' ? ' is-selected' : ''}`}>
                    <input type="radio" name="workspaceKind" value="TEAM" checked={kind === 'TEAM'} onChange={() => setKind('TEAM')} />
                    <span><strong>Team</strong><small>Work with others</small></span>
                  </label>
                  <label className={`welcome-purpose-option${kind === 'PERSONAL' ? ' is-selected' : ''}`}>
                    <input type="radio" name="workspaceKind" value="PERSONAL" checked={kind === 'PERSONAL'} onChange={() => setKind('PERSONAL')} />
                    <span><strong>Personal</strong><small>For your own projects</small></span>
                  </label>
                </div>
              </fieldset>
              <label>Workspace name
                <input value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} required minLength={2} maxLength={100} />
              </label>
              <label>First project name
                <input value={projectName} onChange={(event) => setProjectName(event.target.value)} required minLength={2} maxLength={100} />
              </label>
              <button className="primary-button" type="submit" disabled={busy}>Request admin approval</button>
              {latest?.status === 'REJECTED' && <p className="welcome-rejected">Your previous request was declined. You can submit a new one or use the contact link below for help.</p>}
            </form>}
        </section>
        <footer className="welcome-footer">
          <div className="welcome-contact"><span>Questions?</span><a href={`mailto:${ADMIN_CONTACT}`}>{ADMIN_CONTACT}</a></div>
          <button className="welcome-signout" type="button" onClick={signOut}>Sign out</button>
        </footer>
      </div>
    </main>
  )
}
