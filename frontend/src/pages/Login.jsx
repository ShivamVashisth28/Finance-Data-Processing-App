import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const { login } = useAuth()
  const navigate  = useNavigate()

  const handleSubmit = async e => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fill = (e, p) => { setEmail(e); setPassword(p) }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-base)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', position: 'relative', overflow: 'hidden',
    }}>
      {/* Background grid */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.04,
        backgroundImage: `linear-gradient(var(--accent) 1px, transparent 1px), linear-gradient(90deg, var(--accent) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
      }} />
      {/* Glow */}
      <div style={{
        position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: 600, height: 300, borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(0,212,255,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        width: '100%', maxWidth: 420, position: 'relative', zIndex: 1,
        animation: 'fadeUp 0.6s ease forwards',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 'var(--radius)',
            background: 'var(--accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '16px', boxShadow: '0 0 40px var(--accent-glow)',
          }}>
            <TrendingUp size={26} color="#000" strokeWidth={2.5} />
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '6px' }}>FinanceOS</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Sign in to your control center</p>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '32px', boxShadow: 'var(--shadow-card)',
        }}>
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              background: 'var(--red-dim)', border: '1px solid var(--red)',
              borderRadius: 'var(--radius-sm)', padding: '12px 14px', marginBottom: '20px',
            }}>
              <AlertCircle size={16} color="var(--red)" />
              <span style={{ fontSize: '13px', color: 'var(--red)' }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="admin@finance.dev" required
                style={{
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)', padding: '12px 14px',
                  color: 'var(--text-primary)', fontSize: '14px', outline: 'none', width: '100%',
                  fontFamily: 'var(--font-display)', transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  style={{
                    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)', padding: '12px 44px 12px 14px',
                    color: 'var(--text-primary)', fontSize: '14px', outline: 'none', width: '100%',
                    fontFamily: 'var(--font-display)', transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
                <button type="button" onClick={() => setShowPw(v => !v)} style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4,
                }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              background: loading ? 'var(--border)' : 'var(--accent)', color: loading ? 'var(--text-muted)' : '#000',
              border: 'none', borderRadius: 'var(--radius-sm)', padding: '13px',
              fontSize: '14px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-display)', marginTop: '4px', transition: 'all 0.2s',
              letterSpacing: '0.02em',
            }}>
              {loading ? 'Signing in…' : <><span>Sign In</span><ArrowRight size={16} /></>}
            </button>
          </form>
        </div>

        {/* Demo accounts */}
        <div style={{ marginTop: '20px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px', fontWeight: 700 }}>
            Demo Accounts
          </div>
          {[
            { role: 'Admin',   email: 'admin@finance.dev',   pw: 'Admin@123',   color: 'var(--accent)' },
            { role: 'Analyst', email: 'analyst@finance.dev', pw: 'Analyst@123', color: 'var(--green)' },
            { role: 'Viewer',  email: 'viewer@finance.dev',  pw: 'Viewer@123',  color: 'var(--amber)' },
          ].map(a => (
            <button key={a.role} onClick={() => fill(a.email, a.pw)} style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: 'transparent',
              border: 'none', cursor: 'pointer', marginBottom: '4px', transition: 'background 0.15s',
              fontFamily: 'var(--font-display)',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: a.color, display: 'inline-block' }} />
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>{a.role}</span>
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{a.email}</span>
            </button>
          ))}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
