import { useState } from 'react'

export function BrowserExtensionSettings() {
  const [copied, setCopied] = useState('')
  const [copyError, setCopyError] = useState('')
  const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'
  const appUrl = `${window.location.origin}${import.meta.env.BASE_URL}`
  const copy = async (value, label) => {
    try { await navigator.clipboard.writeText(value); setCopied(label); setCopyError('') }
    catch { setCopyError('Copy is unavailable. Select and copy the address below.') }
  }
  return (
    <section className="settings-card extension-settings" aria-labelledby="extension-title">
      <div className="settings-card-header"><h3 id="extension-title">Browser bug capture</h3><span className="badge">Beta · Chrome & Edge</span></div>
      <div className="settings-card-body">
        <p>Capture a screenshot, highlight the problem, hide private information, and report a bug directly to your project.</p>
        <a className="primary-button" href={`${import.meta.env.BASE_URL}downloads/qa-lab-bug-capture.zip`} download="qa-lab-bug-capture.zip">Download extension</a>
        <p className="extension-install-note">This beta uses manual installation. A one-click store install will be available after the extension is published.</p>
        <ol className="extension-install-steps">
          <li>Download and extract the ZIP into a folder you will keep on your computer.</li>
          <li>Open <code>chrome://extensions</code> in Chrome or <code>edge://extensions</code> in Edge, then enable <strong>Developer mode</strong>.</li>
          <li>Choose <strong>Load unpacked</strong> and select the extracted folder containing <code>manifest.json</code>.</li>
          <li>Pin <strong>QA Lab Bug Capture</strong>. Open the page you are testing and click the extension.</li>
          <li>Sign in using the addresses below, choose your workspace and project, review the capture, and submit.</li>
        </ol>
        <div className="extension-connection-details">
          {[['QA Lab website URL', appUrl], ['QA Lab API URL', apiUrl]].map(([label, value]) => <div key={label}>
            <span>{label}</span><code>{value}</code><button type="button" className="secondary-button" onClick={() => copy(value, label)}>Copy address</button>
          </div>)}
        </div>
        <p role="status">{copyError || (copied ? `${copied} copied.` : '')}</p>
        <p className="extension-install-note">Reporting requires Tester or QA Lead access. Captures happen only when you click the extension; this version does not collect console logs or network traffic.</p>
      </div>
    </section>
  )
}
