import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { useUserRole } from '../hooks/useUserRole'
import { useConfirm } from '../context/useConfirm'

function pipelineUrl(run) {
  const meta = run.automationMeta || {}
  return /^[\w.-]+\/[\w.-]+$/.test(meta.repository || '') && /^\d+$/.test(meta.runId || '') ? `https://github.com/${meta.repository}/actions/runs/${meta.runId}` : undefined
}

export function AutomationPage() {
  const { projectId } = useParams(), { isLead, isViewer } = useUserRole()
  const confirm = useConfirm()
  const [data, setData] = useState(null), [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false)
  const [branch, setBranch] = useState(''), [environment, setEnvironment] = useState(''), [filterBranch, setFilterBranch] = useState(''), [filterEnv, setFilterEnv] = useState('')
  const refresh = useCallback(async () => {
    try {
      const [integration, runs] = await Promise.all([api.get(`/projects/${projectId}/automation`), api.get(`/projects/${projectId}/automation/runs`)])
      setData({ ...integration, runs }); setError('')
    } catch (err) { setError(err.message) }
  }, [projectId])
  useEffect(() => { refresh(); const timer = setInterval(() => { if (!document.hidden) refresh() }, 30000); return () => clearInterval(timer) }, [refresh]) // eslint-disable-line react-hooks/set-state-in-effect
  const config = data?.config
  const chosenBranch = branch || config?.branches[0] || '', chosenEnv = environment || config?.environments[0] || ''
  const trigger = async () => {
    if (!await confirm({ title: 'Start automated tests?', message: `Run ${config.workflow} in ${config.repository} on ${chosenBranch}, using ${chosenEnv}? This uses your CI runner and its minutes.`, confirmLabel: 'Run tests' })) return
    setBusy(true); setError(''); setNotice('')
    try { await api.post(`/projects/${projectId}/automation/dispatch`, { branch: chosenBranch, environment: chosenEnv }); setNotice('GitHub accepted the request. Results appear here after the pipeline uploads them.'); await refresh() }
    catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  const all = data?.runs || []
  const runs = all.filter(run => (!filterBranch || run.automationMeta?.branch === filterBranch) && (!filterEnv || run.environment === filterEnv))
  const total = runs.reduce((n, r) => n + r.total, 0), passed = runs.reduce((n, r) => n + r.passed, 0), failed = runs.reduce((n, r) => n + r.failed, 0)
  const avgDuration = runs.length ? runs.reduce((n, r) => n + (r.automationMeta?.duration || 0), 0) / runs.length : 0
  const suites = Object.entries(runs.reduce((acc, run) => { for (const [suite, count] of Object.entries(run.automationMeta?.failuresBySuite || {})) acc[suite] = (acc[suite] || 0) + Number(count); return acc }, Object.create(null))).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const trend = runs.slice(0, 12).reverse()
  const branches = [...new Set(all.map(r => r.automationMeta?.branch).filter(Boolean))], environments = [...new Set(all.map(r => r.environment).filter(Boolean))]
  return <div className="project-hub">
    <header className="hub-header"><div><span className="hub-eyebrow">Continuous testing</span><h1>Automation</h1><p>PR checks and deployment tests, connected to your project.</p></div><div className="resource-actions"><button className="secondary-button" onClick={refresh}>Refresh</button>{isLead && <Link className="secondary-button" to={`/projects/${projectId}/settings`}>Configure CI/CD</Link>}</div></header>
    {error && <p className="auth-error" role="alert">{error}</p>}{notice && <p role="status" className="hub-notice">{notice}</p>}
    {!data && !error && <p role="status">Loading automated runs…</p>}
    {data && <><section className="panel automation-launch"><div><h2>Run automated tests</h2><p>{config ? `${config.repository} · ${config.workflow}` : 'Connect GitHub Actions in project settings to get started.'}</p></div>
      {config && <div className="automation-launch-controls"><label>Branch<select value={chosenBranch} disabled={busy || isViewer} onChange={e => setBranch(e.target.value)}>{config.branches.map(v => <option key={v}>{v}</option>)}</select></label><label>Environment<select value={chosenEnv} disabled={busy || isViewer} onChange={e => setEnvironment(e.target.value)}>{config.environments.map(v => <option key={v}>{v}</option>)}</select></label><button className="primary-button" disabled={busy || isViewer || !config.canTrigger} onClick={trigger}>{busy ? 'Requesting…' : 'Run tests'}</button></div>}
      {config && <small>{isViewer ? 'Tester or QA Lead access is required to start tests.' : !config.canTrigger ? 'A QA Lead must add GitHub credentials to enable this action. CI uploads can still work independently.' : 'Only branches and environments approved by your QA Lead are available.'}</small>}
    </section>
    <div className="hub-filters"><select aria-label="Filter automated runs by branch" value={filterBranch} onChange={e => setFilterBranch(e.target.value)}><option value="">All branches</option>{branches.map(v => <option key={v}>{v}</option>)}</select><select aria-label="Filter automated runs by environment" value={filterEnv} onChange={e => setFilterEnv(e.target.value)}><option value="">All environments</option>{environments.map(v => <option key={v}>{v}</option>)}</select></div>
    <p className="muted-text">Showing the latest 100 uploaded runs. Filters and charts apply to these results.</p>
    <div className="automation-stats">{[['Automated runs', runs.length], ['Pass rate', total ? `${Math.round(passed / total * 100)}%` : '—'], ['Failed executions', failed], ['Avg. test duration', runs.length ? `${Math.round(avgDuration)}s` : '—']].map(([label, value]) => <div className="panel" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    <div className="automation-chart-grid"><section className="panel"><h2>Pass rate by run</h2><p className="muted-text">Latest 12 runs, oldest to newest. All reported tests are included in the rate.</p>{trend.length ? <div className="automation-trend" role="group" aria-label={trend.map(r => `${r.name}: ${Math.round(r.passed / r.total * 100)} percent passed`).join('; ')}>{trend.map((r, i) => <Link key={r.id} to={`/projects/${projectId}/test-runs/${r.id}`} title={`${r.name}: ${Math.round(r.passed / r.total * 100)}%`}><span style={{ height: `${Math.max(2, r.passed / r.total * 100)}%` }} /><small>{i + 1}</small></Link>)}</div> : <p className="hub-empty-inline">Your first CI upload will start the trend.</p>}</section>
    <section className="panel"><h2>Failures by suite</h2><p className="muted-text">Failed test executions across the selected runs.</p>{suites.length ? suites.map(([suite, count]) => <div key={suite} className="automation-suite"><div><span>{suite}</span><strong>{count}</strong></div><progress value={count} max={suites[0][1]} aria-label={`${suite}: ${count} failures`} /></div>) : <p className="hub-empty-inline">{runs.length ? 'No failures in these results.' : 'Suite failures will appear after an upload.'}</p>}</section></div>
    <section className="panel"><h2>Automated test runs</h2><div className="hub-table-wrap"><table><thead><tr><th>Run</th><th>Branch / PR</th><th>Environment</th><th>Results</th><th>Test duration</th><th>Pipeline</th></tr></thead><tbody>{runs.map(run => <tr key={run.id}><td><Link to={`/projects/${projectId}/test-runs/${run.id}`}>{run.name}</Link><small>{new Date(run.createdAt).toLocaleString()}</small></td><td>{run.automationMeta?.branch}<small>{run.automationMeta?.pullRequest ? `PR #${run.automationMeta.pullRequest} · ` : ''}{run.build.slice(0, 8)}</small></td><td>{run.environment}</td><td><span className="automation-result-pass">{run.passed} passed</span> · <span className="automation-result-fail">{run.failed} failed</span><small>{run.skipped} skipped / {run.total} total</small></td><td>{Math.round(run.automationMeta?.duration || 0)}s</td><td><a href={pipelineUrl(run)} target="_blank" rel="noopener noreferrer">GitHub ↗</a></td></tr>)}</tbody></table></div>{!runs.length && <p className="hub-empty-inline">No automated runs yet. Upload JUnit results from your CI pipeline.</p>}</section>
    {!!data.dispatches.length && <section className="panel"><h2>Recent run requests</h2><p>Accepted means GitHub received the request. It does not mean tests have finished.</p><div className="hub-table-wrap"><table><thead><tr><th>Requested</th><th>Branch</th><th>Environment</th><th>Request status</th></tr></thead><tbody>{data.dispatches.map(row => <tr key={row.id}><td>{new Date(row.createdAt).toLocaleString()}</td><td>{row.branch}</td><td>{row.environment}</td><td>{row.status}</td></tr>)}</tbody></table></div></section>}
    </>}
  </div>
}
