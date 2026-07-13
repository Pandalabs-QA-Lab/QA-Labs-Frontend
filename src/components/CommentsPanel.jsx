import { useRef, useState } from 'react'
import { useComments } from '../hooks/useComments'
import { useUser } from '../context/UserContext'
import { useTeamMembers } from '../hooks/useTeamMembers'

// Render comment text with @mentions highlighted
function CommentText({ text, members }) {
  const memberNames = members.map((m) => m.name)
  const parts = []
  const pattern = /@([\w.\s-]+?)(?=\s|$|[^a-zA-Z0-9.\s-])/g
  let lastIndex = 0
  let match
  while ((match = pattern.exec(text)) !== null) {
    const name = match[1].trim()
    const isMember = memberNames.some((n) => n.toLowerCase() === name.toLowerCase())
    if (isMember) {
      if (match.index > lastIndex) parts.push({ type: 'text', value: text.slice(lastIndex, match.index) })
      parts.push({ type: 'mention', value: match[0] })
      lastIndex = match.index + match[0].length
    }
  }
  if (lastIndex < text.length) parts.push({ type: 'text', value: text.slice(lastIndex) })

  if (parts.length === 0) return <p className="comment-text">{text}</p>
  return (
    <p className="comment-text">
      {parts.map((p, i) =>
        p.type === 'mention'
          ? <span key={i} className="comment-mention">{p.value}</span>
          : p.value
      )}
    </p>
  )
}

export function CommentsPanel({ projectId, entityType, entityId, entityTitle, entityOwnerName }) {
  const { comments, addComment, deleteComment } = useComments(projectId, entityType, entityId)
  const { user } = useUser()
  const { members } = useTeamMembers()
  const [draft, setDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionStart, setMentionStart] = useState(-1)
  const textareaRef = useRef(null)

  const handleChange = (e) => {
    const val = e.target.value
    setDraft(val)

    const cursor = e.target.selectionStart
    const textUpToCursor = val.slice(0, cursor)
    const atMatch = textUpToCursor.match(/@([\w.\s-]*)$/)
    if (atMatch) {
      const query = atMatch[1].toLowerCase()
      const filtered = members.filter(
        (m) => m.name.toLowerCase().includes(query) && m.name !== user
      )
      setSuggestions(filtered.slice(0, 5))
      setMentionQuery(atMatch[1])
      setMentionStart(cursor - atMatch[0].length)
      setShowSuggestions(filtered.length > 0)
    } else {
      setShowSuggestions(false)
    }
  }

  const insertMention = (member) => {
    const before = draft.slice(0, mentionStart)
    const after = draft.slice(mentionStart + mentionQuery.length + 1) // +1 for @
    const newDraft = `${before}@${member.name} ${after}`
    setDraft(newDraft)
    setShowSuggestions(false)
    textareaRef.current?.focus()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!draft.trim()) return
    setSubmitting(true)
    await addComment(draft, { entityTitle, entityOwnerName })
    setDraft('')
    setShowSuggestions(false)
    setSubmitting(false)
  }

  return (
    <div className="comments-panel">
      <div className="comments-list">
        {comments.length === 0
          ? <p className="comments-empty">No comments yet.</p>
          : comments.map((c) => (
            <div key={c.id} className="comment-item">
              <div className="comment-avatar">{(c.authorName || '?').slice(0, 2).toUpperCase()}</div>
              <div className="comment-body">
                <div className="comment-meta">
                  <strong>{c.authorName}</strong>
                  <span className="comment-time">{new Date(c.createdAt).toLocaleString()}</span>
                  {c.authorName === user && (
                    <button type="button" className="comment-delete" onClick={() => deleteComment(c.id)} aria-label="Delete comment">×</button>
                  )}
                </div>
                <CommentText text={c.text} members={members} />
              </div>
            </div>
          ))
        }
      </div>

      <form className="comment-form" onSubmit={handleSubmit} style={{ position: 'relative' }}>
        {showSuggestions && (
          <div className="mention-suggestions">
            {suggestions.map((m) => (
              <button
                key={m.id}
                type="button"
                className="mention-suggestion-item"
                onMouseDown={(e) => { e.preventDefault(); insertMention(m) }}
              >
                <span className="mention-suggestion-avatar">{m.name.slice(0, 2).toUpperCase()}</span>
                {m.name}
              </button>
            ))}
          </div>
        )}
        <textarea
          ref={textareaRef}
          className="comment-input"
          rows={2}
          placeholder="Add a comment… use @name to mention someone"
          value={draft}
          onChange={handleChange}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setShowSuggestions(false)
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e)
          }}
        />
        <div className="comment-form-footer">
          <span className="comment-hint">Ctrl+Enter to submit · @name to mention</span>
          <button type="submit" className="primary-button" disabled={!draft.trim() || submitting}>
            {submitting ? 'Posting…' : 'Post'}
          </button>
        </div>
      </form>
    </div>
  )
}
