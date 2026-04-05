import { clsx } from 'clsx'

export function Card({ children, className, style, glow }) {
  return (
    <div
      className={clsx('card', className)}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        boxShadow: glow ? 'var(--shadow-card), var(--shadow-glow)' : 'var(--shadow-card)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function Badge({ children, color = 'accent' }) {
  const colors = {
    accent: { bg: 'var(--accent-dim)',  text: 'var(--accent)' },
    green:  { bg: 'var(--green-dim)',   text: 'var(--green)' },
    red:    { bg: 'var(--red-dim)',     text: 'var(--red)' },
    amber:  { bg: 'var(--amber-dim)',   text: 'var(--amber)' },
    muted:  { bg: 'var(--bg-elevated)', text: 'var(--text-secondary)' },
  }
  const c = colors[color] || colors.accent
  return (
    <span style={{
      background: c.bg, color: c.text,
      padding: '3px 10px', borderRadius: '100px',
      fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em',
      textTransform: 'uppercase', fontFamily: 'var(--font-mono)',
    }}>
      {children}
    </span>
  )
}

export function Button({ children, onClick, variant = 'primary', size = 'md', disabled, style, type = 'button' }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: '8px',
    fontFamily: 'var(--font-display)', fontWeight: 600,
    borderRadius: 'var(--radius)', cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s', border: '1px solid transparent',
    opacity: disabled ? 0.5 : 1,
    ...(size === 'sm' ? { padding: '6px 14px', fontSize: '13px' } :
        size === 'lg' ? { padding: '14px 28px', fontSize: '15px' } :
                        { padding: '10px 20px', fontSize: '14px' }),
  }
  const variants = {
    primary: { background: 'var(--accent)', color: '#000', borderColor: 'var(--accent)' },
    ghost:   { background: 'transparent', color: 'var(--text-secondary)', borderColor: 'var(--border)' },
    danger:  { background: 'var(--red-dim)', color: 'var(--red)', borderColor: 'var(--red)' },
    success: { background: 'var(--green-dim)', color: 'var(--green)', borderColor: 'var(--green)' },
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </button>
  )
}

export function Input({ label, error, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {label && <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</label>}
      <input
        {...props}
        style={{
          background: 'var(--bg-elevated)', border: `1px solid ${error ? 'var(--red)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-sm)', padding: '10px 14px',
          color: 'var(--text-primary)', fontSize: '14px', outline: 'none', width: '100%',
          transition: 'border-color 0.2s', fontFamily: 'var(--font-display)',
          ...props.style,
        }}
        onFocus={e => e.target.style.borderColor = 'var(--accent)'}
        onBlur={e => e.target.style.borderColor = error ? 'var(--red)' : 'var(--border)'}
      />
      {error && <span style={{ fontSize: '12px', color: 'var(--red)' }}>{error}</span>}
    </div>
  )
}

export function Select({ label, children, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {label && <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</label>}
      <select
        {...props}
        style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)', padding: '10px 14px',
          color: 'var(--text-primary)', fontSize: '14px', outline: 'none', width: '100%',
          fontFamily: 'var(--font-display)', cursor: 'pointer', ...props.style,
        }}
      >
        {children}
      </select>
    </div>
  )
}

export function Spinner({ size = 24, color = 'var(--accent)' }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `2px solid var(--border)`,
      borderTopColor: color,
      animation: 'spin 0.7s linear infinite',
      display: 'inline-block',
    }} />
  )
}

export function Divider() {
  return <div style={{ height: '1px', background: 'var(--border)', margin: '8px 0' }} />
}

export function StatCard({ label, value, sub, color = 'accent', icon: Icon, delay = 0 }) {
  const colors = {
    accent: 'var(--accent)', green: 'var(--green)',
    red: 'var(--red)', amber: 'var(--amber)',
  }
  const c = colors[color] || colors.accent
  return (
    <Card style={{ animationDelay: `${delay}ms` }} className="animate-fade-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>
            {label}
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: c, fontFamily: 'var(--font-mono)', lineHeight: 1, letterSpacing: '-0.02em' }}>
            {value}
          </div>
          {sub && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>{sub}</div>}
        </div>
        {Icon && (
          <div style={{
            width: 44, height: 44, borderRadius: 'var(--radius)',
            background: `color-mix(in srgb, ${c} 12%, transparent)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={20} color={c} />
          </div>
        )}
      </div>
    </Card>
  )
}
