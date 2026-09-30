import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { Modal } from './Modal'
import { matchingTestCases, parseRequirementFile, rowToRequirement, splitRequirementRefs } from '../utils/parseRequirementFile'
import { CheckIcon, DownloadIcon } from './Icons'
import { folderPath } from '../hooks/useProjectFolders'

const ACCEPT = '.xlsx,.xls,.csv'

const TEMPLATE_HEADERS = ['Key', 'Title', 'Description', 'Acceptance Criteria', 'Priority', 'Folder Path', 'Test Case IDs']

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    TEMPLATE_HEADERS,
    ['REQ-001', 'Customer can pay by card', 'Checkout must create an order after payment', 'Valid card creates one order\nDeclined card creates no order', 'High', '', ''],
  ])
  ws['!cols'] = TEMPLATE_HEADERS.map((h) => ({ wch: Math.max(h.length + 4, 18) }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Requirements')
  XLSX.writeFile(wb, 'requirements-template.xlsx')
}

const normalized = (value) => String(value || '').trim().toLowerCase()

function prepareRows(parsed, requirements, testCases, folders) {
  const seen = new Set()
  return parsed.map((row) => {
    const errors = [...row.errors]
    const key = normalized(row.data.key)
    const existing = key ? requirements.filter((req) => normalized(req.key) === key) : []
    if (key && seen.has(key)) errors.push('Duplicate requirement key in this file')
    if (key) seen.add(key)
    if (existing.length > 1) errors.push('This key matches multiple existing requirements')
    if (row.data.priority && !['high', 'medium', 'low'].includes(normalized(row.data.priority))) errors.push('Priority must be High, Medium, or Low')

    const missingCases = splitRequirementRefs(row.data.testCaseIdsRaw).filter((ref) =>
      matchingTestCases(testCases, ref).length === 0)
    if (missingCases.length) errors.push(`Unknown test case ID: ${missingCases.join(', ')}`)
    const ambiguousCases = splitRequirementRefs(row.data.testCaseIdsRaw).filter((ref) =>
      matchingTestCases(testCases, ref).length > 1)
    if (ambiguousCases.length) errors.push(`Ambiguous test case ID: ${ambiguousCases.join(', ')}`)

    const path = normalized(row.data.folderPathRaw)
    const matchingFolders = path ? folders.filter((folder) => normalized(folderPath(folders, folder.id)) === path) : []
    if (path && matchingFolders.length !== 1) errors.push(`Unknown or ambiguous folder: ${row.data.folderPathRaw}`)

    return { ...row, errors, existing: existing[0] || null, folderId: matchingFolders[0]?.id || null,
      action: errors.length ? 'skip' : existing.length ? 'skip' : 'create' }
  })
}

export function RequirementBulkUploadModal({ open, onClose, testCases, requirements, folders, onImportBatch, onUpdate }) {
  const inputRef = useRef(null)
  const [step, setStep] = useState(0)
  const [rows, setRows] = useState([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  if (!open) return null

  const reset = () => {
    setStep(0)
    setRows([])
    setResult(null)
    setImporting(false)
    setError('')
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleFile = (buffer, filename) => {
    try {
      const parsed = parseRequirementFile(buffer, filename)
      setRows(prepareRows(parsed.rows, requirements, testCases, folders))
      setError('')
      setStep(1)
    } catch (err) { setError(err.message || 'Could not read this file') }
  }

  const validRows = rows.filter((r) => r.action !== 'skip' && r.errors.length === 0)
  const setRowAction = (rowNum, action) => setRows((current) => current.map((row) => row.rowNum === rowNum ? { ...row, action } : row))

  const handleImport = async () => {
    setImporting(true)
    setError('')
    let created = 0
    let updated = 0
    try {
      const creates = validRows.filter((row) => row.action === 'create')
      for (let start = 0; start < creates.length; start += 25) {
        const chunk = creates.slice(start, start + 25)
        await onImportBatch(chunk.map((row) => rowToRequirement(row.data, testCases, row.folderId)))
        created += chunk.length
        setRows((current) => current.map((row) => chunk.some((done) => done.rowNum === row.rowNum) ? { ...row, action: 'skip' } : row))
      }
      for (const row of validRows.filter((item) => item.action === 'update')) {
        const incoming = rowToRequirement(row.data, testCases, row.folderId)
        await onUpdate({ ...row.existing, ...incoming,
          description: row.data.description ? incoming.description : row.existing.description,
          priority: row.data.priority ? incoming.priority : row.existing.priority,
          testCaseIds: row.data.testCaseIdsRaw ? incoming.testCaseIds : row.existing.testCaseIds,
          acceptanceCriteria: row.data.acceptanceCriteriaRaw ? incoming.acceptanceCriteria : row.existing.acceptanceCriteria,
          folderId: row.data.folderPathRaw ? incoming.folderId : row.existing.folderId })
        updated++
        setRows((current) => current.map((item) => item.rowNum === row.rowNum ? { ...item, action: 'skip' } : item))
      }
      setResult({ created, updated, skipped: rows.length - validRows.length })
      setStep(2)
    } catch (err) {
      setError(`${created} created and ${updated} updated before import stopped: ${err.message || 'Unknown error'}. Review the remaining rows and try again.`)
    } finally { setImporting(false) }
  }

  return (
    <Modal title="Import requirements" onClose={handleClose} style={{ maxWidth: 640 }}>
      {step === 0 && (
        <div className="bulk-upload-step">
          {error && <p className="bulk-file-error" role="alert">{error}</p>}
          <div
            className="drop-zone"
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          >
            <span className="drop-zone-icon" aria-hidden>📂</span>
            <span className="drop-zone-text">Drop a file here or <u>browse</u></span>
            <span className="drop-zone-hint">Accepts .xlsx, .xls, .csv</span>
            <input ref={inputRef} type="file" accept={ACCEPT} style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                const reader = new FileReader()
                reader.onload = (ev) => handleFile(ev.target.result, file.name)
                reader.readAsArrayBuffer(file)
              }}
            />
          </div>
          <div className="bulk-template-row">
            <p className="bulk-template-hint">
              Required: <em>Title</em>. Use a stable Key for later linking. Acceptance criteria: one per line. Folder Path must already exist; Test Case IDs must match existing cases.
            </p>
            <button className="secondary-button" type="button" onClick={downloadTemplate}>
              <DownloadIcon width={14} height={14} /> Download template
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="bulk-preview-step">
          {error && <p className="bulk-file-error" role="alert">{error}</p>}
          <p className="bulk-preview-summary">
            {validRows.length} row{validRows.length !== 1 ? 's' : ''} ready to import
            {rows.length - validRows.length > 0 && ` · ${rows.length - validRows.length} skipped`}
          </p>
          <div className="table-wrap" style={{ maxHeight: 280, overflow: 'auto' }}>
            <table className="rpt-table">
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Key</th>
                  <th>Title</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i}>
                    <td>{row.rowNum}</td>
                    <td className="mono">{row.data.key || '—'}</td>
                    <td>{row.data.title || '—'}</td>
                    <td>{row.data.priority || 'Medium'}</td>
                    <td>
                      {row.errors.length > 0
                        ? <span className="text-danger">{row.errors.join(', ')}</span>
                        : row.existing ? <span>Existing key</span> : <span className="text-success">Ready</span>}
                    </td>
                    <td>
                      <select value={row.action} disabled={row.errors.length > 0 || importing} aria-label={`Import action for row ${row.rowNum}`} onChange={(e) => setRowAction(row.rowNum, e.target.value)}>
                        {row.existing ? <option value="update">Update existing</option> : <option value="create">Create</option>}
                        <option value="skip">Skip</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="modal-footer">
            <button type="button" className="secondary-button" onClick={() => setStep(0)}>Back</button>
            <button type="button" className="primary-button" disabled={validRows.length === 0 || importing} onClick={handleImport}>
              {importing ? 'Importing…' : `Import ${validRows.length} requirement${validRows.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}

      {step === 2 && result && (
        <div className="bulk-done-step">
          <div className="bulk-done-icon"><CheckIcon width={32} height={32} /></div>
          <h3>Import complete</h3>
          <p>{result.created} created · {result.updated} updated{result.skipped > 0 ? ` · ${result.skipped} skipped` : ''}.</p>
          <button type="button" className="primary-button" onClick={handleClose}>Done</button>
        </div>
      )}
    </Modal>
  )
}
