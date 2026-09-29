import { useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { useUser } from '../context/UserContext'
import { useAuth } from '../context/useAuth'
import { useTeamMembers } from '../hooks/useTeamMembers'
import { useUserRole } from '../hooks/useUserRole'
import { useConfirm } from '../context/useConfirm'
import { useToast } from '../context/useToast'
import { useActivity } from '../hooks/useActivity'
import { TrashIcon, CheckIcon, ShieldCheckIcon } from '../components/Icons'
import { memberMatchesSearch } from '../utils/entitySearch'
import { InvitationPanel } from '../components/InvitationPanel'

// Inline SVG components for high-quality, modern icons
const ProfileIcon = (props) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

const DirectoryIcon = (props) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

const ActivityIcon = (props) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
)

const SearchIcon = (props) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)

const WorkspaceIcon = (props) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
    <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
    <line x1="6" y1="6" x2="6.01" y2="6" />
    <line x1="6" y1="18" x2="6.01" y2="18" />
  </svg>
)

export function WorkspaceSettingsPage() {
  const { user, updateUser } = useUser()
  const { authUser } = useAuth()
  const { isLead, role: currentRole } = useUserRole()
  const { members, updateMember, removeMember } = useTeamMembers()
  const { activities } = useActivity()
  const confirm = useConfirm()
  const toast = useToast()

  const [activeTab, setActiveTab] = useState('profile')
  const [displayName, setDisplayName] = useState(user)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    if (!displayName.trim()) return
    setProfileSaving(true)
    try {
      await updateUser(displayName.trim())
      setProfileSaved(true)
      toast.success('Profile display name updated')
      setTimeout(() => setProfileSaved(false), 2000)
    } catch {
      toast.error('Failed to update display name.')
    } finally {
      setProfileSaving(false)
    }
  }

  const handleDeleteMember = async (member) => {
    const isSelf = member.uid === authUser?.id ||
                   member.name.toLowerCase() === user.toLowerCase()

    if (isSelf) {
      toast.error('You cannot delete your own user account.')
      return
    }

    const ok = await confirm({
      title: 'Remove workspace access?',
      message: `"${member.name}" will lose access to this workspace and its projects. Their QA Lab account will remain available.`,
      confirmLabel: 'Remove access',
      danger: true,
    })

    if (ok) {
      try {
        await removeMember(member.id)
        toast.success('Workspace access removed')
      } catch (error) {
        toast.error(error.message || 'Could not remove workspace access')
      }
    }
  }

  // Active tab selection forced to 'profile' for non-leads
  const currentTab = isLead ? activeTab : 'profile'

  // Filtered members by search query
  const filteredMembers = members.filter((m) => {
    return memberMatchesSearch(m, searchQuery)
  })

  return (
    <>
      <PageHeader
        title="Workspace Settings"
        description="Configure your profile preferences and manage workspace directory settings."
      />

      <div className="settings-container">
        {/* Sidebar tab navigation */}
        <aside className="settings-nav" aria-label="Settings section navigation">
          <button 
            type="button" 
            className={`settings-nav-btn ${currentTab === 'profile' ? 'settings-nav-btn--active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <ProfileIcon />
            <span>Your Profile</span>
          </button>
          
          {isLead && (
            <>
              <button 
                type="button" 
                className={`settings-nav-btn ${currentTab === 'directory' ? 'settings-nav-btn--active' : ''}`}
                onClick={() => setActiveTab('directory')}
              >
                <DirectoryIcon />
                <span>Workspace Directory</span>
              </button>
              <button 
                type="button" 
                className={`settings-nav-btn ${currentTab === 'activity' ? 'settings-nav-btn--active' : ''}`}
                onClick={() => setActiveTab('activity')}
              >
                <ActivityIcon />
                <span>Activity Ledger</span>
              </button>
            </>
          )}
        </aside>

        {/* Settings view content area */}
        <div className="settings-view">
          {currentTab === 'profile' && (
            <div className="settings-card">
              <div className="settings-card-header">
                <h3>Your profile</h3>
              </div>
              <form className="settings-card-body" onSubmit={handleSaveProfile}>
                <div className="settings-grid-form">
                  <div className="settings-grid-field">
                    <label htmlFor="display-name-input">Display Name</label>
                    <input
                      id="display-name-input"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </div>
                  <div className="settings-grid-field">
                    <label htmlFor="email-input">Email Address</label>
                    <input
                      id="email-input"
                      value={authUser?.email || ''}
                      disabled
                      style={{ background: '#f8fafc', color: '#64748b', cursor: 'not-allowed' }}
                    />
                  </div>
                  <div className="settings-grid-field">
                    <label htmlFor="role-input">Resolved Workspace Role</label>
                    <input
                      id="role-input"
                      value={currentRole}
                      disabled
                      style={{ background: '#f8fafc', color: '#64748b', cursor: 'not-allowed' }}
                    />
                  </div>
                </div>
                <div className="settings-form-footer">
                  <button type="submit" className="primary-button" disabled={!displayName.trim() || profileSaving}>
                    {profileSaved ? <><CheckIcon width={14} height={14} /> Saved</> : profileSaving ? 'Saving…' : 'Save profile'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {currentTab === 'directory' && isLead && (
            <>
              <div className="settings-card">
                <div className="settings-card-header"><h3>Invite teammates to workspace</h3></div>
                <div className="settings-card-body"><InvitationPanel /></div>
              </div>

              {/* Directory Card */}
              <div className="settings-card">
                <div className="settings-card-header">
                  <h3>Workspace users directory</h3>
                  <span className="shared-badge" style={{ background: '#fef3c7', color: '#d97706' }}>Admin Only</span>
                </div>
                <div className="settings-card-body">
                  <div className="settings-search-bar">
                    <div className="settings-search-input-wrap">
                      <SearchIcon />
                      <input 
                        type="search"
                        className="settings-search-input"
                        placeholder="Search users by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        aria-label="Search directory"
                      />
                    </div>
                  </div>

                  {filteredMembers.length === 0 ? (
                    <p className="settings-empty">No users matching search query found.</p>
                  ) : (
                    <div className="table-wrap" style={{ border: 'none', borderRadius: 0, margin: 0 }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left', paddingBottom: '12px' }}>User</th>
                            <th style={{ textAlign: 'left', paddingBottom: '12px' }}>Connection</th>
                            <th style={{ textAlign: 'left', paddingBottom: '12px' }}>Role</th>
                            <th style={{ textAlign: 'right', paddingBottom: '12px' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredMembers.map((m) => {
                            const isSelf = m.uid === authUser?.id ||
                                           m.name.toLowerCase() === user.toLowerCase()
                            return (
                              <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '12px 0' }}>
                                  <div className="directory-user-info">
                                    <span className="directory-user-avatar">
                                      {m.name.slice(0, 2).toUpperCase()}
                                    </span>
                                    <div style={{ display: 'grid', gap: '2px' }}>
                                      <strong style={{ fontSize: '13.5px', color: 'var(--text-strong)' }}>
                                        {m.name} {isSelf && <span className="text-muted" style={{ fontWeight: 'normal', fontSize: '11px' }}>(You)</span>}
                                      </strong>
                                      {m.email && <span className="text-muted" style={{ fontSize: '11.5px' }}>{m.email}</span>}
                                    </div>
                                  </div>
                                </td>
                                <td style={{ padding: '12px 0' }}>
                                  {m.uid ? (
                                    <span className="connection-badge connection-badge--cloud">
                                      <WorkspaceIcon /> Workspace Session
                                    </span>
                                  ) : (
                                    <span className="connection-badge connection-badge--local">
                                      Offline / Manual
                                    </span>
                                  )}
                                </td>
                                <td style={{ padding: '12px 0' }}>
                                  <select
                                    className="inline-select status-select status-select--neutral"
                                    value={m.role || 'Viewer'}
                                    disabled={isSelf}
                                    onChange={(e) => updateMember({ ...m, role: e.target.value })}
                                  >
                                    <option value="Viewer">Viewer</option>
                                    <option value="Tester">Tester</option>
                                    <option value="QA Lead">QA Lead</option>
                                  </select>
                                </td>
                                <td style={{ padding: '12px 0', textAlign: 'right' }}>
                                  <button
                                    type="button"
                                    className="row-delete"
                                    disabled={isSelf}
                                    style={{ opacity: isSelf ? 0.3 : 1, cursor: isSelf ? 'not-allowed' : 'pointer' }}
                                    onClick={() => handleDeleteMember(m)}
                                    aria-label={`Delete user ${m.name}`}
                                  >
                                    <TrashIcon width={14} height={14} />
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

            </>
          )}

          {currentTab === 'activity' && isLead && (
            <div className="settings-card">
              <div className="settings-card-header">
                <h3>Workspace audit trail ledger</h3>
                <span className="shared-badge" style={{ background: '#fef3c7', color: '#d97706' }}>Admin Only</span>
              </div>
              <div className="settings-card-body" style={{ padding: 0 }}>
                {activities.length === 0 ? (
                  <p className="settings-empty" style={{ padding: '24px' }}>No activity has been logged in this workspace yet.</p>
                ) : (
                  <div className="activity-feed-list">
                    {activities.slice(0, 50).map((act) => {
                      return (
                        <div key={act.id} className="activity-feed-item">
                          <div className="activity-feed-icon-container">
                            {act.action === 'deleted' ? (
                              <TrashIcon width={13} height={13} style={{ color: 'var(--danger)' }} />
                            ) : act.action === 'created' ? (
                              <CheckIcon width={13} height={13} style={{ color: '#10b981' }} />
                            ) : (
                              <ShieldCheckIcon width={13} height={13} style={{ color: 'var(--accent)' }} />
                            )}
                          </div>
                          <div className="activity-feed-content">
                            <h4 className="activity-feed-title">{act.title}</h4>
                            <div className="activity-feed-meta">
                              By <strong>{act.actorName}</strong> • {new Date(act.createdAt).toLocaleString()}
                            </div>
                            {act.details && (
                              <div className="activity-feed-details">{act.details}</div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default WorkspaceSettingsPage
