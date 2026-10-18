import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, API_BASE } from '../api/client'
import { useConfirm } from '../context/useConfirm'

const empty = { repository: '', workflow: 'qa-tests.yml', branches: 'main', environments: 'staging', githubToken: '', clearGithubToken: false, testWorkflowConfirmed: false }
export function AutomationSettings({ projectId }) {
  const base = `/projects/${projectId}/automation`
  const confirm = useConfirm()
  const [form, setForm] = useState(empty), [config, setConfig] = useState(null), [ready, setReady] = useState(false), [keyReady, setKeyReady] = useState(false)
  const [token, setToken] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('')
  const refresh = useCallback(async () => {
    try {
      const data = await api.get(base); setConfig(data.config); setKeyReady(data.secretStorageReady)
      setForm(data.config ? { ...empty, ...data.config, branches: data.config.branches.join(', '), environments: data.config.environments.join(', ') } : empty)
      setReady(true); setError('')
    } catch (err) { setError(err.message) }
  }, [base])
  useEffect(() => { refresh() }, [refresh]) // eslint-disable-line react-hooks/set-state-in-effect
  const action = async operation => {
    setBusy(true); setError(''); setNotice('')
    try { await operation() } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  const save = event => {
    event.preventDefault()
    action(async () => {
      await api.put(base, { repository: form.repository.trim(), workflow: form.workflow.trim(), branches: form.branches.split(',').map(s => s.trim()).filter(Boolean), environments: form.environments.split(',').map(s => s.trim()).filter(Boolean), githubToken: form.githubToken || undefined, clearGithubToken: form.clearGithubToken, testWorkflowConfirmed: form.testWorkflowConfirmed })
      await refresh(); setNotice('Integration saved. Add the upload token to your repository secrets next.')
    })
  }
  const rotate = async () => {
    if (config?.hasIngestToken && !await confirm({ title: 'Rotate CI upload token?', message: 'The old token stops working immediately. Update QA_LAB_TOKEN in your repository secrets.', confirmLabel: 'Rotate token' })) return
    action(async () => { const result = await api.post(`${base}/token`, {}); await refresh(); setToken(result.token); setNotice(`Copy this token now. It expires ${new Date(result.expiresAt).toLocaleDateString()} and is shown only once.`) })
  }
  const revoke = async () => {
    if (!await confirm({ title: 'Revoke upload token?', message: 'Pipelines will no longer be able to send results with this token.', danger: true, confirmLabel: 'Revoke' })) return
    action(async () => { await api.delete(`${base}/token`); setToken(''); await refresh(); setNotice('Upload token revoked.') })
  }
  const field = key => ({ value: form[key], onChange: e => setForm(previous => ({ ...previous, [key]: e.target.value })) })
  return <section className="panel automation-settings">
    <div className="hub-header"><div><span className="hub-eyebrow">CI/CD integration</span><h2>GitHub Actions</h2><p>Receive results after PRs and deployments, and allow your team to start approved test workflows.</p></div><Link className="secondary-button" to={`/projects/${projectId}/automation`}>View automation</Link></div>
    {error && <p role="alert" className="auth-error">{error} {!ready && <button className="link-btn" onClick={refresh}>Retry</button>}</p>}
    {!ready && !error && <p role="status">Loading integration…</p>}
    {notice && <p role="status" className="hub-notice">{notice}</p>}
    {ready && <><form onSubmit={save}><fieldset disabled={busy} className="hub-form-fields">
      <div className="hub-form-grid"><label>GitHub repository<input required placeholder="owner/repository" {...field('repository')} /></label><label>Test workflow filename<input required {...field('workflow')} /></label>
      <label>Approved branches (comma separated)<input required {...field('branches')} /></label><label>Approved environments (comma separated)<input required {...field('environments')} /></label></div>
      <label>GitHub fine-grained access token {config?.canTrigger && '(configured; leave blank to keep)'}<input type="password" autoComplete="new-password" disabled={!keyReady || form.clearGithubToken} placeholder="Optional: needed only to start tests from QA Lab" {...field('githubToken')} /></label>
      <small>Restrict the token to this repository with Actions: write permission. It stays encrypted on the backend and is never returned. Uploading CI results uses a separate token below.</small>
      {!keyReady && <p>Ask the administrator to configure encrypted storage before adding GitHub credentials.</p>}
      {config?.canTrigger && <label className="hub-checkbox"><input type="checkbox" checked={form.clearGithubToken} onChange={e => setForm(p => ({ ...p, clearGithubToken: e.target.checked }))} />Disconnect GitHub workflow triggering</label>}
      <label className="hub-checkbox"><input type="checkbox" required checked={form.testWorkflowConfirmed} onChange={e => setForm(p => ({ ...p, testWorkflowConfirmed: e.target.checked }))} />I reviewed this workflow and approved these branches and environments for test execution. It must not deploy or change production.</label>
      <div><button className="primary-button" disabled={busy} type="submit">{busy ? 'Please wait…' : 'Save integration'}</button></div>
    </fieldset></form>
    {config && <div className="automation-token"><h3>CI upload token</h3><p>Project-scoped, upload-only, valid for 90 days. {config.hasIngestToken ? `Expires ${new Date(config.tokenExpiresAt).toLocaleDateString()}.` : 'No active upload token.'}</p><div className="resource-actions"><button className="secondary-button" disabled={busy} onClick={rotate}>{config.hasIngestToken ? 'Rotate token' : 'Generate upload token'}</button>{config.hasIngestToken && <button className="secondary-button text-danger" disabled={busy} onClick={revoke}>Revoke token</button>}</div>
      {token && <div className="hub-secret-once"><label>Copy into GitHub secret QA_LAB_TOKEN<input readOnly type="password" value={token} onFocus={e => e.target.select()} /></label><button className="secondary-button" onClick={() => action(async () => { await navigator.clipboard.writeText(token); setNotice('Token copied. Save it in GitHub Actions secrets.'); setToken('') })}>Copy token & hide</button><button className="link-btn" onClick={() => setToken('')}>Hide</button></div>}
      <h3>Connect your pipeline</h3>
      <div className="resource-actions"><a className="secondary-button" href={`${import.meta.env.BASE_URL}downloads/qa-lab-upload-junit.py`} download="upload_junit.py">Download JUnit uploader</a><a className="secondary-button" href={`${import.meta.env.BASE_URL}downloads/qa-tests.example.yml`} download="qa-tests.yml">Download workflow example</a></div>
      <ol><li>Add <code>QA_LAB_TOKEN</code> to your repository’s Actions secrets.</li><li>Add <code>QA_LAB_API_URL</code> as a repository variable: <code>{API_BASE}</code>. Hosted runners cannot reach localhost.</li><li>Save the downloaded uploader as <code>automation/upload_junit.py</code> and adapt the example as <code>.github/workflows/qa-tests.yml</code> in your test repository.</li><li>Configure your test runner to produce JUnit XML. Upload results with <code>if: always()</code>, even when tests fail.</li></ol>
      <p>For “Run tests” the workflow must exist on the default branch and accept <code>workflow_dispatch.inputs.environment</code>. Fork PRs do not receive repository secrets; do not use a privileged PR event to expose them.</p>
    </div>}</>}
  </section>
}
