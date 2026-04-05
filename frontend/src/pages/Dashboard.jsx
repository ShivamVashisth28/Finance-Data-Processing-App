import { useState, useEffect } from 'react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import api from '../utils/api'
import { fmt } from '../utils/format'
import { Card, StatCard, Badge } from '../components/UI'

const COLORS = ['#00d4ff','#00e676','#ffb300','#ff4d6a','#b47cff','#ff6b35','#4ecdc4','#45b7d1']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)', padding: '12px 16px', fontSize: '13px',
    }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
          <span style={{ textTransform: 'capitalize' }}>{p.dataKey}</span>
          <span style={{ fontFamily: 'var(--font-mono)' }}>{fmt.currency(p.value, true)}</span>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [year,    setYear]    = useState(new Date().getFullYear())

  useEffect(() => {
    setLoading(true)
    api.get(`/dashboard/overview?year=${year}`)
      .then(r => setData(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [year])

  if (loading) return <LoadingSkeleton />

  const { summary, categories, monthly_trends, recent_activity } = data

  // Pie chart data — top 6 expense categories
  const pieData = (categories.expense || []).slice(0, 6).map((c, i) => ({
    name: c.category, value: parseFloat(c.total), color: COLORS[i],
  }))

  return (
    <div style={{ padding: '32px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '4px' }}>
            Financial Overview
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Real-time metrics and trend analysis
          </p>
        </div>
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', padding: '8px 14px',
            color: 'var(--text-primary)', fontSize: '14px', outline: 'none',
            fontFamily: 'var(--font-display)', cursor: 'pointer',
          }}
        >
          {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <StatCard
          label="Total Income"
          value={fmt.currency(summary.total_income, true)}
          sub={`${summary.income_count} transactions`}
          color="green" icon={TrendingUp} delay={0}
        />
        <StatCard
          label="Total Expenses"
          value={fmt.currency(summary.total_expense, true)}
          sub={`${summary.expense_count} transactions`}
          color="red" icon={TrendingDown} delay={80}
        />
        <StatCard
          label="Net Balance"
          value={fmt.currency(Math.abs(summary.net_balance), true)}
          sub={summary.net_balance >= 0 ? '▲ Positive cash flow' : '▼ Negative cash flow'}
          color={summary.net_balance >= 0 ? 'accent' : 'red'} icon={DollarSign} delay={160}
        />
        <StatCard
          label="Transactions"
          value={fmt.number(summary.total_transactions)}
          sub="Total records"
          color="amber" icon={Activity} delay={240}
        />
      </div>

      {/* Charts row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* Monthly trends area chart */}
        <Card className="animate-fade-up" style={{ animationDelay: '100ms' }}>
          <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '2px' }}>Monthly Trends</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Income vs expenses over time</div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              {[{l:'Income', c:'var(--green)'},{l:'Expense',c:'var(--red)'}].map(i=>(
                <div key={i.l} style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                  <div style={{width:10,height:10,borderRadius:2,background:i.c}}/>
                  <span style={{fontSize:'11px',color:'var(--text-muted)'}}>{i.l}</span>
                </div>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={monthly_trends} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#00e676" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#00e676" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ff4d6a" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#ff4d6a" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
              <XAxis dataKey="month" tickFormatter={fmt.month} tick={{ fill:'var(--text-muted)', fontSize:11 }} axisLine={false} tickLine={false}/>
              <YAxis tickFormatter={v => fmt.currency(v,true)} tick={{ fill:'var(--text-muted)', fontSize:11 }} axisLine={false} tickLine={false}/>
              <Tooltip content={<CustomTooltip />}/>
              <Area type="monotone" dataKey="income"  stroke="#00e676" fill="url(#gIncome)"  strokeWidth={2} dot={false}/>
              <Area type="monotone" dataKey="expense" stroke="#ff4d6a" fill="url(#gExpense)" strokeWidth={2} dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Expense by category pie */}
        <Card className="animate-fade-up" style={{ animationDelay: '200ms' }}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '2px' }}>Expense Breakdown</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>By category</div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                dataKey="value" paddingAngle={3}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip formatter={v => fmt.currency(v, true)} contentStyle={{ background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:6,fontSize:12 }}/>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
            {pieData.slice(0, 4).map((d, i) => (
              <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color }} />
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{d.name}</span>
                </div>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  {fmt.currency(d.value, true)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* Net balance bar */}
        <Card className="animate-fade-up" style={{ animationDelay: '150ms' }}>
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '2px' }}>Net Cash Flow</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Monthly surplus / deficit</div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthly_trends} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
              <XAxis dataKey="month" tickFormatter={fmt.month} tick={{ fill:'var(--text-muted)', fontSize:11 }} axisLine={false} tickLine={false}/>
              <YAxis tickFormatter={v => fmt.currency(v,true)} tick={{ fill:'var(--text-muted)', fontSize:11 }} axisLine={false} tickLine={false}/>
              <Tooltip content={<CustomTooltip />}/>
              <Bar dataKey="net" radius={[4,4,0,0]}>
                {monthly_trends.map((m, i) => (
                  <Cell key={i} fill={m.net >= 0 ? '#00e676' : '#ff4d6a'} opacity={0.85}/>
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Top income categories */}
        <Card className="animate-fade-up" style={{ animationDelay: '250ms' }}>
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '2px' }}>Top Income Sources</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>By category total</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(categories.income || []).slice(0, 5).map((c, i) => {
              const max = categories.income[0]?.total || 1
              const pct = (c.total / max) * 100
              return (
                <div key={c.category}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{c.category}</span>
                    <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--green)' }}>
                      {fmt.currency(c.total, true)}
                    </span>
                  </div>
                  <div style={{ height: 4, background: 'var(--bg-elevated)', borderRadius: 2 }}>
                    <div style={{
                      height: '100%', width: `${pct}%`, borderRadius: 2,
                      background: `linear-gradient(90deg, ${COLORS[i]}, ${COLORS[i]}aa)`,
                      transition: 'width 0.8s ease',
                    }}/>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* Recent activity */}
      <Card className="animate-fade-up" style={{ animationDelay: '300ms' }}>
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '2px' }}>Recent Activity</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Latest transactions</div>
          </div>
        </div>
        <div>
          {(recent_activity || []).map((r, i) => (
            <div key={r.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 0', borderBottom: i < recent_activity.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                  background: r.type === 'income' ? 'var(--green-dim)' : 'var(--red-dim)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {r.type === 'income'
                    ? <ArrowUpRight size={16} color="var(--green)" />
                    : <ArrowDownRight size={16} color="var(--red)" />}
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '2px' }}>{r.category}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{fmt.date(r.date)}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: '14px', fontWeight: 700, fontFamily: 'var(--font-mono)',
                  color: r.type === 'income' ? 'var(--green)' : 'var(--red)',
                }}>
                  {r.type === 'income' ? '+' : '-'}{fmt.currency(r.amount, true)}
                </div>
                <Badge color={r.type === 'income' ? 'green' : 'red'}>{r.type}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div style={{ padding: '32px' }}>
      <div style={{ height: 36, width: 240, marginBottom: '8px' }} className="skeleton"/>
      <div style={{ height: 20, width: 180, marginBottom: '32px' }} className="skeleton"/>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        {[...Array(4)].map((_, i) => <div key={i} style={{ height: 110 }} className="skeleton"/>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <div style={{ height: 340 }} className="skeleton"/>
        <div style={{ height: 340 }} className="skeleton"/>
      </div>
    </div>
  )
}
