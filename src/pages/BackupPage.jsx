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
  const importSummary = parsed ? summarizeBackup(parsed) : null

  useEffect(() => {
    fetchWorkspaceBackup().then((backup) => setCurrentSummary(summarizeBackup(backup)))
  }, [])

  const readFile = (file) => {
    setError('')
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
    const backup = await fetchWorkspaceBackup()
    downloadBackup(backup)
    toast.success('Backup downloaded.')
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
          <button className="primary-button" type="button" onClick={handleExport}>
            Export JSON
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
            Export creates one JSON file containing projects, test cases, bugs, test runs, and team members.
          </p>
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
