import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Receipt, Users, LogOut, TrendingUp, ChevronRight } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const NAV = [
  { to: '/',        label: 'Dashboard', icon: LayoutDashboard },
  { to: '/records', label: 'Records',   icon: Receipt },
  { to: '/users',   label: 'Users',     icon: Users, adminOnly: true },
]

export default function Sidebar() {
  const { user, logout } = useAuth()

  return (
    <aside style={{
      width: 240, minHeight: '100vh', background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
      padding: '0', flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '28px 24px 24px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 'var(--radius-sm)',
            background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <TrendingUp size={18} color="#000" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '-0.01em' }}>FinanceOS</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Control Center</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '16px 12px' }}>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0 12px', marginBottom: '8px' }}>
          Main Menu
        </div>
        {NAV.filter(n => !n.adminOnly || user?.role === 'admin').map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 12px', borderRadius: 'var(--radius-sm)', marginBottom: '2px',
            color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
            background: isActive ? 'var(--accent-dim)' : 'transparent',
            fontWeight: isActive ? 600 : 500, fontSize: '14px',
            transition: 'all 0.15s', textDecoration: 'none',
          })}>
            {({ isActive }) => (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Icon size={16} />
                  {label}
                </div>
                {isActive && <ChevronRight size={14} />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User card */}
      <div style={{ padding: '16px 12px', borderTop: '1px solid var(--border)' }}>
        <div style={{
          background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', padding: '12px',
          border: '1px solid var(--border)', marginBottom: '8px',
        }}>
          <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: user?.role === 'admin' ? 'var(--accent)' : user?.role === 'analyst' ? 'var(--green)' : 'var(--amber)',
            }} />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
              {user?.role}
            </span>
          </div>
        </div>
        <button onClick={logout} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'transparent',
          color: 'var(--text-muted)', fontSize: '13px', fontWeight: 500,
          cursor: 'pointer', border: 'none', transition: 'color 0.15s',
          fontFamily: 'var(--font-display)',
        }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
