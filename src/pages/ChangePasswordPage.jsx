import { useState } from 'react'
import { useAuth } from '../context/useAuth'

export function ChangePasswordPage() {
  const { authUser, changePassword, signOut } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    if (newPassword !== confirmPassword) { setError('New passwords do not match'); return }
    setBusy(true)
    setError('')
    try { await changePassword(currentPassword, newPassword) }
    catch (err) { setError(err.message); setBusy(false) }
  }

  return <main className="auth-backdrop">
    <div className="auth-card">
      <div className="auth-brand"><span>QA Lab</span></div>
      <h1 className="auth-title">Set your own password</h1>
      <p>The admin-created password is temporary. Change it before using your account.</p>
      <p>{authUser?.email}</p>
      <form className="auth-form" onSubmit={submit}>
        <label>Temporary password<input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></label>
        <label>New password<input type="password" autoComplete="new-password" minLength={12} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /></label>
        <label>Confirm new password<input type="password" autoComplete="new-password" minLength={12} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></label>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button className="primary-button" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save password'}</button>
      </form>
      <button className="welcome-signout" type="button" onClick={signOut}>Sign out</button>
    </div>
  </main>
}
