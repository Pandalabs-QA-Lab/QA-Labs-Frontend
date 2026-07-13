import { useState } from 'react'
import { useProjects } from '../hooks/useProjects'
import { useTeamMembers } from '../hooks/useTeamMembers'
import { useRequirements } from '../hooks/useRequirements'
import { useTestCases } from '../hooks/useTestCases'
import { useToast } from '../context/useToast'
import { XIcon } from './Icons'

const STEPS = [
  { id: 'project', title: 'Create your first project', description: 'Projects group test cases, bugs, and runs together.' },
  { id: 'team', title: 'Add team members', description: 'Invite your QA team so everyone can collaborate.' },
  { id: 'requirements', title: 'Add requirements or test cases', description: 'Start with what needs to be tested.' },
  { id: 'run', title: 'Start your first test run', description: 'Execute test cases and record results.' },
]

function StepIndicator({ current, total }) {
  return (
    <div className="onboarding-steps">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`onboarding-step ${i < current ? 'done' : ''} ${i === current ? 'active' : ''}`}>
          <div className="onboarding-step-dot">
            {i < current ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 11 2 2 4-4" />
              </svg>
            ) : (
              <span>{i + 1}</span>
            )}
          </div>
          {i < total - 1 && <div className="onboarding-step-line" />}
        </div>
      ))}
    </div>
  )
}

function ProjectStep({ onComplete }) {
  const { addProject } = useProjects()
  const toast = useToast()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    addProject({
      name: name.trim(),
      description: description.trim(),
      memberIds: [],
    })
    toast.success('Project created')
    onComplete()
  }

  return (
    <form className="onboarding-form" onSubmit={handleSubmit}>
      <label>
        Project name <span className="required">*</span>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Mobile App v2.1"
        />
      </label>
      <label>
        Description <span className="hint">(optional)</span>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this project about?"
        />
      </label>
      <div className="onboarding-actions">
        <button type="submit" className="primary-button" disabled={!name.trim()}>
          Create project
        </button>
      </div>
    </form>
  )
}

function TeamStep({ onComplete, projectId }) {
  const { members, addMember, removeMember } = useTeamMembers()
  const { projects, updateProject } = useProjects()
  const toast = useToast()
  const [name, setName] = useState('')
  const [role, setRole] = useState('Tester')

  const project = projects.find((p) => p.id === projectId)
  const memberIds = project?.memberIds ?? []

  const handleAdd = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    const newMember = addMember(name.trim(), role)
    toast.success(`${name.trim()} added as ${role}`)
    setName('')

    // Automatically assign the newly added member to this project
    if (project) {
      updateProject({
        ...project,
        memberIds: [...memberIds, newMember.id],
      })
    }
  }

  const toggleAssign = (mId) => {
    if (!project) return
    const isAssigned = memberIds.includes(mId)
    const nextIds = isAssigned
      ? memberIds.filter((id) => id !== mId)
      : [...memberIds, mId]
    updateProject({ ...project, memberIds: nextIds })
  }

  const handleDelete = (mId, mName) => {
    removeMember(mId)
    if (project && memberIds.includes(mId)) {
      updateProject({
        ...project,
        memberIds: memberIds.filter((id) => id !== mId),
      })
    }
    toast.success(`${mName} removed from workspace`)
  }

  return (
    <div>
      <form className="onboarding-form" onSubmit={handleAdd}>
        <div className="form-row">
          <label>
            Name <span className="required">*</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Team member name"
            />
          </label>
          <label>
            Role
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option>Tester</option>
              <option>QA Lead</option>
              <option>Viewer</option>
            </select>
          </label>
        </div>
        <button type="submit" className="secondary-button" disabled={!name.trim()}>
          + Add member
        </button>
      </form>

      {members.length > 0 && (
        <div className="onboarding-member-list" style={{ maxHeight: '200px', overflowY: 'auto' }}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-soft)', padding: '4px 8px', borderBottom: '1px solid var(--border)', marginBottom: '4px' }}>
            Assign to this project:
          </div>
          {members.map((m) => {
            const isAssigned = memberIds.includes(m.id)
            return (
              <div key={m.id} className="onboarding-member" style={{ gap: '12px' }}>
                <input
                  type="checkbox"
                  checked={isAssigned}
                  onChange={() => toggleAssign(m.id)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span className="onboarding-member-avatar">{m.name.charAt(0).toUpperCase()}</span>
                <span className="onboarding-member-name" style={{ flexGrow: 1 }}>{m.name}</span>
                <span className="onboarding-member-role" style={{ marginLeft: 0, marginRight: '8px' }}>{m.role}</span>
                <button
                  type="button"
                  onClick={() => handleDelete(m.id, m.name)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--danger)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px',
                    borderRadius: '4px',
                  }}
                  title={`Remove ${m.name} from workspace`}
                >
                  <XIcon width={12} height={12} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div className="onboarding-actions" style={{ marginTop: 16 }}>
        <button type="button" className="ghost-button" onClick={onComplete}>
          Skip for now
        </button>
        <button type="button" className="primary-button" onClick={onComplete}>
          Continue
        </button>
      </div>
    </div>
  )
}

function RequirementsStep({ onComplete, projectId }) {
  const toast = useToast()
  const { addRequirement } = useRequirements(projectId)
  const { addTestCase } = useTestCases(projectId)
  const [items, setItems] = useState([{ title: '', description: '' }])
  const [mode, setMode] = useState('requirements') // 'requirements' | 'testcases'

  const addItem = () => setItems([...items, { title: '', description: '' }])
  const updateItem = (i, field, val) => {
    const next = [...items]
    next[i] = { ...next[i], [field]: val }
    setItems(next)
  }
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i))

  const handleSave = () => {
    const valid = items.filter((item) => item.title.trim())
    if (valid.length === 0) {
      toast.error('Add at least one item')
      return
    }
    valid.forEach((item) => {
      if (mode === 'requirements') {
        addRequirement({ title: item.title.trim(), description: item.description.trim() })
      } else {
        addTestCase({ title: item.title.trim(), expected: item.description.trim() })
      }
    })
    toast.success(`${valid.length} ${mode === 'requirements' ? 'requirement' : 'test case'}${valid.length !== 1 ? 's' : ''} added`)
    onComplete()
  }

  return (
    <div>
      <div className="onboarding-mode-toggle">
        <button
          type="button"
          className={mode === 'requirements' ? 'active' : ''}
          onClick={() => setMode('requirements')}
        >
          Requirements
        </button>
        <button
          type="button"
          className={mode === 'testcases' ? 'active' : ''}
          onClick={() => setMode('testcases')}
        >
          Test cases
        </button>
      </div>

      <p className="onboarding-hint">
        {mode === 'requirements'
          ? 'What should the software do? Add high-level requirements.'
          : 'How do you test it? Add test cases with steps.'}
      </p>

      <div className="onboarding-items">
        {items.map((item, i) => (
          <div key={i} className="onboarding-item">
            <input
              autoFocus={i === 0}
              value={item.title}
              onChange={(e) => updateItem(i, 'title', e.target.value)}
              placeholder={mode === 'requirements' ? 'Requirement title' : 'Test case title'}
            />
            <input
              value={item.description}
              onChange={(e) => updateItem(i, 'description', e.target.value)}
              placeholder="Description (optional)"
            />
            {items.length > 1 && (
              <button type="button" className="onboarding-item-remove" onClick={() => removeItem(i)} aria-label="Remove">
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      <button type="button" className="ghost-button" onClick={addItem} style={{ marginBottom: 16 }}>
        + Add another
      </button>

      <div className="onboarding-actions">
        <button type="button" className="ghost-button" onClick={onComplete}>
          Skip for now
        </button>
        <button type="button" className="primary-button" onClick={handleSave}>
          Save & continue
        </button>
      </div>
    </div>
  )
}

function RunStep({ onComplete }) {
  const checklistItems = [
    {
      title: 'Add test cases',
      desc: 'Create manual steps & outcomes for structured testing.',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <path d="m9 14 2 2 4-4" />
        </svg>
      ),
    },
    {
      title: 'Link requirements',
      desc: 'Map cases to specs for clear coverage verification.',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      ),
    },
    {
      title: 'Create a test plan',
      desc: 'Define milestones and plan release targets.',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
          <line x1="4" x2="4" y1="22" y2="15" />
        </svg>
      ),
    },
    {
      title: 'Run & log results',
      desc: 'Execute tests live and record issues in real time.',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="6 3 20 12 6 21 6 3" />
        </svg>
      ),
    },
    {
      title: 'Check readiness matrix',
      desc: 'See test coverage statistics to approve delivery.',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect width="7" height="9" x="3" y="3" rx="1" />
          <rect width="7" height="5" x="14" y="3" rx="1" />
          <rect width="7" height="9" x="14" y="12" rx="1" />
          <rect width="7" height="5" x="3" y="16" rx="1" />
        </svg>
      ),
    },
  ]

  return (
    <div className="onboarding-final" style={{ width: '100%', maxWidth: '620px', margin: '0 auto' }}>
      <div className="onboarding-final-icon" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', animation: 'pulse 2s infinite alternate', width: '60px', height: '60px', borderRadius: '50%', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <path d="m9 11 3 3L22 4" />
        </svg>
      </div>
      <h3 style={{ fontSize: '22px', fontWeight: '800', fontFamily: 'var(--heading)', color: 'var(--text-strong)', textAlign: 'center', marginBottom: '8px' }}>You're all set!</h3>
      <p style={{ fontSize: '14px', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '24px' }}>
        Your project space is initialized and ready. Here is your roadmap to success:
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '8px',
        marginBottom: '20px',
        textAlign: 'left'
      }}>
        {checklistItems.map((item, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-sm)',
              transition: 'transform 0.2s ease, border-color 0.2s ease',
              cursor: 'default',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.borderColor = 'var(--accent)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none'
              e.currentTarget.style.borderColor = 'var(--border)'
            }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'var(--soft-bg)',
                color: 'var(--accent)',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                border: '1.5px solid var(--border-strong)',
                fontWeight: '700',
                fontSize: '11px',
              }}
            >
              {item.icon}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-strong)' }}>
                {index + 1}. {item.title}
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--text-soft)', lineHeight: '1.3' }}>
                {item.desc}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="onboarding-actions" style={{ justifyContent: 'center' }}>
        <button
          type="button"
          className="primary-button"
          onClick={onComplete}
          style={{ padding: '10px 24px', fontSize: '14px', fontWeight: '700' }}
        >
          Go to dashboard
        </button>
      </div>
    </div>
  )
}

function WelcomeStep({ onStart, onSkip }) {
  return (
    <>
      <div className="onboarding-header">
        <div className="onboarding-brand">
          <span className="brand-mark" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 11 2 2 4-4" />
            </svg>
          </span>
          <span>QA Lab</span>
        </div>
        <h1>Welcome to QA Lab</h1>
        <p>Take a quick guided tour to set up your first project, or skip it and explore on your own.</p>
      </div>
      <div className="onboarding-body">
        <div className="onboarding-actions" style={{ justifyContent: 'center', marginTop: 8 }}>
          <button type="button" className="ghost-button" onClick={onSkip}>
            Skip, I'll explore
          </button>
          <button type="button" className="primary-button" onClick={onStart}>
            Take the tour
          </button>
        </div>
      </div>
    </>
  )
}

export function OnboardingWizard({ onComplete }) {
  const [started, setStarted] = useState(false)
  const [step, setStep] = useState(0)
  const { projects } = useProjects()
  const projectId = projects[0]?.id

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1)
    } else {
      onComplete()
    }
  }

  const stepProps = { onComplete: next, projectId }

  return (
    <div className="onboarding-backdrop">
      <div className="onboarding-card">
        {!started ? (
          <WelcomeStep onStart={() => setStarted(true)} onSkip={onComplete} />
        ) : (
          <>
            <div className="onboarding-header">
              <div className="onboarding-brand">
                <span className="brand-mark" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="m9 11 2 2 4-4" />
                  </svg>
                </span>
                <span>QA Lab</span>
              </div>
              <h1>{STEPS[step].title}</h1>
              <p>{STEPS[step].description}</p>
            </div>

            <StepIndicator current={step} total={STEPS.length} />

            <div className="onboarding-body" style={{ maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}>
              {step === 0 && <ProjectStep {...stepProps} />}
              {step === 1 && <TeamStep {...stepProps} />}
              {step === 2 && <RequirementsStep {...stepProps} />}
              {step === 3 && <RunStep {...stepProps} />}
            </div>

            {step < STEPS.length - 1 && (
              <div className="onboarding-footer">
                <button type="button" className="ghost-button" onClick={() => (step === 0 ? setStarted(false) : setStep(step - 1))}>
                  Back
                </button>
                <button type="button" className="ghost-button" onClick={onComplete}>
                  Skip tour
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
