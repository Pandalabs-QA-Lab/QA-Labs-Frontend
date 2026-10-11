import { Modal } from './Modal'
import { EvidenceLink } from './EvidenceLink'
import { ScreenshotPreview } from './ScreenshotPreview'

export function BugPreview({ bug, testCases = [], requirements = [], onClose, onEdit }) {
  const testCase = testCases.find(item => item.id === (bug.linkedTestCase || bug.linkedTestCaseId))
  const requirement = requirements.find(item => item.id === bug.linkedRequirementId)
  const fields = [['Description', bug.description], ['Steps to reproduce', bug.stepsToReproduce], ['Expected result', bug.expected], ['Actual result', bug.actual], ['Environment', bug.environment]]
  const screenshots = (bug.evidenceLinks || []).filter(link => link.attachmentId)
  const otherEvidence = (bug.evidenceLinks || []).filter(link => !link.attachmentId)
  return <Modal title="Bug preview" className="modal--bug-preview" onClose={onClose} style={{ width: 'min(900px, calc(100vw - 32px))', maxWidth: '900px' }}>
    <div className="bug-preview-body" tabIndex={0} aria-label="Bug images and issue details">
      <section className="bug-preview-images" aria-label="Screenshot previews">
        {screenshots.map(link => <ScreenshotPreview key={link.attachmentId} link={link} />)}
        {!screenshots.length && <p className="bug-preview-no-image">No screenshot attached to this issue.</p>}
      </section>
      <div className="bug-preview-heading"><span className="mono">{bug.sourceBugId || 'Bug'}</span><h3>{bug.title}</h3>
        <div className="bug-preview-badges">
          <span className="bug-preview-badge" data-tone={bug.status === 'Closed' ? 'success' : 'info'}>{bug.status}</span>
          <span className="bug-preview-badge" data-tone={bug.severity === 'Critical' ? 'danger' : bug.severity === 'Major' ? 'warning' : 'neutral'}>{bug.severity} severity</span>
          <span className="bug-preview-badge" data-tone={bug.priority === 'High' ? 'danger' : 'neutral'}>{bug.priority} priority</span>
        </div>
      </div>
      <dl className="bug-preview-summary">
        {[['Build', bug.build], ['Assignee', bug.assignedTo], ['Reporter', bug.reportedByName || bug.reportedBy], ['Reported date', bug.reportedDate], ['Test case', testCase?.title], ['Requirement', requirement?.title]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || '—'}</dd></div>)}
      </dl>
      <div className="bug-preview-sections">{fields.filter(([, value]) => value).map(([label, value]) => <section key={label} data-section={label}><h4>{label}</h4><p>{value}</p></section>)}</div>
      {!!otherEvidence.length && <section><h4>Other evidence</h4>{otherEvidence.map((link, index) => <p key={link.id || index}><EvidenceLink link={link}>{link.label || 'Open evidence'}</EvidenceLink></p>)}</section>}
    </div>
    <div className="modal-footer"><button type="button" className="secondary-button" onClick={onClose}>Close</button>{onEdit && <button type="button" className="primary-button" onClick={onEdit}>Edit bug</button>}</div>
  </Modal>
}
