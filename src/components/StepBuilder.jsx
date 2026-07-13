import { XIcon } from './Icons'
import { useState } from 'react'

function LayersIcon(props) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  )
}

function GripIcon(props) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <circle cx="9" cy="5" r="1.6" /><circle cx="15" cy="5" r="1.6" />
      <circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" />
      <circle cx="9" cy="19" r="1.6" /><circle cx="15" cy="19" r="1.6" />
    </svg>
  )
}

export function StepBuilder({ steps, onChange, sharedSteps = [] }) {
  const [showSelector, setShowSelector] = useState(false)
  const [dragIndex, setDragIndex] = useState(null)
  const [overIndex, setOverIndex] = useState(null)

  const updateStep = (index, value) =>
    onChange(steps.map((step, stepIndex) => (stepIndex === index ? value : step)))

  const addStep = () => {
    onChange([...steps, ''])
    setShowSelector(false)
  }

  const addSharedBlock = (groupId) => {
    // If all existing steps are empty, replace them instead of appending after blanks
    const hasContent = steps.some((s) => typeof s === 'string' && s.trim() !== '' && !s.startsWith('shared_step_group:'))
    const base = hasContent ? steps : steps.filter((s) => typeof s === 'string' && s.trim() !== '')
    onChange([...base, `shared_step_group:${groupId}`])
    setShowSelector(false)
  }

  const removeStep = (index) => {
    if (steps.length === 1) return
    onChange(steps.filter((_, stepIndex) => stepIndex !== index))
  }

  // ── Drag-to-reorder ──
  const moveStep = (from, to) => {
    if (from == null || to == null || from === to) return
    const next = [...steps]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    onChange(next)
  }

  const handleDragStart = (index) => (event) => {
    setDragIndex(index)
    event.dataTransfer.effectAllowed = 'move'
    // Firefox requires data to be set for a drag to begin
    event.dataTransfer.setData('text/plain', String(index))
  }

  const handleDragOver = (index) => (event) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    if (index !== overIndex) setOverIndex(index)
  }

  const handleDrop = (index) => (event) => {
    event.preventDefault()
    moveStep(dragIndex, index)
    setDragIndex(null)
    setOverIndex(null)
  }

  const handleDragEnd = () => {
    setDragIndex(null)
    setOverIndex(null)
  }

  const rowClass = (index, base) => {
    const cls = [base]
    if (index === dragIndex) cls.push('step-row--dragging')
    if (index === overIndex && dragIndex !== null && index !== dragIndex) cls.push('step-row--over')
    return cls.join(' ')
  }

  const DragHandle = (index) => (
    <span
      className="step-drag-handle"
      draggable
      onDragStart={handleDragStart(index)}
      onDragEnd={handleDragEnd}
      role="button"
      tabIndex={-1}
      aria-label={`Drag to reorder step ${index + 1}`}
      title="Drag to reorder"
    >
      <GripIcon />
    </span>
  )

  return (
    <div className="step-builder">
      {steps.map((step, index) => {
        const isSharedRef = typeof step === 'string' && step.startsWith('shared_step_group:')
        
        if (isSharedRef) {
          const groupId = step.split(':')[1]
          const group = sharedSteps.find((g) => g.id === groupId)
          return (
            <div
              key={index}
              className={rowClass(index, 'step-row shared-step-row')}
              onDragOver={handleDragOver(index)}
              onDrop={handleDrop(index)}
            >
              {DragHandle(index)}
              <span className="step-num">{index + 1}</span>
              <div className="shared-step-block">
                <div className="shared-step-block-header">
                  <LayersIcon className="icon-shared" />
                  <strong>{group ? group.name : 'Deleted Shared Step Group'}</strong>
                  <span className="shared-badge">Shared block</span>
                </div>
                {group?.steps && group.steps.length > 0 ? (
                  <ol className="shared-step-nested-list">
                    {group.steps.map((nested, nIdx) => (
                      <li key={nIdx}>{nested}</li>
                    ))}
                  </ol>
                ) : (
                  <div className="shared-step-empty">No steps in this group</div>
                )}
              </div>
              <button
                type="button"
                className="step-remove"
                onClick={() => removeStep(index)}
                aria-label={`Remove step ${index + 1}`}
              >
                <XIcon width={12} height={12} />
              </button>
            </div>
          )
        }

        return (
          <div
            key={index}
            className={rowClass(index, 'step-row')}
            onDragOver={handleDragOver(index)}
            onDrop={handleDrop(index)}
          >
            {DragHandle(index)}
            <span className="step-num">{index + 1}</span>
            <input
              value={step}
              onChange={(event) => updateStep(index, event.target.value)}
              placeholder={`Step ${index + 1}`}
            />
            <button
              type="button"
              className="step-remove"
              onClick={() => removeStep(index)}
              aria-label={`Remove step ${index + 1}`}
            >
              <XIcon width={12} height={12} />
            </button>
          </div>
        )
      })}

      <div className="step-builder-actions">
        <button type="button" className="step-add" onClick={addStep}>
          + Add manual step
        </button>

        {sharedSteps.length > 0 && (
          <div className="shared-step-selector-wrap">
            <button
              type="button"
              className="step-add secondary"
              onClick={() => setShowSelector(!showSelector)}
            >
              + Shared steps
            </button>
            
            {showSelector && (
              <div className="shared-step-select-dropdown">
                <div className="dropdown-title">Select shared steps:</div>
                {sharedSteps.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    className="dropdown-item"
                    onClick={() => addSharedBlock(g.id)}
                  >
                    <LayersIcon width={10} height={10} style={{ marginRight: 6, opacity: 0.7 }} />
                    {g.name} ({g.steps?.length || 0} steps)
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
