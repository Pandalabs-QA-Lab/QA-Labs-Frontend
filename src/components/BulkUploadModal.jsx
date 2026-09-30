import { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { Modal } from './Modal'
import { parseTestCaseFile, rowToTestCase, splitRequirementKeys } from '../utils/parseTestCaseFile'
import { CheckIcon, XIcon, DownloadIcon } from './Icons'
import { addActivity } from '../utils/activity'
import { openGooglePicker, downloadDriveFile } from '../utils/googlePicker'

const ACCEPT = '.xlsx,.xls,.csv'

const TEMPLATE_HEADERS = [
  'TC ID', 'Module', 'Test Scenario', 'Test Case Title',
  'Pre-conditions', 'Test Steps', 'Test Data',
  'Expected Result', 'Actual Result', 'Status', 'Dev Remarks', 'QA Remarks', 'Requirement IDs',
]

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    TEMPLATE_HEADERS,
    ['TC_001', 'Login', 'Valid login flow', 'Verify user can login with valid credentials',
     'User is registered', '1. Go to /login\n2. Enter credentials\n3. Click Sign in',
     'valid@example.com / Pass@123', 'Redirect to dashboard', '', 'Not Executed', '', '', 'REQ-001'],
  ])
  ws['!cols'] = TEMPLATE_HEADERS.map((h) => ({ wch: Math.max(h.length + 4, 18) }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Test Cases')
  XLSX.writeFile(wb, 'test-cases-template.xlsx')
}

function normalizeKeyPart(value) {
  return String(value ?? '').trim().toLowerCase()
}

function duplicateKey(data) {
  const sourceTcId = normalizeKeyPart(data.sourceTcId)
  if (sourceTcId) return `tc:${sourceTcId}`

  const title = normalizeKeyPart(data.title)
  const module = normalizeKeyPart(data.module)
  if (!title) return ''
  return `title:${module}:${title}`
}

function findExistingMatch(data, existingTestCases) {
  const sourceTcId = normalizeKeyPart(data.sourceTcId)
  if (sourceTcId) {
    const match = existingTestCases.find((tc) => normalizeKeyPart(tc.sourceTcId) === sourceTcId)
    if (match) return { testCase: match, reason: `TC ID ${data.sourceTcId}` }
  }

  const title = normalizeKeyPart(data.title)
  const module = normalizeKeyPart(data.module)
  if (!title) return null

  const match = existingTestCases.find((tc) =>
    normalizeKeyPart(tc.title) === title && normalizeKeyPart(tc.module) === module
  )
  return match ? { testCase: match, reason: 'same title and module' } : null
}

function prepareRows(parsedRows, existingTestCases, requirements) {
  const seen = new Map()

  return parsedRows.map((row) => {
    const errors = [...row.errors]
    const requirementIds = []
    for (const key of splitRequirementKeys(row.data.requirementKeysRaw)) {
      const matches = requirements.filter((req) => normalizeKeyPart(req.key) === normalizeKeyPart(key))
      if (matches.length !== 1) errors.push(`${matches.length ? 'Ambiguous' : 'Unknown'} requirement ID: ${key}`)
      else if (!requirementIds.includes(matches[0].id)) requirementIds.push(matches[0].id)
    }
    if (errors.length > 0) return { ...row, errors, requirementIds, duplicate: null, action: 'skip' }

    const existing = findExistingMatch(row.data, existingTestCases)
    if (existing) {
      return {
        ...row, errors, requirementIds,
        duplicate: { type: 'existing', ...existing },
        action: 'skip',
      }
    }

    const key = duplicateKey(row.data)
    if (key && seen.has(key)) {
      return {
        ...row, errors, requirementIds,
        duplicate: { type: 'file', rowNum: seen.get(key), reason: `same as row ${seen.get(key)}` },
        action: 'skip',
      }
    }

    if (key) seen.set(key, row.rowNum)
    return { ...row, errors, requirementIds, duplicate: null, action: 'create' }
  })
}

// ── Google Sheets URL helpers ───────────────────────────────────────────────
const SHEET_ID_RE = /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/
const GID_RE = /gid=(\d+)/

function parseGoogleSheetUrl(url) {
  const trimmed = url.trim()
  const idMatch = trimmed.match(SHEET_ID_RE)
  if (!idMatch) return null

  const sheetId = idMatch[1]
  const gidMatch = trimmed.match(GID_RE)
  const gid = gidMatch ? gidMatch[1] : '0'

  return { sheetId, gid }
}

function toXlsxExportUrl(sheetId) {
  // XLSX export fetches ALL sheets so multi-sheet → folder detection works
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`
}

// ── Google Drive logo (official multicolor mark) ────────────────────────────
function GoogleDriveLogo({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 87.3 78" aria-hidden focusable="false">
      <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
      <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47" />
      <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335" />
      <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d" />
      <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc" />
      <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00" />
    </svg>
  )
}

// ── Stepper indicator ──────────────────────────────────────────────────────
const STEPS = ['Upload', 'Preview', 'Done']

function Stepper({ step }) {
  return (
    <div className="bulk-stepper" aria-label="Progress">
      {STEPS.map((label, i) => (
        <div key={label} className={`bulk-step ${i < step ? 'bulk-step--done' : i === step ? 'bulk-step--active' : ''}`}>
          <span className="bulk-step-dot">{i < step ? <CheckIcon width={12} height={12} /> : i + 1}</span>
          <span className="bulk-step-label">{label}</span>
          {i < STEPS.length - 1 && <span className="bulk-step-line" />}
        </div>
      ))}
    </div>
  )
}

// ── Drop zone (file upload) ────────────────────────────────────────────────
function DropZone({ onFile }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')

  const handle = (file) => {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      setError('Invalid file type. Please upload a .xlsx, .xls, or .csv file.')
      return
    }
    setError('')
    const reader = new FileReader()
    reader.onload = (e) => onFile(e.target.result, file.name)
    reader.readAsArrayBuffer(file)
  }

  return (
    <div className="bulk-upload-step">
      <div
        className={`drop-zone${dragging ? ' drop-zone--active' : ''}`}
        onClick={() => inputRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files[0]) }}
        role="button"
        tabIndex={0}
        aria-label="Upload file"
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current.click()}
      >
        <span className="drop-zone-icon" aria-hidden>📂</span>
        <span className="drop-zone-text">Drop a file here or <u>browse</u></span>
        <span className="drop-zone-hint">Accepts .xlsx, .xls, .csv</span>
        <input ref={inputRef} type="file" accept={ACCEPT} style={{ display: 'none' }}
          onChange={(e) => handle(e.target.files[0])} />
      </div>
      {error && <p className="bulk-file-error">{error}</p>}
      <div className="bulk-template-row">
        <p className="bulk-template-hint">
          Required: <em>Module, Test Case Title, Test Steps, Expected Result</em>. Optional Requirement IDs must match keys already in this project.
        </p>
        <button className="secondary-button" type="button" onClick={downloadTemplate}>
          <DownloadIcon width={14} height={14} /> Download template
        </button>
      </div>
    </div>
  )
}

// ── Google Sheet import ─────────────────────────────────────────────────────
function GoogleSheetImport({ onCsvParsed }) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleImport = async () => {
    const parsed = parseGoogleSheetUrl(url)
    if (!parsed) {
      setError('Invalid Google Sheets URL. Please paste a link that contains /spreadsheets/d/.')
      return
    }

    setError('')
    setLoading(true)

    try {
      const exportUrl = toXlsxExportUrl(parsed.sheetId)
      const res = await fetch(exportUrl)

      if (!res.ok) {
        if (res.status === 403 || res.status === 404) {
          setError('This sheet must be public or published to the web. Check sharing settings and try again.')
        } else {
          setError(`Failed to fetch sheet (HTTP ${res.status}). Please verify the link and try again.`)
        }
        setLoading(false)
        return
      }

      const buffer = await res.arrayBuffer()

      if (!buffer || buffer.byteLength === 0) {
        setError('The spreadsheet appears to be empty. Please check the content and try again.')
        setLoading(false)
        return
      }

      // Pass as .xlsx so the parser detects all sheets and maps each to a folder
      onCsvParsed(buffer, 'google-sheet.xlsx')
    } catch {
      setError(
        'Could not fetch the sheet. This sheet must be public or published to the web. ' +
        'Private sheets cannot be imported without authentication.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bulk-upload-step">
      <div className="gs-import">
        <label className="gs-label">
          Google Sheets URL
          <input
            type="url"
            className="gs-input"
            placeholder="https://docs.google.com/spreadsheets/d/..."
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError('') }}
            onKeyDown={(e) => { if (e.key === 'Enter' && url.trim()) handleImport() }}
            disabled={loading}
            aria-label="Google Sheets URL"
          />
        </label>
        <button
          className="primary-button"
          type="button"
          disabled={!url.trim() || loading}
          onClick={handleImport}
        >
          {loading ? 'Fetching…' : 'Import from link'}
        </button>
      </div>
      {loading && (
        <div className="gs-loading" aria-live="polite">
          <span className="gs-spinner" />
          <span>Fetching sheet data…</span>
        </div>
      )}
      {error && <p className="bulk-file-error">{error}</p>}
      <div className="bulk-template-row">
        <p className="bulk-template-hint">
          Paste a link to a <em>public</em> Google Sheet. The sheet must be set to
          "Anyone with the link" or published to the web. Multiple sheets will each become a folder.
        </p>
        <button className="secondary-button" type="button" onClick={downloadTemplate}>
          <DownloadIcon width={14} height={14} /> Download template
        </button>
      </div>
    </div>
  )
}

// ── Google Drive import ─────────────────────────────────────────────────────
function GoogleDriveImport({ onCsvParsed }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSelect = () => {
    setError('')
    openGooglePicker(
      async (file, accessToken) => {
        setLoading(true)
        try {
          const buffer = await downloadDriveFile(file.id, file.mimeType, accessToken)
          onCsvParsed(buffer, file.name)
        } catch (err) {
          setError(err.message || 'Failed to download selected file.')
        } finally {
          setLoading(false)
        }
      },
      (errMessage) => {
        setError(errMessage)
      },
      { mode: 'spreadsheets' }
    )
  }

  return (
    <div className="bulk-upload-step">
      <div className="drive-zone">
        <span className="drive-zone-logo" aria-hidden>
          <GoogleDriveLogo size={34} />
        </span>
        <div>
          <p className="drive-zone-title">Import from Google Drive</p>
          <p className="drive-zone-sub">
            Pick any Google Sheet, Excel, or CSV file from your Drive. It’s downloaded
            and parsed securely — nothing is stored.
          </p>
        </div>
        <button className="drive-btn" type="button" disabled={loading} onClick={handleSelect}>
          {loading ? (
            <>
              <span className="gs-spinner" />
              Downloading…
            </>
          ) : (
            <>
              <GoogleDriveLogo size={18} />
              Select from Drive
            </>
          )}
        </button>
      </div>
      {error && <p className="bulk-file-error" style={{ textAlign: 'center' }}>{error}</p>}
      <div className="bulk-template-row">
        <p className="bulk-template-hint">
          Required columns: <em>Module, Test Case Title, Test Steps, Expected Result</em>
        </p>
        <button className="secondary-button" type="button" onClick={downloadTemplate}>
          <DownloadIcon width={14} height={14} /> Download template
        </button>
      </div>
    </div>
  )
}

// ── Validation badge ───────────────────────────────────────────────────────
function ValidationBadge({ errors }) {
  if (errors.length === 0) return <span className="vbadge vbadge--valid"><CheckIcon width={12} height={12} /> Valid</span>
  return (
    <span className="vbadge vbadge--invalid" title={errors.join('\n')}>
      <XIcon width={12} height={12} /> {errors.length} error{errors.length > 1 ? 's' : ''}
    </span>
  )
}

function DuplicateBadge({ duplicate }) {
  if (!duplicate) return <span className="text-muted">-</span>
  if (duplicate.type === 'existing') {
    return <span className="vbadge vbadge--warning" title={duplicate.testCase.title}>Existing case</span>
  }
  return <span className="vbadge vbadge--warning" title={duplicate.reason}>File duplicate</span>
}

// ── Main modal ─────────────────────────────────────────────────────────────
const IMPORT_TABS = [
  { key: 'file', label: 'Browse local' },
  { key: 'drive', label: 'Google Drive' },
  { key: 'google', label: 'URL' },
]

export function BulkUploadModal({ existingTestCases = [], requirements = [], onImport, onUpdate, onLinkRequirement, onClose }) {
  const { projectId } = useParams()
  const [step, setStep]           = useState(0)   // 0=upload 1=preview 2=done
  const [rows, setRows]           = useState([])
  const [filename, setFilename]   = useState('')
  const [summary, setSummary]     = useState(null)
  const [importTab, setImportTab] = useState('file')
  const [isMultiSheet, setIsMultiSheet] = useState(false)
  const [sheetNames, setSheetNames]     = useState([])
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')

  const validRows   = rows.filter((r) => r.errors.length === 0 && r.action !== 'skip')
  const invalidRows = rows.filter((r) => r.errors.length > 0)
  const duplicateRows = rows.filter((r) => r.duplicate)
  const skippedRows = rows.filter((r) => r.errors.length > 0 || r.action === 'skip')
  const createRows = validRows.filter((r) => r.action === 'create')
  const updateRows = validRows.filter((r) => r.action === 'update')

  const handleFile = (buffer, name) => {
    try {
      const { rows: parsed, isMultiSheet: multi, sheetNames: sheets } = parseTestCaseFile(buffer, name)
      setFilename(name)
      setIsMultiSheet(multi || false)
      setSheetNames(sheets || [])
      setRows(prepareRows(parsed, existingTestCases, requirements))
      setStep(1)
    } catch (err) {
      console.error('[bulkUpload] Parse failed:', err)
      addActivity({
        entityType: 'import',
        projectId,
        action: 'imported',
        title: `CSV import failed: ${err.message || 'Invalid columns'}`,
        metadata: { filename: name, error: err.message }
      })
      throw err
    }
  }

  const setRowAction = (rowNum, action) => {
    setRows((current) => current.map((row) => (
      row.rowNum === rowNum ? { ...row, action } : row
    )))
  }

  const handleImport = async () => {
    setImporting(true)
    setImportError('')
    const links = new Map()
    const failures = []
    let created = 0
    let updated = 0
    const recordLinks = (row, caseId) => row.requirementIds.forEach((requirementId) => {
      if (!links.has(requirementId)) links.set(requirementId, new Set())
      links.get(requirementId).add(caseId)
    })

    for (let start = 0; start < createRows.length; start += 10) {
      const chunk = createRows.slice(start, start + 10)
      const results = await Promise.allSettled(chunk.map((row) => {
        const data = rowToTestCase(row.data)
        if (row.duplicate) delete data.sourceTcId // A duplicate imported as new needs a fresh ID.
        return onImport(data)
      }))
      results.forEach((result, index) => {
        const row = chunk[index]
        if (result.status === 'fulfilled') {
          created++
          recordLinks(row, result.value.id)
        } else failures.push(`Row ${row.rowNum}: ${result.reason?.message || 'Could not create test case'}`)
      })
    }

    for (const row of updateRows) {
      const incoming = rowToTestCase(row.data)
      const existing = row.duplicate.testCase
      try {
        const saved = await onUpdate({
          ...existing,
          folder: incoming.folder || existing.folder || '',
          folderId: incoming.folder ? undefined : existing.folderId,
          module: incoming.module || existing.module,
          title: incoming.title,
          scenario: incoming.scenario || existing.scenario,
          preconditions: incoming.preconditions || existing.preconditions,
          steps: incoming.steps?.length ? incoming.steps : existing.steps,
          testData: incoming.testData || existing.testData,
          expected: incoming.expected || existing.expected,
          devRemarks: incoming.devRemarks || existing.devRemarks,
          qaRemarks: incoming.qaRemarks || existing.qaRemarks,
          updatedAt: new Date().toISOString(),
        })
        updated++
        recordLinks(row, saved.id)
      } catch (error) { failures.push(`Row ${row.rowNum}: ${error.message || 'Could not update test case'}`) }
    }

    for (const [requirementId, caseIds] of links) {
      const requirement = requirements.find((req) => req.id === requirementId)
      try {
        await onLinkRequirement({ ...requirement, testCaseIds: [...new Set([...(requirement.testCaseIds || []), ...caseIds])] })
      } catch (error) { failures.push(`${requirement.key || requirement.title}: ${error.message || 'Could not link cases'}`) }
    }

    if (created + updated > 0) {
      addActivity({ entityType: 'import', projectId, action: 'imported',
        title: `${created + updated} test cases imported`,
        details: `${created} created, ${updated} updated from ${filename}.`,
        metadata: { filename, createdCount: created, updatedCount: updated, source: importTab === 'google' ? 'Google Sheet' : 'CSV/Excel file' } })
    }
    setSummary({ total: rows.length, created, updated, skipped: skippedRows.length, failed: failures.length })
    setImportError(failures.join('\n'))
    setStep(2)
    setImporting(false)
  }

  const reset = () => { setStep(0); setRows([]); setFilename(''); setSummary(null); setImportTab('file'); setIsMultiSheet(false); setSheetNames([]); setImportError(''); setImporting(false) }

  // Widen modal during preview
  const modalStyle = step === 1 ? { maxWidth: 1040 } : {}

  return (
    <Modal title="Bulk upload test cases" onClose={onClose} style={modalStyle}>
      <div className="bulk-modal-body">
        <Stepper step={step} />

        {/* ── Step 0: Upload ── */}
        {step === 0 && (
          <>
            <div className="bulk-import-tabs" role="tablist" aria-label="Import source">
              {IMPORT_TABS.map((tab) => (
                <button
                  key={tab.key}
                  id={`bulk-tab-${tab.key}`}
                  role="tab"
                  aria-selected={importTab === tab.key}
                  aria-controls={`bulk-panel-${tab.key}`}
                  className={`bulk-import-tab${importTab === tab.key ? ' bulk-import-tab--active' : ''}`}
                  type="button"
                  onClick={() => setImportTab(tab.key)}
                >
                  {tab.key === 'file' && <span className="bulk-import-tab-icon" aria-hidden>📁</span>}
                  {tab.key === 'drive' && <span className="bulk-import-tab-icon" aria-hidden>☁️</span>}
                  {tab.key === 'google' && <span className="bulk-import-tab-icon" aria-hidden>🔗</span>}
                  {tab.label}
                </button>
              ))}
            </div>

            <div role="tabpanel" id={`bulk-panel-${importTab}`}>
              {importTab === 'file' && <DropZone onFile={handleFile} />}
              {importTab === 'drive' && <GoogleDriveImport onCsvParsed={handleFile} />}
              {importTab === 'google' && <GoogleSheetImport onCsvParsed={handleFile} />}
            </div>
          </>
        )}

        {/* ── Step 1: Preview ── */}
        {step === 1 && (
          <>
            <div className="bulk-file-bar">
              <span className="bulk-filename">📄 {filename}</span>
              {isMultiSheet && (
                <span className="bulk-sheet-info">
                  {sheetNames.length} sheets → folders: <strong>{sheetNames.join(', ')}</strong>
                </span>
              )}
              <button className="link-btn" type="button" onClick={reset}>Change file</button>
            </div>

            <div className="bulk-counts">
              <span className="bulk-count-total">{rows.length} rows found</span>
              {validRows.length > 0 && (
                <span className="vbadge vbadge--valid">{validRows.length} selected</span>
              )}
              {invalidRows.length > 0 && (
                <span className="vbadge vbadge--invalid">{invalidRows.length} invalid — will be skipped</span>
              )}
              {duplicateRows.length > 0 && (
                <span className="vbadge vbadge--warning">{duplicateRows.length} duplicate</span>
              )}
            </div>

            {rows.length === 0 ? (
              <div className="empty-table-row">No data rows found in the file.</div>
            ) : (
              <div className="table-wrap bulk-preview-table">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>#</th>
                      {isMultiSheet && <th style={{ width: 110 }}>Folder</th>}
                      <th>Title</th>
                      <th style={{ width: 120 }}>Module</th>
                      <th style={{ width: 110 }}>Status</th>
                      <th style={{ width: 140 }}>Requirement IDs</th>
                      <th style={{ width: 130 }}>Validation</th>
                      <th style={{ width: 130 }}>Duplicate</th>
                      <th style={{ width: 140 }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.rowNum} className={row.errors.length ? 'bulk-row--invalid' : row.duplicate ? 'bulk-row--duplicate' : ''}>
                        <td className="mono tc-id">{row.rowNum}</td>
                        {isMultiSheet && (
                          <td>
                            {row.data.folder
                              ? <span className="bulk-folder-badge">📁 {row.data.folder}</span>
                              : <em className="text-muted">—</em>}
                          </td>
                        )}
                        <td title={row.data.title} className="bulk-cell-truncate">
                          {row.data.title || <em className="text-muted">—</em>}
                        </td>
                        <td>{row.data.module || <em className="text-muted">—</em>}</td>
                        <td>{row.data.statusRaw || <em className="text-muted">—</em>}</td>
                        <td>{row.data.requirementKeysRaw || <em className="text-muted">—</em>}</td>
                        <td><ValidationBadge errors={row.errors} />{row.errors.length > 0 && <small className="text-danger" style={{ display: 'block', marginTop: 4 }}>{row.errors.join('; ')}</small>}</td>
                        <td><DuplicateBadge duplicate={row.duplicate} /></td>
                        <td>
                          <select
                            className="inline-select bulk-action-select"
                            value={row.action}
                            aria-label={`Import action for row ${row.rowNum}`}
                            disabled={row.errors.length > 0 || importing}
                            onChange={(e) => setRowAction(row.rowNum, e.target.value)}
                          >
                            {row.duplicate && <option value="skip">Skip</option>}
                            {row.duplicate?.type === 'existing' && <option value="update">Update existing (move to folder)</option>}
                            <option value="create">Import as new</option>
                            {!row.duplicate && <option value="skip">Skip</option>}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="modal-footer">
              <button className="secondary-button" type="button" onClick={reset}>Back</button>
              <button className="primary-button" type="button"
                disabled={validRows.length === 0 || importing} onClick={handleImport}>
                {importing ? 'Importing…' : `Apply ${validRows.length} change${validRows.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </>
        )}

        {/* ── Step 2: Done ── */}
        {step === 2 && summary && (
          <div className="bulk-summary">
            <span className="bulk-summary-icon" aria-hidden>✅</span>
            <h3>Import complete</h3>
            <div className="bulk-summary-stats">
              <div><strong>{summary.total}</strong><span>Total rows</span></div>
              <div><strong className="metric-passed">{summary.created}</strong><span>Created</span></div>
              <div><strong>{summary.updated}</strong><span>Updated</span></div>
              <div>
                <strong className={summary.skipped > 0 ? 'metric-failed' : ''}>
                  {summary.skipped}
                </strong>
                <span>Skipped</span>
              </div>
            </div>
            {summary.failed > 0 && <p className="bulk-file-error" role="alert">{summary.failed} operation(s) failed. {importError}</p>}
            <div className="modal-footer">
              <button className="secondary-button" type="button" onClick={reset}>Upload another</button>
              <button className="primary-button" type="button" onClick={onClose}>Done</button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
