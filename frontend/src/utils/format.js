export const fmt = {
  currency: (n, compact = false) => {
    if (compact && Math.abs(n) >= 1_00_000) {
      return '₹' + (n / 1_00_000).toFixed(1) + 'L'
    }
    return new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', maximumFractionDigits: 0
    }).format(n)
  },
  number: n => new Intl.NumberFormat('en-IN').format(n),
  date: d => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
  month: m => {
    if (!m) return ''
    const [y, mo] = m.split('-')
    return new Date(y, mo - 1).toLocaleString('default', { month: 'short', year: '2-digit' })
  },
  pct: (a, b) => b === 0 ? '—' : ((a / b) * 100).toFixed(1) + '%',
}
