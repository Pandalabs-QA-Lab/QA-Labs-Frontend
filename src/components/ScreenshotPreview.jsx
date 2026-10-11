import { useEffect, useState } from 'react'

import { EvidenceLink } from './EvidenceLink'
import { attachmentDownloadUrl, getToken } from '../api/client'

export function ScreenshotPreview({ link }) {
  const [result, setResult] = useState(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    let objectUrl
    const load = async () => {
      try {
        const response = await fetch(attachmentDownloadUrl(link.attachmentId), {
          headers: { Authorization: `Bearer ${getToken()}` }, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30000)]),
        })
        if (!response.ok) throw new Error('Screenshot could not be loaded. Check your connection and project access.')
        const blob = await response.blob()
        if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(blob.type)) throw new Error('This attachment is not a supported image. Use Download evidence to open it.')
        if (blob.size > 15 * 1024 * 1024) throw new Error('This image is too large to preview. Use Download evidence instead.')
        if (controller.signal.aborted) return
        objectUrl = URL.createObjectURL(blob)
        setResult({ attempt, url: objectUrl })
      } catch (error) {
        if (!controller.signal.aborted) setResult({ attempt, error: error.message })
      }
    }
    load()
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [link.attachmentId, attempt])
  const current = result?.attempt === attempt ? result : null
  return <figure className="bug-preview-evidence">
    <figcaption>{link.label || 'Screenshot'}</figcaption>
    {!current && <p role="status">Loading screenshot…</p>}
    {current?.url && <a href={current.url} target="_blank" rel="noreferrer"><img src={current.url} alt={link.label || 'Bug screenshot'} /><span>Open full-size image ↗</span></a>}
    {current?.error && <div><p role="alert">{current.error}</p><button type="button" className="secondary-button" onClick={() => setAttempt(value => value + 1)}>Retry preview</button></div>}
    <EvidenceLink link={link}>Download evidence</EvidenceLink>
  </figure>
}
