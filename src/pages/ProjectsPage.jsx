import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Modal } from '../components/Modal'
import { PageHeader } from '../components/PageHeader'
import { StatusPill } from '../components/StatusPill'
import { useConfirm } from '../context/useConfirm'
import { useToast } from '../context/useToast'
import { useProjects } from '../hooks/useProjects'
import { useTeamMembers } from '../hooks/useTeamMembers'
import { getCachedProjectData } from '../utils/workspaceCache'
import { useWorkspaceData } from '../hooks/useWorkspaceData'
import { DataLoadState } from '../components/DataLoadState'
import { useUserRole } from '../hooks/useUserRole'
import { getProjectOverview, filterAndSortProjects } from '../utils/projectOverview'
import { ArrowRightIcon, PlayIcon } from '../components/Icons'
import './ProjectsPage.css'

function Avatar({ name }) {
  const initials = (name || '?').trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <span className="avatar" title={name} aria-label={name}>
      {initials}
    </span>
  )
}

const blank = { name: '', description: '', memberIds: [] }

function displayDate(value) {
  const date = new Date(value)
  return value && Number.isFinite(date.getTime())
    ? date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'No activity yet'
}

export function ProjectsPage() {
  const { projects, addProject, removeProject, loading: projectsLoading, error: projectsError, refresh } = useProjects()
  const { version: dataVersion, loading: dataLoading, error: dataError, retry } = useWorkspaceData(projects)
  const { members } = useTeamMembers()
  const { isLead, isViewer } = useUserRole()
  const confirm = useConfirm()
  const toast = useToast()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('updated')
  const [view, setView] = useState('cards')

  const enriched = useMemo(() => projects.map((project) =>
    getProjectOverview(project, getCachedProjectData(project.id), members)),
  // eslint-disable-next-line react-hooks/exhaustive-deps -- recalculate cached totals when API data arrives
    [projects, members, dataVersion])
  const visible = filterAndSortProjects(enriched, search, filter, sort)
  const attentionCount = enriched.filter((project) => project.status.label === 'Needs attention').length
  const caseCount = enriched.reduce((total, project) => total + project.counts.total, 0)

  const deleteProject = async (project) => {
    const ok = await confirm({ title: 'Delete project?',
      message: `All data in "${project.name}" will be permanently deleted.`,
      confirmLabel: 'Delete project', danger: true, requireText: project.name })
    if (!ok) return
    try { await removeProject(project.id); toast.success('Project deleted.') }
    catch (error) { toast.error(error.message || 'Could not delete project.') }
  }

  const toggleMember = (id) =>
    setForm((f) => ({
      ...f,
      memberIds: f.memberIds.includes(id)
        ? f.memberIds.filter((m) => m !== id)
        : [...f.memberIds, id],
    }))

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || saving) return
    setSaving(true)
    try {
      await addProject({
        name: form.name.trim(),
        description: form.description.trim(),
        memberIds: form.memberIds,
      })
      toast.success('Project created.')
      setForm(blank)
      setShowAdd(false)
    } catch (error) {
      toast.error(error.message || 'Could not create project.')
    } finally {
      setSaving(false)
    }
  }

  if (projectsLoading || dataLoading || projectsError || dataError) {
    return <DataLoadState title="Projects" loading={projectsLoading || dataLoading}
      error={projectsError || dataError} onRetry={() => { refresh().catch(() => {}); retry() }} />
  }

  return (
    <>
      <PageHeader
        title="Projects"
        description="Every project, every release. See where testing stands and what needs your attention."
        action={
          isLead && (
            <button className="primary-button" type="button" onClick={() => setShowAdd(true)}>
              + New project
            </button>
          )
        }
      />

      <section className="project-overview-strip" aria-label="Workspace overview">
        <div><span className="project-overview-label">Your testing workspace</span><strong>{projects.length} project{projects.length === 1 ? '' : 's'}<span> / {caseCount} test cases</span></strong></div>
        <button type="button" className={`project-attention-shortcut ${filter === 'Needs attention' ? 'is-selected' : ''}`}
          onClick={() => setFilter(filter === 'Needs attention' ? 'all' : 'Needs attention')} aria-pressed={filter === 'Needs attention'}>
          <span className="project-attention-dot" /> {attentionCount} need attention <ArrowRightIcon />
        </button>
      </section>

      {projects.length > 0 && <>
        <section className="project-directory-toolbar" aria-label="Project controls">
          <label className="project-search"><span className="sr-only">Search projects</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></svg>
            <input type="search" placeholder="Search projects or team members…" value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
          <label className="project-toolbar-select"><span className="sr-only">Project status</span>
            <select value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option value="all">All statuses</option>{['Needs attention', 'Not started', 'Testing in progress', 'Execution complete', 'No test cases'].map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
          <label className="project-toolbar-select"><span className="sr-only">Sort projects</span>
            <select value={sort} onChange={(event) => setSort(event.target.value)}><option value="updated">Recently updated</option><option value="attention">Needs attention first</option><option value="name">Name: A–Z</option></select>
          </label>
          <div className="project-view-toggle" role="group" aria-label="Project view">
            <button type="button" aria-label="Card view" aria-pressed={view === 'cards'} onClick={() => setView('cards')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
            </button>
            <button type="button" aria-label="List view" aria-pressed={view === 'list'} onClick={() => setView('list')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M8 5h13M8 12h13M8 19h13M3 5h1M3 12h1M3 19h1" /></svg>
            </button>
          </div>
        </section>
        <p className="project-result-count" role="status">Showing {visible.length} of {projects.length} projects</p>
      </>}

      {projects.length === 0 ? <section className="empty-state"><h2>Your next release starts here</h2><p>{isLead ? 'Create a project, add your test cases, and bring the team together.' : 'Projects shared with you will appear here.'}</p>
        {isLead && <button className="primary-button" type="button" onClick={() => setShowAdd(true)}>+ Create your first project</button>}
      </section> : visible.length === 0 ? <section className="empty-state"><h2>No matching projects</h2><p>Try another name or a different status.</p><button type="button" className="secondary-button" onClick={() => { setSearch(''); setFilter('all') }}>Clear filters</button></section> : (
        <section className={`project-directory project-directory--${view}`} aria-label="Projects">
          {visible.map((project) => <article key={project.id} className="project-tile" aria-labelledby={`project-title-${project.id}`}>
            <div className="project-tile-heading">
              <span className="project-tile-mark" aria-hidden="true">{project.name.slice(0, 2).toUpperCase()}</span>
              <div className="project-tile-title"><h2 id={`project-title-${project.id}`}><Link to={`/projects/${project.id}/dashboard`}>{project.name}</Link></h2><p>{project.description || 'A workspace for your next release.'}</p></div>
              <details className="project-options"><summary aria-label={`Options for ${project.name}`}><span aria-hidden="true">•••</span></summary>
                <div className="project-options-popover"><Link to={`/projects/${project.id}/reports`}>View report</Link>
                  {isLead && <><Link to={`/projects/${project.id}/settings`}>Project settings</Link><button type="button" onClick={() => deleteProject(project)}>Delete project</button></>}
                </div>
              </details>
            </div>
            <div className="project-tile-status"><StatusPill tone={project.status.tone}>{project.status.label}</StatusPill><span>Updated {displayDate(project.updated)}</span></div>
            <div className="project-tile-stats">
              <Link to={`/projects/${project.id}/test-cases`}><strong>{project.counts.total}</strong><span>Test cases</span></Link>
              <Link to={`/projects/${project.id}/bugs`}><strong className={project.openBugs ? 'project-stat-alert' : ''}>{project.openBugs}</strong><span>Open bugs</span></Link>
              <Link to={`/projects/${project.id}/test-runs`}><strong>{project.totalRuns}</strong><span>Test runs</span></Link>
            </div>
            <div className="project-tile-progress">
              <div className="project-progress-heading"><strong>Test status</strong><span>{project.recorded} / {project.counts.total} with results</span></div>
              <div className="project-progress-track" role="img" aria-label={project.counts.total ? project.segments.filter((segment) => segment.count).map((segment) => `${segment.count} ${segment.label.toLowerCase()}`).join(', ') : 'No test cases yet'}>
                {project.segments.filter((segment) => segment.count).map((segment) => <span key={segment.label} className={`project-progress-segment project-progress-segment--${segment.tone}`} style={{ flex: segment.count }} title={`${segment.label}: ${segment.count}`} />)}
              </div>
              <div className="project-progress-legend">{project.segments.filter((segment) => segment.count || ['Passed', 'Failed', 'Blocked', 'Not executed'].includes(segment.label)).map((segment) => <span key={segment.label}><i className={`project-progress-segment--${segment.tone}`} />{segment.count} {segment.label.toLowerCase()}</span>)}</div>
            </div>
            <div className="project-latest-run"><span>Latest run</span>{project.lastRun ? <><strong title={project.lastRun.name}>{project.lastRun.name || 'Unnamed run'}</strong><time>{displayDate(project.lastRun.completedAt || project.lastRun.date || project.lastRun.createdAt)}</time></> : <strong>No runs yet</strong>}</div>
            <div className="project-tile-team">
              {project.projectMembers.length ? <><div className="avatar-row">{project.projectMembers.slice(0, 4).map((member) => <Avatar key={member.id} name={member.name} />)}{project.projectMembers.length > 4 && <span className="avatar">+{project.projectMembers.length - 4}</span>}</div><span>{project.projectMembers.length} team member{project.projectMembers.length === 1 ? '' : 's'}</span></> : <span>No team members assigned</span>}
            </div>
            <div className="project-tile-actions"><Link className="project-open-link" to={`/projects/${project.id}/dashboard`}>Open project <ArrowRightIcon /></Link>
              {!isViewer && (project.counts.total ? <Link className="secondary-button" to={`/projects/${project.id}/test-runs`}><PlayIcon width={14} /> Start test run</Link> : <Link className="secondary-button" to={`/projects/${project.id}/test-cases`}>Add test cases</Link>)}
            </div>
          </article>)}
        </section>
      )}

      {showAdd && (
        <Modal title="New project" onClose={() => { setShowAdd(false); setForm(blank) }}>
          <form className="modal-form" onSubmit={handleAdd}>
            <label>
              Name <span className="required">*</span>
              <input
                autoFocus
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="E.g. Mobile app"
              />
            </label>
            <label>
              Description
              <input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Short description"
              />
            </label>
            {members.length > 0 && (
              <fieldset className="member-picker">
                <legend>Team members</legend>
                <div className="member-picker-list">
                  {members.map((m) => (
                    <label key={m.id} className="member-check">
                      <input
                        type="checkbox"
                        checked={form.memberIds.includes(m.id)}
                        onChange={() => toggleMember(m.id)}
                      />
                      <Avatar name={m.name} />
                      <span>{m.name}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            <div className="modal-footer">
              <button type="button" className="secondary-button" onClick={() => { setShowAdd(false); setForm(blank) }}>
                Cancel
              </button>
              <button type="submit" className="primary-button" disabled={saving}>
                {saving ? 'Creating…' : 'Create project'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
