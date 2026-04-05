import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Filter, Trash2, Pencil, X, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '../utils/api'
import { fmt } from '../utils/format'
import { useAuth } from '../hooks/useAuth'
import { Card, Badge, Button, Input, Select } from '../components/UI'

const CATEGORIES = ['Salary','Investments','Freelance','Dividends','Bonus','Rent','Utilities','Food & Dining','Transport','Healthcare','Software Subscriptions','Office Supplies','Marketing','Insurance','Travel','Other']
const EMPTY = { amount: '', type: 'income', category: '', date: '', notes: '' }

export default function Records() {
  const { user } = useAuth()
  const isAdmin  = user?.role === 'admin'

  const [records, setRecords]   = useState([])
  const [meta,    setMeta]      = useState({ total: 0, page: 1, totalPages: 1 })
  const [filters, setFilters]   = useState({ type: '', category: '', startDate: '', endDate: '', page: 1, limit: 15 })
  const [loading, setLoading]   = useState(true)
  const [modal,   setModal]     = useState(null)  // null | 'create' | { record }
  const [form,    setForm]      = useState(EMPTY)
  const [saving,  setSaving]    = useState(false)
  const [error,   setError]     = useState('')
  const [search,  setSearch]    = useState('')

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([,v]) => v !== ''))
      const { data } = await api.get('/records', { params })
      setRecords(data.records)
      setMeta({ total: data.total, page: data.page, totalPages: data.totalPages })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  const openCreate = () => { setForm(EMPTY); setError(''); setModal('create') }
  const openEdit   = r => { setForm({ amount: r.amount, type: r.type, category: r.category, date: r.date?.split('T')[0], notes: r.notes || '' }); setError(''); setModal(r) }
  const closeModal = () => { setModal(null); setForm(EMPTY); setError('') }

  const handleSave = async () => {
    if (!form.amount || !form.category || !form.date) { setError('Amount, category and date are required.'); return }
    setSaving(true); setError('')
    try {
      if (modal === 'create') {
        await api.post('/records', { ...form, amount: parseFloat(form.amount) })
      } else {
        await api.patch(`/records/${modal.id}`, { ...form, amount: parseFloat(form.amount) })
      }
      await fetchRecords()
      closeModal()
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to save record.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async id => {
    if (!confirm('Permanently delete this record?')) return
    try {
      await api.delete(`/records/${id}`)
      await fetchRecords()
    } catch (e) {
      alert(e.response?.data?.message || 'Delete failed.')
    }
  }

  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: v, page: 1 }))
  const setPage   = p => setFilters(f => ({ ...f, page: p }))

  const displayed = search
    ? records.filter(r => r.category.toLowerCase().includes(search.toLowerCase()) || r.notes?.toLowerCase().includes(search.toLowerCase()))
    : records

  return (
    <div style={{ padding: '32px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '4px' }}>Financial Records</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{meta.total} total transactions</p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate} icon={Plus}>
            <Plus size={16} /> New Record
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: '20px', padding: '16px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto auto auto', gap: '12px', alignItems: 'end' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}/>
            <input
              placeholder="Search records…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                padding: '9px 14px 9px 34px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none',
                width: '100%', fontFamily: 'var(--font-display)',
              }}
            />
          </div>
          <select value={filters.type} onChange={e => setFilter('type', e.target.value)} style={selectStyle}>
            <option value="">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <select value={filters.category} onChange={e => setFilter('category', e.target.value)} style={selectStyle}>
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="date" value={filters.startDate} onChange={e => setFilter('startDate', e.target.value)} style={selectStyle} placeholder="From"/>
          <input type="date" value={filters.endDate} onChange={e => setFilter('endDate', e.target.value)} style={selectStyle} placeholder="To"/>
          <Button variant="ghost" size="sm" onClick={() => { setFilters({ type:'',category:'',startDate:'',endDate:'',page:1,limit:15 }); setSearch('') }}>
            <X size={14}/> Clear
          </Button>
        </div>
      </Card>

      {/* Table */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Date','Type','Category','Amount','Notes','Created By', isAdmin ? 'Actions' : ''].filter(Boolean).map(h => (
                  <th key={h} style={{
                    padding: '14px 16px', textAlign: h === 'Amount' ? 'right' : 'left',
                    fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)',
                    letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i}><td colSpan={7} style={{ padding: '12px 16px' }}>
                    <div style={{ height: 20, borderRadius: 4 }} className="skeleton"/>
                  </td></tr>
                ))
              ) : displayed.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', fontSize: '14px' }}>
                  No records found
                </td></tr>
              ) : displayed.map((r, i) => (
                <tr key={r.id} style={{
                  borderBottom: i < displayed.length-1 ? '1px solid var(--border)' : 'none',
                  transition: 'background 0.1s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={td}><span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>{fmt.date(r.date)}</span></td>
                  <td style={td}><Badge color={r.type === 'income' ? 'green' : 'red'}>{r.type}</Badge></td>
                  <td style={td}><span style={{ fontSize: '13px', fontWeight: 600 }}>{r.category}</span></td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '14px', color: r.type === 'income' ? 'var(--green)' : 'var(--red)' }}>
                      {r.type === 'income' ? '+' : '-'}{fmt.currency(r.amount, true)}
                    </span>
                  </td>
                  <td style={td}><span style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{r.notes || '—'}</span></td>
                  <td style={td}><span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{r.created_by_name}</span></td>
                  {isAdmin && (
                    <td style={td}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => openEdit(r)} style={iconBtn}><Pencil size={13}/></button>
                        <button onClick={() => handleDelete(r.id)} style={{ ...iconBtn, color: 'var(--red)' }}><Trash2 size={13}/></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Page {meta.page} of {meta.totalPages} · {meta.total} records
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => setPage(meta.page - 1)} disabled={meta.page <= 1} style={paginBtn}><ChevronLeft size={16}/></button>
              {[...Array(Math.min(meta.totalPages, 7))].map((_, i) => {
                const p = i + 1
                return (
                  <button key={p} onClick={() => setPage(p)} style={{
                    ...paginBtn, minWidth: 32,
                    background: p === meta.page ? 'var(--accent)' : 'transparent',
                    color: p === meta.page ? '#000' : 'var(--text-secondary)',
                  }}>{p}</button>
                )
              })}
              <button onClick={() => setPage(meta.page + 1)} disabled={meta.page >= meta.totalPages} style={paginBtn}><ChevronRight size={16}/></button>
            </div>
          </div>
        )}
      </Card>

      {/* Modal */}
      {modal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24,
        }} onClick={e => e.target === e.currentTarget && closeModal()}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '28px', width: '100%', maxWidth: 480,
            animation: 'fadeUp 0.25s ease forwards',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800 }}>{modal === 'create' ? 'New Record' : 'Edit Record'}</h2>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20}/></button>
            </div>

            {error && <div style={{ background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--red)' }}>{error}</div>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={labelStyle}>Type</label>
                  <select value={form.type} onChange={e => setForm(f=>({...f,type:e.target.value}))} style={inputStyle}>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={labelStyle}>Amount (₹)</label>
                  <input type="number" min="0" step="0.01" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} style={inputStyle} placeholder="0.00"/>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={labelStyle}>Category</label>
                <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} style={inputStyle}>
                  <option value="">Select category…</option>
                  {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={labelStyle}>Date</label>
                <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} style={inputStyle}/>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={labelStyle}>Notes (optional)</label>
                <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={2} style={{ ...inputStyle, resize:'vertical' }} placeholder="Add a note…"/>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <Button variant="ghost" onClick={closeModal} style={{ flex: 1 }}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving} style={{ flex: 1 }}>
                  <Check size={15}/> {saving ? 'Saving…' : 'Save Record'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const td          = { padding: '13px 16px', verticalAlign: 'middle' }
const iconBtn     = { background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:6, padding:'5px 8px', cursor:'pointer', color:'var(--text-secondary)', display:'inline-flex', alignItems:'center', transition:'all 0.15s' }
const paginBtn    = { background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:6, padding:'6px 10px', cursor:'pointer', color:'var(--text-secondary)', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:13, fontFamily:'var(--font-display)' }
const selectStyle = { background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:'9px 12px', color:'var(--text-primary)', fontSize:'13px', outline:'none', fontFamily:'var(--font-display)', cursor:'pointer' }
const labelStyle  = { fontSize:'11px', fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.08em', textTransform:'uppercase' }
const inputStyle  = { background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:'10px 12px', color:'var(--text-primary)', fontSize:'14px', outline:'none', width:'100%', fontFamily:'var(--font-display)' }
