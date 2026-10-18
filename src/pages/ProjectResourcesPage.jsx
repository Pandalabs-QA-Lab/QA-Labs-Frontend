import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api/client'
import { useUserRole } from '../hooks/useUserRole'
import { useConfirm } from '../context/useConfirm'
import { Modal } from '../components/Modal'

const categories = { TRACKER: 'Tracker sheet', DOCUMENT: 'Document', ENVIRONMENT: 'Environment', REPOSITORY: 'Repository', NOTE: 'Note', TEST_ACCOUNT: 'Test account' }
const blank = { title: '', category: 'TRACKER', url: '', notes: '', username: '', secret: '', clearSecret: false }

function ResourceCard({ row, isLead, isViewer, onEdit, onDelete, base }) {
  const [secret, setSecret] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!secret) return
    const timer = setTimeout(() => setSecret(''), 30000)
    return () => clearTimeout(timer)
  }, [secret])
  const reveal = async () => {
    if (secret) { setSecret(''); return }
    setBusy(true); setError('')
    try { setSecret((await api.post(`${base}/${row.id}/reveal`, {})).secret) }
    catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return <article className="panel resource-card">
    <div className="resource-card-heading"><span className="resource-category">{categories[row.category]}</span>{isLead && <div className="resource-actions"><button className="link-btn" onClick={() => { setSecret(''); onEdit(row) }}>Edit</button><button className="link-btn text-danger" onClick={() => onDelete(row)}>Remove</button></div>}</div>
    <h2>{row.title}</h2>
    {row.url && <a className="resource-url" href={row.url} target="_blank" rel="noopener noreferrer">{row.url} ↗</a>}
    {row.notes && <p className="resource-notes">{row.notes}</p>}
    {row.category === 'TEST_ACCOUNT' && <div className="resource-account"><span>Username</span><strong>{row.username || 'Not provided'}</strong>
      {row.hasSecret ? <><span>Password</span><output className="resource-secret">{secret || '••••••••••••'}</output>{!isViewer && <button type="button" className="secondary-button" disabled={busy} onClick={reveal}>{busy ? 'Loading…' : secret ? 'Hide password' : 'Reveal password'}</button>}<small>{isViewer ? 'Tester or QA Lead access is required to reveal passwords.' : 'Reveals are recorded in activity. Password hides after 30 seconds.'}</small></> : <small>No password stored</small>}
    </div>}
    {error && <p className="auth-error" role="alert">{error}</p>}
  </article>
}

export function ProjectResourcesPage() {
  const { projectId } = useParams()
  const { isLead, isViewer } = useUserRole()
  const confirm = useConfirm()
  const base = `/projects/${projectId}/resources`
  const [data, setData] = useState(null), [error, setError] = useState(''), [query, setQuery] = useState(''), [category, setCategory] = useState('')
  const [form, setForm] = useState(null), [busy, setBusy] = useState(false), [formError, setFormError] = useState('')
  const refresh = useCallback(async () => { try { setData(await api.get(base)); setError('') } catch (err) { setError(err.message) } }, [base])
  useEffect(() => { refresh() }, [refresh]) // eslint-disable-line react-hooks/set-state-in-effect
  const save = async event => {
    event.preventDefault(); setBusy(true); setFormError('')
    try {
      const payload = { title: form.title, category: form.category, url: form.url, notes: form.notes, username: form.username, secret: form.secret || undefined, clearSecret: form.clearSecret }
      if (form.id) await api.put(`${base}/${form.id}`, payload); else await api.post(base, payload)
      setForm(null); await refresh()
    } catch (err) { setFormError(err.message) } finally { setBusy(false) }
  }
  const remove = async row => {
    if (!await confirm({ title: 'Remove resource?', message: `Remove “${row.title}” and its stored password? This cannot be undone.`, danger: true, confirmLabel: 'Remove' })) return
    try { await api.delete(`${base}/${row.id}`); await refresh() } catch (err) { setError(err.message) }
  }
  const rows = (data?.resources || []).filter(row => (!category || row.category === category) && `${row.title} ${row.notes} ${row.url} ${row.username}`.toLowerCase().includes(query.toLowerCase()))
  const field = name => ({ value: form[name], onChange: e => setForm(previous => ({ ...previous, [name]: e.target.value })) })
  return <div className="project-hub">
    <header className="hub-header"><div><span className="hub-eyebrow">Project library</span><h1>Resources</h1><p>Tracker sheets, useful links, environment notes, and test accounts in one place.</p></div>{isLead && <button className="primary-button" onClick={() => { setForm({ ...blank }); setFormError('') }}>+ Add resource</button>}</header>
    {error && <p role="alert" className="auth-error">{error} <button className="link-btn" onClick={refresh}>Retry</button></p>}
    <div className="hub-filters"><input type="search" aria-label="Search resources" placeholder="Search resources…" value={query} onChange={e => setQuery(e.target.value)} /><select aria-label="Resource category" value={category} onChange={e => setCategory(e.target.value)}><option value="">All categories</option>{Object.entries(categories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
    {!data && !error && <p role="status">Loading resources…</p>}
    {data && !rows.length && <div className="panel hub-empty"><h2>{data.resources.length ? 'No matching resources' : 'Your project’s useful things belong here'}</h2><p>{data.resources.length ? 'Try another search or category.' : 'Add the tracker sheet, staging URL, or first test account to get started.'}</p></div>}
    <div className="resource-grid">{rows.map(row => <ResourceCard key={`${row.id}-${row.updatedAt}`} row={row} isLead={isLead} isViewer={isViewer} onEdit={row => { setForm({ ...row, secret: '', clearSecret: false }); setFormError('') }} onDelete={remove} base={base} />)}</div>
    {form && <Modal title={form.id ? 'Edit resource' : 'Add resource'} className="resource-modal" onClose={() => { if (!busy) setForm(null) }}>
      <form className="modal-form" onSubmit={save}><fieldset disabled={busy} className="hub-form-fields">
        <label>Title<input required maxLength={160} {...field('title')} autoFocus /></label>
        <label>Category<select {...field('category')}>{Object.entries(categories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label>Link<input type="url" placeholder="https://…" {...field('url')} /></label>
        <label>Notes<textarea rows={4} maxLength={10000} {...field('notes')} /></label>
        <small>Keep passwords and API keys out of links and notes. Use a Test account password field or link to your password manager.</small>
        {form.category === 'TEST_ACCOUNT' && <><label>Username / email<input autoComplete="off" {...field('username')} /></label><label>{form.hasSecret ? 'Replace password (leave blank to keep)' : 'Password'}<input type="password" autoComplete="new-password" disabled={!data?.secretStorageReady || form.clearSecret} {...field('secret')} /></label>
          {!data?.secretStorageReady && <p role="status">Encrypted storage needs administrator configuration before passwords can be saved.</p>}
          {form.hasSecret && <label className="hub-checkbox"><input type="checkbox" checked={form.clearSecret} onChange={e => setForm(previous => ({ ...previous, clearSecret: e.target.checked }))} />Remove stored password</label>}
          <small>Use test accounts only. Testers and QA Leads can reveal stored passwords.</small></>}
        {formError && <p role="alert" className="auth-error">{formError}</p>}
      </fieldset><div className="modal-footer"><button type="button" className="secondary-button" disabled={busy} onClick={() => setForm(null)}>Cancel</button><button type="submit" className="primary-button" disabled={busy}>{busy ? 'Saving…' : 'Save resource'}</button></div></form>
    </Modal>}
  </div>
}
