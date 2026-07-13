import { useState } from 'react'
import { useAuth } from '../context/useAuth'
import { EyeIcon, EyeOffIcon } from '../components/Icons'

export function AuthPage() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const clearError = () => setError('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    clearError()
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register(email, password, displayName)
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="auth-backdrop">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark" aria-hidden>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 11 2 2 4-4" />
            </svg>
          </span>
          <span>QA Lab</span>
        </div>

        <h1 className="auth-title">
          {mode === 'login' ? 'Sign in to continue' : 'Create your account'}
        </h1>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <label>
              Name
              <input
                type="text"
                autoComplete="name"
                placeholder="Your full name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </label>
          )}
          <label>
            Email
            <input
              type="email"
              autoComplete={mode === 'login' ? 'username' : 'email'}
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus={mode === 'login'}
            />
          </label>
          <label>
            Password
            <div className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder={mode === 'login' ? 'Your password' : 'At least 8 characters'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOffIcon width={16} height={16} /> : <EyeIcon width={16} height={16} />}
              </button>
            </div>
          </label>

          {error && <p className="auth-error" role="alert">{error}</p>}

          <button type="submit" className="primary-button auth-submit" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          {mode === 'login' ? (
            <>No account? <button type="button" className="link-btn" onClick={() => { setMode('register'); clearError() }}>Create one</button></>
          ) : (
            <>Already have an account? <button type="button" className="link-btn" onClick={() => { setMode('login'); clearError() }}>Sign in</button></>
          )}
        </p>
      </div>
    </div>
  )
}
