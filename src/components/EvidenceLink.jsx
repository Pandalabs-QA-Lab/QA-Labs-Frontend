import { useState } from 'react'
import { attachmentDownloadUrl, getToken } from '../api/client'

export function EvidenceLink({ link, className, style, children }) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const open = async (event) => {
    if (!link.attachmentId) return
    event.preventDefault()
    if (loading) return
    setLoading(true)
    setError('')
    try {
      const response = await fetch(attachmentDownloadUrl(link.attachmentId), {
        headers: { Authorization: `Bearer ${getToken()}` }, signal: AbortSignal.timeout(30000),
      })
      if (!response.ok) throw new Error('Unable to open evidence. Check your project access and try again.')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const download = document.createElement('a')
      download.href = url
      download.download = link.label || 'QA Lab evidence'
      download.click()
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (cause) { setError(cause.message) }
    finally { setLoading(false) }
  }
  return <>
    <a href={link.attachmentId ? attachmentDownloadUrl(link.attachmentId) : link.url} onClick={open} target="_blank" rel="noreferrer" className={className} style={style}>{loading ? 'Downloading…' : children}</a>
    {error && <span role="alert">{error}</span>}
  </>
}
