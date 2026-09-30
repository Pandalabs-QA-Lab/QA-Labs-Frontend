import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/useAuth'

const formatDate = (value) => new Date(value).toLocaleString()

export function AdminPage() {
  const { authUser, workspace, signOut, switchWorkspace } = useAuth()
  const [overview, setOverview] = useState(null)
  const [requests, setRequests] = useState([])
  const [loadingData, setLoadingData] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [userSearchInput, setUserSearchInput] = useState('')
  const [userSearch, setUserSearch] = useState('')
  const [userPage, setUserPage] = useState(1)
  const [usersResult, setUsersResult] = useState({ items: [], total: 0, page: 1, pageSize: 25 })
  const [workspaceSearchInput, setWorkspaceSearchInput] = useState('')
  const [workspaceSearch, setWorkspaceSearch] = useState('')
  const [workspacePage, setWorkspacePage] = useState(1)
  const [workspacesResult, setWorkspacesResult] = useState({ items: [], total: 0, page: 1, pageSize: 25 })
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [removeTarget, setRemoveTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [deleteWorkspaceTarget, setDeleteWorkspaceTarget] = useState(null)
  const [deleteWorkspaceConfirmation, setDeleteWorkspaceConfirmation] = useState('')
  const [showCreateAccount, setShowCreateAccount] = useState(false)
  const [newAccount, setNewAccount] = useState({ email: '', displayName: '', password: '', workspaceId: '' })
  const [createdCredentials, setCreatedCredentials] = useState(null)

  const generatePassword = () => {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
    const bytes = crypto.getRandomValues(new Uint32Array(20))
    setNewAccount((current) => ({ ...current, password: Array.from(bytes, (value) => characters[value % characters.length]).join('') }))
  }

  const refresh = useCallback(async () => {
    setLoadingData(true)
    try {
      const [summary, pending, users, workspaces] = await Promise.all([
        api.get('/access/admin/overview'), api.get('/access/admin/requests'),
        api.get(`/access/admin/users?search=${encodeURIComponent(userSearch)}&page=${userPage}`),
        api.get(`/access/admin/workspaces?search=${encodeURIComponent(workspaceSearch)}&page=${workspacePage}`),
      ])
      setOverview(summary)
      setRequests(pending)
      setUsersResult(users)
      setWorkspacesResult(workspaces)
    } finally { setLoadingData(false) }
  }, [userSearch, userPage, workspaceSearch, workspacePage])

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

  const createAccount = async (event) => {
    event.preventDefault()
    setBusyId('create-account')
    setError('')
    setCreatedCredentials(null)
    try {
      const payload = { ...newAccount }
      if (!payload.workspaceId) delete payload.workspaceId
      await api.post('/access/admin/users', payload)
      setCreatedCredentials({ email: payload.email, password: payload.password })
      setNewAccount({ email: '', displayName: '', password: '', workspaceId: '' })
      await refresh()
    } catch (err) { setError(err.message) }
    finally { setBusyId(null) }
  }

  const deleteAccount = async () => {
    if (!deleteTarget || deleteConfirmation !== deleteTarget.email) return
    setBusyId(deleteTarget.id)
    setError('')
    try {
      await api.delete(`/access/admin/users/${deleteTarget.id}`)
      await refresh()
      setDeleteTarget(null)
      setDeleteConfirmation('')
    } catch (err) { setError(err.message) }
    finally { setBusyId(null) }
  }

  const deleteWorkspace = async () => {
    if (!deleteWorkspaceTarget || deleteWorkspaceConfirmation !== deleteWorkspaceTarget.name) return
    setBusyId(deleteWorkspaceTarget.id)
    setError('')
    try {
      const result = await api.delete(`/access/admin/workspaces/${deleteWorkspaceTarget.id}`, { confirmName: deleteWorkspaceConfirmation })
      if (workspace?.id === deleteWorkspaceTarget.id) localStorage.removeItem('qa_last_workspace')
      setDeleteWorkspaceTarget(null)
      setDeleteWorkspaceConfirmation('')
      setWorkspacePage(1)
      await refresh()
      if (!result.filesRemoved) setError('Workspace records were deleted, but some uploaded files could not be removed. Check server logs.')
      if (workspace?.id === result.workspace.id) window.location.reload()
    } catch (err) { setError(err.message) }
    finally { setBusyId(null) }
  }

  const openWorkspace = async (workspaceId) => {
    setBusyId(workspaceId)
    setError('')
    try {
      await api.post(`/access/admin/workspaces/${workspaceId}/enter`, {})
      await switchWorkspace(workspaceId)
      window.location.assign('#/projects')
      window.location.reload()
    } catch (err) { setError(err.message); setBusyId(null) }
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
          <h1>{({ overview: 'Administration overview', requests: 'Workspace requests', workspaces: 'Workspaces', users: 'Users and access', activity: 'Activity' })[activeTab]}</h1>
          <p>Manage the people, teams, and approvals across QA Lab.</p>
        </div>
        <span className="admin-identity">Signed in as {authUser.email}</span>
      </div>

      {error && <p className="auth-error" role="alert">{error}</p>}

      <nav className="admin-tabs" aria-label="Administration sections">
        {[
          ['overview', 'Overview'], ['requests', `Requests${requests.length ? ` (${requests.length})` : ''}`],
          ['workspaces', 'Workspaces'], ['users', 'Users'], ['activity', 'Activity'],
        ].map(([key, label]) => <button key={key} type="button" className={activeTab === key ? 'is-active' : ''} aria-pressed={activeTab === key} onClick={() => setActiveTab(key)}>{label}</button>)}
      </nav>

      {activeTab === 'overview' && <>
        <div className="admin-stats" aria-label="Platform totals">
          <button className="admin-stat" type="button" onClick={() => setActiveTab('workspaces')}><span>Workspaces</span><strong>{overview?.counts.workspaces ?? '—'}</strong><small>View workspaces →</small></button>
          <button className="admin-stat" type="button" onClick={() => setActiveTab('users')}><span>Users</span><strong>{overview?.counts.users ?? '—'}</strong><small>Manage users →</small></button>
          <button className="admin-stat" type="button" onClick={() => setActiveTab('activity')}><span>Active in projects <small>last 5 min</small></span><strong>{overview?.counts.activeUsers ?? '—'}</strong><small>View activity →</small></button>
          <button className="admin-stat" type="button" onClick={() => setActiveTab('requests')}><span>Pending requests</span><strong>{overview ? requests.length : '—'}</strong><small>Review requests →</small></button>
        </div>
        <div className="admin-overview-callout">
          <div><strong>What needs attention</strong><p>{requests.length ? `${requests.length} workspace request${requests.length === 1 ? '' : 's'} waiting for a decision.` : 'No workspace requests are waiting. Review users and recent activity as needed.'}</p></div>
          <button className="secondary-button" type="button" onClick={() => setActiveTab(requests.length ? 'requests' : 'users')}>{requests.length ? 'Review requests' : 'Manage users'}</button>
        </div>
        <div className="admin-columns">
          <section className="admin-section" aria-labelledby="admin-new-users-title">
            <div className="admin-section-heading"><div><h2 id="admin-new-users-title">New accounts</h2><p>Most recently registered people.</p></div><button className="admin-section-link" type="button" onClick={() => setActiveTab('users')}>View all users →</button></div>
            {!overview ? <p className="admin-empty">Loading users…</p> : overview.users.length === 0 ? <p className="admin-empty">No accounts yet.</p> :
              <div className="admin-list">{overview.users.slice(0, 4).map((item) => <div className="admin-list-row" key={item.id}><strong>{item.displayName}</strong><span>{item.email} · {formatDate(item.createdAt)}</span></div>)}</div>}
          </section>
          <section className="admin-section" aria-labelledby="admin-recent-activity-title">
            <div className="admin-section-heading"><div><h2 id="admin-recent-activity-title">Latest activity</h2><p>Recent recorded actions across workspaces.</p></div><button className="admin-section-link" type="button" onClick={() => setActiveTab('activity')}>View activity →</button></div>
            {!overview ? <p className="admin-empty">Loading activity…</p> : overview.activity.length === 0 ? <p className="admin-empty">No activity recorded yet.</p> :
              <div className="admin-list">{overview.activity.slice(0, 4).map((item) => <div className="admin-list-row" key={item.id}><strong>{item.title}</strong><span>{item.actorName || 'System'} · {formatDate(item.createdAt)}</span></div>)}</div>}
          </section>
        </div>
      </>}

      {activeTab === 'users' && showCreateAccount && <section className="admin-section" aria-labelledby="admin-create-title">
        <div className="admin-section-heading"><div><h2 id="admin-create-title">Create user account</h2><p>Set a temporary password to share privately. The user must change it at first sign-in.</p></div></div>
        <form className="admin-create-form" onSubmit={createAccount}>
          <label>Full name<input value={newAccount.displayName} onChange={(event) => setNewAccount((current) => ({ ...current, displayName: event.target.value }))} required maxLength={100} /></label>
          <label>Email address<input type="email" value={newAccount.email} onChange={(event) => setNewAccount((current) => ({ ...current, email: event.target.value }))} required /></label>
          <label>Temporary password<input type="text" value={newAccount.password} onChange={(event) => setNewAccount((current) => ({ ...current, password: event.target.value }))} minLength={12} required /></label>
          <button className="secondary-button" type="button" onClick={generatePassword}>Generate password</button>
          <label>Workspace access
            <select value={newAccount.workspaceId} onChange={(event) => setNewAccount((current) => ({ ...current, workspaceId: event.target.value }))}>
              <option value="">No workspace yet</option>
              {overview?.workspaces.map((item) => <option key={item.id} value={item.id}>{item.name} · Viewer</option>)}
            </select>
          </label>
          <button className="primary-button" type="submit" disabled={busyId === 'create-account'}>{busyId === 'create-account' ? 'Creating…' : 'Create account'}</button>
        </form>
        {createdCredentials && <div className="admin-created-credentials" role="status">
          <strong>Account created</strong>
          <p>Share these sign-in details privately. The temporary password will not be shown here again.</p>
          <code>{createdCredentials.email}</code><code>{createdCredentials.password}</code>
          <button className="secondary-button" type="button" onClick={() => navigator.clipboard.writeText(`QA Lab sign-in: ${window.location.origin}${window.location.pathname}\nEmail: ${createdCredentials.email}\nTemporary password: ${createdCredentials.password}`)}>Copy sign-in details</button>
        </div>}
      </section>}

      {(activeTab === 'requests' || (activeTab === 'overview' && requests.length > 0)) && <section className="admin-section" aria-labelledby="admin-requests-title">
        <div className="admin-section-heading"><div><h2 id="admin-requests-title">Workspace requests</h2><p>Approve a workspace and its first project before it becomes available.</p></div></div>
        {requests.length === 0 ? <p className="admin-empty">{loadingData ? 'Loading requests…' : 'No requests are waiting for approval.'}</p> :
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
      </section>}

      {activeTab === 'workspaces' && <section className="admin-section" aria-labelledby="admin-workspaces-title">
          <div className="admin-section-heading"><div><h2 id="admin-workspaces-title">All workspaces</h2><p>Find a team and open its projects.</p></div></div>
          {deleteWorkspaceTarget && <div className="admin-remove-confirm" role="alertdialog" aria-label="Delete workspace">
            <p>Permanently delete <strong>{deleteWorkspaceTarget.name}</strong>, its {deleteWorkspaceTarget._count.projects} project{deleteWorkspaceTarget._count.projects === 1 ? '' : 's'}, members, test cases, runs, bugs, and uploads? User accounts will remain. Type the workspace name to confirm.</p>
            <input aria-label="Type workspace name to confirm deletion" value={deleteWorkspaceConfirmation} onChange={(event) => setDeleteWorkspaceConfirmation(event.target.value)} />
            <div>
              <button className="secondary-button" type="button" onClick={() => { setDeleteWorkspaceTarget(null); setDeleteWorkspaceConfirmation('') }}>Cancel</button>
              <button className="danger-button" type="button" disabled={deleteWorkspaceConfirmation !== deleteWorkspaceTarget.name || busyId === deleteWorkspaceTarget.id} onClick={deleteWorkspace}>Delete workspace</button>
            </div>
          </div>}
          <form className="admin-search" onSubmit={(event) => { event.preventDefault(); setWorkspacePage(1); setWorkspaceSearch(workspaceSearchInput.trim()) }}>
            <input type="search" aria-label="Search workspaces" placeholder="Search workspace name" value={workspaceSearchInput} onChange={(event) => setWorkspaceSearchInput(event.target.value)} />
            <button className="secondary-button" type="submit">Search</button>
          </form>
          {workspacesResult.items.length === 0 ? <p className="admin-empty">{loadingData ? 'Loading workspaces…' : workspaceSearch ? 'No matching workspaces.' : 'No workspaces yet.'}</p> :
            <div className="admin-list">{workspacesResult.items.map((item) => <div className="admin-list-row admin-directory-row" key={item.id}>
              <div><strong>{item.name}</strong><span>{item._count.memberships} {item._count.memberships === 1 ? 'member' : 'members'} · {item._count.projects} {item._count.projects === 1 ? 'project' : 'projects'}</span></div>
              <div className="admin-directory-actions">
                <button className="secondary-button" type="button" disabled={busyId === item.id} onClick={() => openWorkspace(item.id)}>Open workspace</button>
                <button className="admin-remove-button" type="button" disabled={busyId === item.id} onClick={() => { setDeleteWorkspaceTarget(item); setDeleteWorkspaceConfirmation('') }}>Delete workspace</button>
              </div>
            </div>)}</div>}
          <div className="admin-pagination"><span>{workspacesResult.total} workspace{workspacesResult.total === 1 ? '' : 's'} · Page {workspacePage}</span><div>
            <button className="secondary-button" type="button" disabled={loadingData || workspacePage === 1} onClick={() => setWorkspacePage((page) => page - 1)}>Previous</button>
            <button className="secondary-button" type="button" disabled={loadingData || workspacePage * workspacesResult.pageSize >= workspacesResult.total} onClick={() => setWorkspacePage((page) => page + 1)}>Next</button>
          </div></div>
        </section>}

      {activeTab === 'users' && <section className="admin-section" aria-labelledby="admin-users-title">
          <div className="admin-section-heading"><div><h2 id="admin-users-title">Users</h2><p>Manage workspace access or delete an account. Owned workspaces transfer to your admin account. You cannot delete your current account.</p></div>
            <button className="secondary-button" type="button" onClick={() => { if (showCreateAccount) setCreatedCredentials(null); setShowCreateAccount((shown) => !shown) }}>{showCreateAccount ? 'Hide create form' : 'Create user'}</button>
          </div>
          <form className="admin-search" onSubmit={(event) => { event.preventDefault(); setUserPage(1); setUserSearch(userSearchInput.trim()) }}>
            <input type="search" aria-label="Search users" placeholder="Search name or email" value={userSearchInput} onChange={(event) => setUserSearchInput(event.target.value)} />
            <button className="secondary-button" type="submit">Search</button>
          </form>
          {deleteTarget && <div className="admin-remove-confirm" role="alertdialog" aria-label="Delete user account">
            <p>Permanently delete <strong>{deleteTarget.email}</strong> and remove their access to every workspace? If they own a workspace, ownership will transfer to your platform admin account. Type the email address to confirm.</p>
            <input aria-label="Type email to confirm account deletion" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} />
            <div>
              <button className="secondary-button" type="button" onClick={() => { setDeleteTarget(null); setDeleteConfirmation('') }}>Cancel</button>
              <button className="danger-button" type="button" disabled={deleteConfirmation !== deleteTarget.email || busyId === deleteTarget.id} onClick={deleteAccount}>Delete account</button>
            </div>
          </div>}
          {removeTarget && <div className="admin-remove-confirm" role="alertdialog" aria-label="Remove workspace access">
            <p>Remove <strong>{removeTarget.userName}</strong> from <strong>{removeTarget.workspaceName}</strong>? Their account will stay active, but workspace access ends immediately.</p>
            <div>
              <button className="secondary-button" type="button" disabled={busyId === removeTarget.userId} onClick={() => setRemoveTarget(null)}>Cancel</button>
              <button className="danger-button" type="button" disabled={busyId === removeTarget.userId} onClick={removeMember}>Remove access</button>
            </div>
          </div>}
          {usersResult.items.length === 0 ? <p className="admin-empty">{loadingData ? 'Loading users…' : userSearch ? 'No matching users.' : 'No users yet.'}</p> :
            <div className="admin-list">{usersResult.items.map((item) => <div className="admin-user" key={item.id}>
              <div className="admin-user-name"><strong>{item.displayName}</strong>{item.isPlatformAdmin && <span className="admin-badge">Platform admin</span>}</div>
              <span className="admin-user-email">{item.email}</span>
              {item.mustChangePassword && <span className="admin-badge">Password change pending</span>}
              {item.id !== authUser.id &&
                <button className="admin-remove-button admin-delete-account" type="button" onClick={() => { setDeleteTarget(item); setDeleteConfirmation(''); setRemoveTarget(null) }}>Delete account</button>}
              {item.memberships.map((membership) => {
                const memberWorkspace = membership.workspace
                const workspaceName = memberWorkspace.name
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
          <div className="admin-pagination"><span>{usersResult.total} user{usersResult.total === 1 ? '' : 's'} · Page {userPage}</span><div>
            <button className="secondary-button" type="button" disabled={loadingData || userPage === 1} onClick={() => setUserPage((page) => page - 1)}>Previous</button>
            <button className="secondary-button" type="button" disabled={loadingData || userPage * usersResult.pageSize >= usersResult.total} onClick={() => setUserPage((page) => page + 1)}>Next</button>
          </div></div>
        </section>}

      {activeTab === 'activity' && <div className="admin-columns">
        <section className="admin-section" aria-labelledby="admin-active-title">
          <div className="admin-section-heading"><div><h2 id="admin-active-title">Recently active</h2><p>Users seen in projects during the last 5 minutes.</p></div></div>
          {!overview ? <p className="admin-empty">Loading activity…</p> : overview.activeUsers.length === 0 ?
            <p className="admin-empty">No recent project activity.</p> :
            <div className="admin-list">{overview.activeUsers.map((item) => <div className="admin-list-row" key={item.userId}>
              <strong>{item.userName}</strong><span>Last seen {formatDate(item.lastSeenAt)} · {item.project?.name || 'Project'}</span>
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
      </div>}
    </div>
  </main>
}
