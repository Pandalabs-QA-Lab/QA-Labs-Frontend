import { useRef, useState } from 'react'
import { api, attachmentDownloadUrl } from '../api/client'

const MAX_FILE_SIZE = 15 * 1024 * 1024 // matches Backend MAX_UPLOAD_MB default

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getIconForType(type) {
  if (type?.startsWith('image/')) return '🖼️'
  if (type?.includes('pdf')) return '📄'
  if (type?.includes('spreadsheet') || type?.includes('csv') || type?.includes('excel')) return '📊'
  if (type?.includes('word') || type?.includes('document')) return '📝'
  if (type?.includes('zip') || type?.includes('archive')) return '📦'
  return '📎'
}

// Uploads real files via the backend's Multer endpoint (POST /api/attachments),
// linked to exactly one of testCaseId / bugId within the given project.
export function AttachmentField({ attachments = [], onChange, disabled = false, projectId, testCaseId, bugId }) {
  const fileInputRef = useRef(null)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleFiles = async (files) => {
    setError('')
    setSaving(true)
    const added = []

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`"${file.name}" exceeds the ${formatSize(MAX_FILE_SIZE)} limit (${formatSize(file.size)}).`)
        continue
      }
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('projectId', projectId)
        if (testCaseId) formData.append('testCaseId', testCaseId)
        if (bugId) formData.append('bugId', bugId)
        const attachment = await api.upload('/attachments', formData)
        added.push(attachment)
      } catch (err) {
        console.error('[attachments] upload failed:', err)
        setError(`Failed to upload "${file.name}".`)
      }
    }

    setSaving(false)
    if (added.length > 0) onChange([...attachments, ...added])
  }

  const handleInputChange = (e) => {
    const files = Array.from(e.target.files || [])
    handleFiles(files)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragActive(false)
    handleFiles(Array.from(e.dataTransfer.files))
  }

  const handleDragOver = (e) => { e.preventDefault(); setDragActive(true) }
  const handleDragLeave = () => setDragActive(false)

  const removeAttachment = async (att) => {
    await api.delete(`/attachments/${att.id}`)
    onChange(attachments.filter((a) => a.id !== att.id))
  }

  return (
    <div className="attachment-field">
      {attachments.length > 0 && (
        <div className="attachment-list">
          {attachments.map((att) => (
            <div key={att.id} className="attachment-item-wrap">
              <div className="attachment-item">
                <span className="attachment-icon">{getIconForType(att.mimetype)}</span>
                <div className="attachment-info">
                  <span className="attachment-name" title={att.filename}>{att.filename}</span>
                  {att.size && <span className="attachment-size">{formatSize(att.size)}</span>}
                </div>
                <a
                  href={attachmentDownloadUrl(att.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="attachment-preview-link"
                >
                  Open
                </a>
                {!disabled && (
                  <button
                    type="button"
                    className="attachment-remove"
                    onClick={() => removeAttachment(att)}
                    aria-label={`Remove ${att.filename}`}
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!disabled && (
        <div
          className={`attachment-dropzone ${dragActive ? 'attachment-dropzone--active' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <span className="attachment-dropzone-icon">📎</span>
          <span className="attachment-dropzone-text">{saving ? 'Uploading…' : 'Drop files here or click to upload'}</span>
          <span className="attachment-dropzone-hint">
            Max {formatSize(MAX_FILE_SIZE)} per file — images, docs, spreadsheets
          </span>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleInputChange}
            className="attachment-file-input"
            aria-label="Upload attachment"
          />
        </div>
      )}

      {error && <p className="attachment-error">{error}</p>}
    </div>
  )
}
