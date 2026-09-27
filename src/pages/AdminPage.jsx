import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/useAuth'

const formatDate = (value) => new Date(value).toLocaleString()

export function AdminPage() {
  const { authUser, signOut } = useAuth()
  const [overview, setOverview] = useState(null)
  const [requests, setRequests] = useState([])
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [removeTarget, setRemoveTarget] = useState(null)

  const refresh = useCallback(async () => {
    const [summary, pending] = await Promise.all([
      api.get('/access/admin/overview'), api.get('/access/admin/requests'),
    ])
    setOverview(summary)
    setRequests(pending)
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- state changes after the API reads resolve
  useEffect(() => { refresh().catch((err) => setError(err.message)) }, [refresh])

  const review = async (id, action) => {
    setBusyId(id)
    setError('')
    try {
      await api.post(`/access/admin/requests/${id}/${action}`, {})
      await refresh()
    } catch (err) { setError(err.message) }
    finally { setBusyId(null) }
  }

  const changeRole = async (workspaceId, userId, role) => {
    setError('')
    try {
      await api.patch(`/access/admin/workspaces/${workspaceId}/users/${userId}/role`, { role })
      await refresh()
    } catch (err) { setError(err.message) }
  }

  const removeMember = async () => {
    if (!removeTarget) return
    setBusyId(removeTarget.userId)
    setError('')
    try {
      await api.delete(`/access/admin/workspaces/${removeTarget.workspaceId}/users/${removeTarget.userId}`)
      await refresh()
      setRemoveTarget(null)
    } catch (err) { setError(err.message) }
    finally { setBusyId(null) }
  }

  if (!authUser?.isPlatformAdmin) return <main className="auth-backdrop"><p>Platform admin access required.</p></main>

  return <main className="admin-page">
    <header className="admin-topbar">
      <div className="admin-brand"><span className="brand-mark" aria-hidden="true">✓</span><span>QA Lab <small>Administration</small></span></div>
      <div className="admin-topbar-actions">
        <a className="secondary-button" href="#/workspaces">Switch workspace</a>
        <button className="admin-signout" type="button" onClick={signOut}>Sign out</button>
      </div>
    </header>

    <div className="admin-content">
      <div className="admin-heading">
        <div>
          <p className="admin-eyebrow">Platform administration</p>
          <h1>Overview</h1>
          <p>Review workspace requests, access, and activity across QA Lab.</p>
        </div>
        <span className="admin-identity">Signed in as {authUser.email}</span>
      </div>

      {error && <p className="auth-error" role="alert">{error}</p>}

      <div className="admin-stats" aria-label="Platform totals">
        <div className="admin-stat"><span>Workspaces</span><strong>{overview?.counts.workspaces ?? '—'}</strong></div>
        <div className="admin-stat"><span>Users</span><strong>{overview?.counts.users ?? '—'}</strong></div>
        <div className="admin-stat"><span>Active in projects <small>last 5 min</small></span><strong>{overview?.counts.activeUsers ?? '—'}</strong></div>
        <div className="admin-stat"><span>Pending requests</span><strong>{overview ? requests.length : '—'}</strong></div>
      </div>

      <section className="admin-section" aria-labelledby="admin-requests-title">
        <div className="admin-section-heading"><div><h2 id="admin-requests-title">Workspace requests</h2><p>Approve a workspace and its first project before it becomes available.</p></div></div>
        {requests.length === 0 ? <p className="admin-empty">{overview ? 'No requests are waiting for approval.' : 'Loading requests…'}</p> :
          <div className="admin-list">{requests.map((item) =>
            <article className="admin-request" key={item.id}>
              <div className="admin-request-main">
                <div className="admin-request-title"><strong>{item.workspaceName}</strong><span className="admin-badge">{item.kind.toLowerCase()}</span></div>
                <p>First project: <strong>{item.projectName}</strong></p>
                <small>Requested by {item.user.displayName} ({item.user.email}) · {formatDate(item.createdAt)}</small>
              </div>
              <div className="admin-request-actions">
                <button className="primary-button" type="button" disabled={busyId === item.id} onClick={() => review(item.id, 'approve')}>Approve</button>
                <button className="secondary-button" type="button" disabled={busyId === item.id} onClick={() => review(item.id, 'reject')}>Decline</button>
              </div>
            </article>)}</div>}
      </section>

      <div className="admin-columns">
        <section className="admin-section" aria-labelledby="admin-workspaces-title">
          <div className="admin-section-heading"><div><h2 id="admin-workspaces-title">Workspaces</h2><p>Current teams and projects.</p></div></div>
          {!overview ? <p className="admin-empty">Loading workspaces…</p> : overview.workspaces.length === 0 ?
            <p className="admin-empty">No workspaces yet. Approved requests will appear here.</p> :
            <div className="admin-list">{overview.workspaces.map((item) => <div className="admin-list-row" key={item.id}>
              <strong>{item.name}</strong><span>{item.memberships.length} {item.memberships.length === 1 ? 'member' : 'members'} · {item._count.projects} {item._count.projects === 1 ? 'project' : 'projects'}</span>
            </div>)}</div>}
        </section>

        <section className="admin-section" aria-labelledby="admin-users-title">
          <div className="admin-section-heading"><div><h2 id="admin-users-title">Users</h2><p>Manage roles or remove workspace access. Owners and platform admins are protected.</p></div></div>
          {removeTarget && <div className="admin-remove-confirm" role="alertdialog" aria-label="Remove workspace access">
            <p>Remove <strong>{removeTarget.userName}</strong> from <strong>{removeTarget.workspaceName}</strong>? Their account will stay active, but workspace access ends immediately.</p>
            <div>
              <button className="secondary-button" type="button" disabled={busyId === removeTarget.userId} onClick={() => setRemoveTarget(null)}>Cancel</button>
              <button className="danger-button" type="button" disabled={busyId === removeTarget.userId} onClick={removeMember}>Remove access</button>
            </div>
          </div>}
          {!overview ? <p className="admin-empty">Loading users…</p> : overview.users.length === 0 ?
            <p className="admin-empty">No users yet.</p> :
            <div className="admin-list">{overview.users.map((item) => <div className="admin-user" key={item.id}>
              <div className="admin-user-name"><strong>{item.displayName}</strong>{item.isPlatformAdmin && <span className="admin-badge">Platform admin</span>}</div>
              <span className="admin-user-email">{item.email}</span>
              {item.memberships.map((membership) => {
                const memberWorkspace = overview.workspaces.find((row) => row.id === membership.workspaceId)
                const workspaceName = memberWorkspace?.name || membership.workspaceId
                return <div className="admin-role-row" key={membership.workspaceId}>
                  <label className="admin-role">
                    <span>{workspaceName}</span>
                    <select aria-label={`Role for ${item.displayName} in ${workspaceName}`} value={membership.role} disabled={item.isPlatformAdmin} onChange={(event) => changeRole(membership.workspaceId, item.id, event.target.value)}>
                      <option value="QA_LEAD">QA Lead</option><option value="TESTER">Tester</option><option value="VIEWER">Viewer</option>
                    </select>
                  </label>
                  {!item.isPlatformAdmin && memberWorkspace?.ownerId !== item.id &&
                    <button className="admin-remove-button" type="button" onClick={() => setRemoveTarget({ workspaceId: membership.workspaceId, workspaceName, userId: item.id, userName: item.displayName })}>
                      Remove
                    </button>}
                  {(item.isPlatformAdmin || memberWorkspace?.ownerId === item.id) &&
                    <span className="admin-protected">{item.isPlatformAdmin ? 'Admin' : 'Owner'}</span>}
                </div>
              })}
            </div>)}</div>}
        </section>
      </div>

      <div className="admin-columns">
        <section className="admin-section" aria-labelledby="admin-active-title">
          <div className="admin-section-heading"><div><h2 id="admin-active-title">Recently active</h2><p>Users seen in projects during the last 5 minutes.</p></div></div>
          {!overview ? <p className="admin-empty">Loading activity…</p> : overview.activeUsers.length === 0 ?
            <p className="admin-empty">No recent project activity.</p> :
            <div className="admin-list">{overview.activeUsers.map((item) => <div className="admin-list-row" key={item.userId}>
              <strong>{item.userName}</strong><span>Last seen {formatDate(item.lastSeenAt)} · Project {item.projectId}</span>
            </div>)}</div>}
        </section>
        <section className="admin-section" aria-labelledby="admin-activity-title">
          <div className="admin-section-heading"><div><h2 id="admin-activity-title">Recent activity</h2><p>Latest recorded actions.</p></div></div>
          {!overview ? <p className="admin-empty">Loading activity…</p> : overview.activity.length === 0 ?
            <p className="admin-empty">No activity recorded yet.</p> :
            <div className="admin-list">{overview.activity.map((item) => <div className="admin-list-row" key={item.id}>
              <strong>{item.title}</strong><span>{item.actorName || 'System'} · {formatDate(item.createdAt)}</span>
            </div>)}</div>}
        </section>
      </div>
    </div>
  </main>
}
