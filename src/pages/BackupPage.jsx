import { useEffect, useRef, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { useConfirm } from '../context/useConfirm'
import { useToast } from '../context/useToast'
import {
  downloadBackup,
  fetchWorkspaceBackup,
  importWorkspaceBackup,
  summarizeBackup,
  validateWorkspaceBackup,
} from '../utils/backup'

function SummaryGrid({ summary }) {
  return (
    <div className="backup-summary-grid">
      <article><span>Projects</span><strong>{summary.projects}</strong></article>
      <article><span>Test cases</span><strong>{summary.testCases}</strong></article>
      <article><span>Bugs</span><strong>{summary.bugs}</strong></article>
      <article><span>Runs</span><strong>{summary.runs}</strong></article>
      <article><span>Requirements</span><strong>{summary.requirements}</strong></article>
      <article><span>Test plans</span><strong>{summary.testPlans}</strong></article>
      <article><span>Milestones</span><strong>{summary.milestones}</strong></article>
      <article><span>Folders</span><strong>{summary.folders}</strong></article>
      <article><span>Shared steps</span><strong>{summary.sharedSteps}</strong></article>
      <article><span>Members</span><strong>{summary.teamMembers}</strong></article>
    </div>
  )
}

export function BackupPage() {
  const confirm = useConfirm()
  const toast = useToast()
  const fileRef = useRef(null)
  const [currentSummary, setCurrentSummary] = useState(null)
  const [parsed, setParsed] = useState(null)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('merge')
  const [restoring, setRestoring] = useState(false)
  const [exporting, setExporting] = useState(false)
  const importSummary = parsed ? summarizeBackup(parsed) : null

  useEffect(() => {
    fetchWorkspaceBackup().then((backup) => setCurrentSummary(summarizeBackup(backup))).catch((err) => setError(err.message || 'Could not load workspace summary.'))
  }, [])

  const readFile = (file) => {
    setError('')
    setParsed(null)
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        setParsed(validateWorkspaceBackup(String(reader.result)))
      } catch (err) {
        setParsed(null)
        setError(err.message)
      }
    }
    reader.onerror = () => setError('Could not read the selected file.')
    reader.readAsText(file)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const backup = await fetchWorkspaceBackup()
      downloadBackup(backup)
      toast.success('Backup downloaded.')
    } catch (err) { toast.error(err.message || 'Could not export workspace.') }
    finally { setExporting(false) }
  }

  const doRestore = async () => {
    if (!parsed) return
    if (mode === 'replace') {
      const ok = await confirm({
        title: 'Replace workspace?',
        message: 'This will permanently overwrite the current workspace with the backup. Make sure you have exported a copy first.',
        confirmLabel: 'Replace workspace',
        danger: true,
      })
      if (!ok) return
    }

    setRestoring(true)
    try {
      await importWorkspaceBackup(parsed, mode)
      toast.success(mode === 'replace' ? 'Workspace restored from backup.' : 'Backup merged into workspace.')
      setTimeout(() => window.location.reload(), 900)
    } catch (err) {
      toast.error(`Restore failed: ${err.message}`)
      setRestoring(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Backup"
        description="Export or restore your QA Lab workspace."
        action={
          <button className="primary-button" type="button" onClick={handleExport} disabled={exporting || restoring}>
            {exporting ? 'Exporting…' : 'Export JSON'}
          </button>
        }
      />

      <section className="backup-layout">
        <article className="panel backup-panel">
          <div className="section-header">
            <h2>Current workspace</h2>
          </div>
          {currentSummary && <SummaryGrid summary={currentSummary} />}
          <p className="backup-note">
            Export includes projects, folders, requirements, test cases, plans, milestones, shared steps, saved runs, bugs, history, and evidence URLs.
          </p>
          <p className="backup-note">Uploaded attachment files, comments, unfinished run drafts, and workspace activity are not included. Keep a separate copy of uploaded files.</p>
          <p className="backup-note">Restored records receive new IDs. Member directory entries are included; accounts, passwords, invitations, project access, and public sharing links are not restored.</p>
        </article>

        <article className="panel backup-panel">
          <div className="section-header">
            <h2>Restore backup</h2>
          </div>

          <button className="backup-dropzone" type="button" onClick={() => fileRef.current?.click()}>
            <strong>Choose backup file</strong>
            <span>Only QA Lab JSON backups are accepted.</span>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              onChange={(e) => readFile(e.target.files[0])}
            />
          </button>

          {error && <div className="backup-alert backup-alert--danger">{error}</div>}

          {parsed && (
            <div className="restore-preview">
              <div className="restore-preview-header">
                <div>
                  <span>Backup date</span>
                  <strong>{new Date(parsed.exportedAt).toLocaleString()}</strong>
                </div>
                <span className="status-pill status-pill--passed">Valid file</span>
              </div>
              <SummaryGrid summary={importSummary} />

              <div className="restore-mode">
                <label>
                  <input
                    type="radio"
                    name="restore-mode"
                    checked={mode === 'merge'}
                    onChange={() => setMode('merge')}
                  />
                  <span>
                    <strong>Merge</strong>
                    Add new records alongside your current workspace.
                  </span>
                </label>
                <label>
                  <input
                    type="radio"
                    name="restore-mode"
                    checked={mode === 'replace'}
                    onChange={() => setMode('replace')}
                  />
                  <span>
                    <strong>Replace</strong>
                    Clear current workspace, then restore this file.
                  </span>
                </label>
              </div>

              <div className="restore-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => { setParsed(null); setError('') }}
                >
                  Clear file
                </button>
                <button
                  className="primary-button"
                  type="button"
                  disabled={restoring}
                  onClick={doRestore}
                >
                  {restoring ? 'Restoring…' : 'Restore workspace'}
                </button>
              </div>
            </div>
          )}
        </article>
      </section>
    </>
  )
}
