import { useState, useEffect } from 'react'
import { UserCheck, UserX, Pencil, X, Check, Shield, BarChart2, Eye } from 'lucide-react'
import api from '../utils/api'
import { fmt } from '../utils/format'
import { Card, Badge, Button } from '../components/UI'

const ROLE_META = {
  admin:   { color: 'accent', icon: Shield,   label: 'Admin'   },
  analyst: { color: 'green',  icon: BarChart2, label: 'Analyst' },
  viewer:  { color: 'amber',  icon: Eye,       label: 'Viewer'  },
}

export default function Users() {
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [form,    setForm]    = useState({})
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/users')
      setUsers(data.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchUsers() }, [])

  const openEdit = u => {
    setEditing(u)
    setForm({ name: u.name, email: u.email, role: u.role, status: u.status })
    setError('')
  }

  const handleSave = async () => {
    setSaving(true); setError('')
    try {
      await api.patch(`/users/${editing.id}`, form)
      await fetchUsers()
      setEditing(null)
    } catch (e) {
      setError(e.response?.data?.message || 'Update failed.')
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async u => {
    const newStatus = u.status === 'active' ? 'inactive' : 'active'
    if (!confirm(`${newStatus === 'inactive' ? 'Deactivate' : 'Activate'} ${u.name}?`)) return
    try {
      await api.patch(`/users/${u.id}`, { status: newStatus })
      await fetchUsers()
    } catch (e) { alert(e.response?.data?.message || 'Failed.') }
  }

  return (
    <div style={{ padding: '32px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '4px' }}>User Management</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{users.length} total users</p>
      </div>

      {/* Role summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {Object.entries(ROLE_META).map(([role, meta]) => {
          const Icon = meta.icon
          const count = users.filter(u => u.role === role).length
          return (
            <Card key={role} className="animate-fade-up">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 'var(--radius)', background: `var(--${meta.color === 'accent' ? 'accent' : meta.color}-dim, var(--accent-dim))`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={20} color={`var(--${meta.color})`} />
                </div>
                <div>
                  <div style={{ fontSize: '28px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: `var(--${meta.color})` }}>{count}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{meta.label}s</div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Users table */}
      <Card style={{ padding: 0, overflow: 'hidden' }} className="animate-fade-up">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['User', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                <th key={h} style={{ padding: '14px 20px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? [...Array(4)].map((_, i) => (
                  <tr key={i}><td colSpan={5} style={{ padding: '14px 20px' }}>
                    <div style={{ height: 20, borderRadius: 4 }} className="skeleton"/>
                  </td></tr>
                ))
              : users.map((u, i) => (
                <tr key={u.id} style={{ borderBottom: i < users.length-1 ? '1px solid var(--border)' : 'none', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: '50%', fontWeight: 800, fontSize: 14,
                        background: `var(--${ROLE_META[u.role]?.color ?? 'accent'}-dim, var(--accent-dim))`,
                        color: `var(--${ROLE_META[u.role]?.color ?? 'accent'})`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{u.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <Badge color={ROLE_META[u.role]?.color ?? 'accent'}>{u.role}</Badge>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: u.status === 'active' ? 'var(--green)' : 'var(--text-muted)' }}/>
                      <span style={{ fontSize: 13, color: u.status === 'active' ? 'var(--text-primary)' : 'var(--text-muted)', textTransform: 'capitalize' }}>{u.status}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{fmt.date(u.created_at)}</span>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(u)} style={iconBtn} title="Edit">
                        <Pencil size={13}/>
                      </button>
                      <button onClick={() => toggleStatus(u)} style={{ ...iconBtn, color: u.status === 'active' ? 'var(--red)' : 'var(--green)' }} title={u.status === 'active' ? 'Deactivate' : 'Activate'}>
                        {u.status === 'active' ? <UserX size={13}/> : <UserCheck size={13}/>}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </Card>

      {/* Edit modal */}
      {editing && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:24 }}
          onClick={e => e.target === e.currentTarget && setEditing(null)}>
          <div style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:28,width:'100%',maxWidth:440,animation:'fadeUp 0.25s ease forwards' }}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24 }}>
              <h2 style={{ fontSize:18,fontWeight:800 }}>Edit User</h2>
              <button onClick={() => setEditing(null)} style={{ background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer' }}><X size={20}/></button>
            </div>
            {error && <div style={{ background:'var(--red-dim)',border:'1px solid var(--red)',borderRadius:6,padding:'10px 14px',marginBottom:16,fontSize:13,color:'var(--red)' }}>{error}</div>}

            <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
              {[['Name','name','text'],['Email','email','email']].map(([label,key,type])=>(
                <div key={key} style={{ display:'flex',flexDirection:'column',gap:5 }}>
                  <label style={lblStyle}>{label}</label>
                  <input type={type} value={form[key]||''} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} style={inpStyle}/>
                </div>
              ))}
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
                {[['Role','role',['admin','analyst','viewer']],['Status','status',['active','inactive']]].map(([label,key,opts])=>(
                  <div key={key} style={{ display:'flex',flexDirection:'column',gap:5 }}>
                    <label style={lblStyle}>{label}</label>
                    <select value={form[key]||''} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} style={inpStyle}>
                      {opts.map(o=><option key={o} value={o}>{o.charAt(0).toUpperCase()+o.slice(1)}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex',gap:10,marginTop:4 }}>
                <Button variant="ghost" onClick={()=>setEditing(null)} style={{flex:1}}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving} style={{flex:1}}>
                  <Check size={15}/> {saving ? 'Saving…' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const iconBtn = { background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:6,padding:'6px 9px',cursor:'pointer',color:'var(--text-secondary)',display:'inline-flex',alignItems:'center',transition:'all 0.15s' }
const lblStyle = { fontSize:'11px',fontWeight:700,color:'var(--text-muted)',letterSpacing:'0.08em',textTransform:'uppercase' }
const inpStyle = { background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',padding:'10px 12px',color:'var(--text-primary)',fontSize:'14px',outline:'none',width:'100%',fontFamily:'var(--font-display)' }
