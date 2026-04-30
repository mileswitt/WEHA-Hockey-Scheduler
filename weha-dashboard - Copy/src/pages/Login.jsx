import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/Authentication'
import PublicNavbar from '../components/PublicNavbar'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!email || !password) {
      setError('Please enter your email and password.')
      return
    }
    setLoading(true)
    setError(null)
    const result = await login(email, password)
    if (result.success) {
      navigate('/admin')
    } else {
      setLoading(false)
      setError(result.error)
    }
  }

  return (
    <div style={{ backgroundColor: '#0f2b46', minHeight: '100vh' }} className="text-white">
      <PublicNavbar />

      {/* Loading overlay */}
      {loading && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          backgroundColor: 'rgba(11, 31, 58, 0.85)',
          backdropFilter: 'blur(4px)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '20px',
        }}>
          <div style={{
            width: '48px', height: '48px',
            border: '4px solid rgba(255,255,255,0.15)',
            borderTop: '4px solid #c21537',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ color: '#e2e8f0', fontSize: '16px', fontWeight: '600', letterSpacing: '0.05em' }}>
            Logging in...
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      <div
        className="w-full flex items-center justify-center"
        style={{ minHeight: 'calc(100vh - 56px)', padding: '40px 16px' }}
      >
        <div
          style={{
            backgroundColor: '#0B1F3A',
            borderRadius: '16px',
            padding: '48px 40px',
            width: '100%',
            maxWidth: '420px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <div
              style={{
                display: 'inline-block',
                backgroundColor: '#c21537',
                borderRadius: '6px',
                padding: '5px 18px',
                marginBottom: '18px',
                fontSize: '11px',
                fontWeight: '700',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
              }}
            >
              Admin Portal
            </div>
            <h1
              style={{
                fontSize: '28px',
                fontWeight: '800',
                letterSpacing: '0.06em',
                color: '#ffffff',
                marginBottom: '6px',
                textTransform: 'uppercase',
              }}
            >
              West Elk
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>
              Hockey Association
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                backgroundColor: 'rgba(194, 21, 55, 0.15)',
                border: '1px solid rgba(194, 21, 55, 0.45)',
                borderRadius: '8px',
                padding: '11px 16px',
                marginBottom: '20px',
                color: '#fca5a5',
                fontSize: '14px',
                textAlign: 'center',
              }}
            >
              {error}
            </div>
          )}

          {/* Form */}
          <div>
            <div style={{ marginBottom: '18px' }}>
              <label
                htmlFor="email"
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#94a3b8',
                  marginBottom: '8px',
                  letterSpacing: '0.09em',
                  textTransform: 'uppercase',
                }}
              >
                Email
              </label>
              <input
                id="email"
                type="text"
                placeholder="admin@weha.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(null) }}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                onFocus={e => (e.target.style.borderColor = '#c21537')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '15px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s',
                }}
              />
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label
                htmlFor="password"
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#94a3b8',
                  marginBottom: '8px',
                  letterSpacing: '0.09em',
                  textTransform: 'uppercase',
                }}
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(null) }}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  onFocus={e => (e.target.style.borderColor = '#c21537')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                  style={{
                    width: '100%',
                    padding: '12px 44px 12px 14px',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '15px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  tabIndex={-1}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    /* Eye-off icon */
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    /* Eye icon */
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = '#a01230' }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.backgroundColor = '#c21537' }}
              onMouseDown={e => { if (!loading) e.currentTarget.style.transform = 'scale(0.98)' }}
              onMouseUp={e => { if (!loading) e.currentTarget.style.transform = 'scale(1)' }}
              style={{
                width: '100%',
                padding: '13px',
                backgroundColor: '#c21537',
                color: '#ffffff',
                fontSize: '15px',
                fontWeight: '700',
                letterSpacing: '0.1em',
                borderRadius: '8px',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'background-color 0.15s, transform 0.1s',
                textTransform: 'uppercase',
              }}
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
