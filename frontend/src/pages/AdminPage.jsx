import React, { useState, useEffect } from 'react'
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore, useThemeStore } from '../store'




import {
  statsApi, saleApi, incomeApi, clientApi,
  userApi, productApi, categoryApi, brandApi,
  unitApi, kontragentApi, transferApi, paymentApi,
  clientDebtApi, oilRecordApi, batchApi,
  safeApi, kontragentReturnApi, advancedStatsApi
} from '../api'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'



const fmt = n => Math.round(n || 0).toLocaleString('uz-UZ')

const C = {
  input: { width: '100%', padding: '8px 10px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 13 },
  btnGreen: { padding: '8px 14px', borderRadius: 'var(--radius)', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', whiteSpace: 'nowrap' },
  btnGray: { padding: '8px 12px', borderRadius: 'var(--radius)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 13, border: '1px solid var(--border)', cursor: 'pointer' },
  btnRed: { padding: '6px 10px', borderRadius: 'var(--radius)', background: 'var(--danger-light)', color: 'var(--danger)', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer' },
  th: { padding: '8px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text2)', background: 'var(--surface2)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' },
  td: { padding: '9px 12px', fontSize: 13, borderBottom: '1px solid var(--border)', verticalAlign: 'middle' },
}

// ── Layout ─────────────────────────────────────────────
function Layout({ children }) {
  const { t, i18n } = useTranslation()
  const { user, logout } = useAuthStore()
  const { dark, toggle } = useThemeStore()


  const navItems = [
    { to: '/admin', label: t('stats.title'), icon: '📊', end: true },
    { to: '/admin/sales', label: t('nav.checks'), icon: '🧾' },
    { to: '/admin/incomes', label: t('warehouse.income'), icon: '📦' },
    { to: '/admin/clients', label: t('nav.clients'), icon: '👥' },


    { to: '/admin/products', label: 'Mahsulotlar', icon: '🛢️' },

    { to: '/admin/kassa-stock', label: 'Kassa uchun stock', icon: '🏪' },
    { to: '/admin/safe', label: 'Admin Sefi', icon: '🗄️' },
    { to: '/admin/categories', label: 'Kategoriyalar', icon: '🏷️' },


    { to: '/admin/brands', label: 'Brandlar', icon: '🏭' },
    { to: '/admin/units', label: "O'lchov birliklari", icon: '📏' },
    { to: '/admin/kontragents', label: 'Kontragentlar', icon: '🏢' },

    { to: '/admin/transfers', label: 'Transferlar', icon: '➡️' },

    { to: '/admin/debts', label: 'Qarzlar', icon: '💳' },
    { to: '/admin/users', label: t('nav.users'), icon: '👨‍💼' },
    { to: '/kassa', label: t('nav.kassa'), icon: '🖥️' },
  ]



  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)' }}>
      {/* Sidebar */}
      <div style={{ width: 220, background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--accent)' }}>🛢️ MUROD OIL</div>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>Admin Panel</div>
          <div style={{ marginTop: 8, padding: '5px 8px', borderRadius: 6, background: 'var(--surface2)', fontSize: 12 }}>
            👤 <b>{user?.username}</b>
            <span style={{ marginLeft: 4, fontSize: 11, color: 'var(--text2)', textTransform: 'capitalize' }}>({user?.role})</span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '8px 8px', flex: 1, overflowY: 'auto' }}>
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '8px 10px', borderRadius: 'var(--radius)',
                marginBottom: 2, textDecoration: 'none', fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                background: isActive ? 'var(--accent-light)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--text)',
                transition: 'all .15s'
              })}
            >
              <span style={{ fontSize: 15 }}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Pastki tugmalar */}
        <div style={{ padding: '10px 8px', borderTop: '1px solid var(--border)', display: 'flex', gap: 5 }}>
          <button onClick={toggle} style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface2)', fontSize: 14, cursor: 'pointer' }}>
            {dark ? '☀️' : '🌙'}
          </button>



          <button onClick={logout} style={{ flex: 1, padding: '7px', borderRadius: 6, background: 'var(--danger-light)', color: 'var(--danger)', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
            ↩ {t('nav.logout')}
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  )
}

// ── Reusable komponetlar ────────────────────────────────
function Table({ headers, rows, emptyText = 'Ma\'lumot yo\'q' }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>{headers.map((h, i) => <th key={i} style={C.th}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0
            ? <tr><td colSpan={headers.length} style={{ ...C.td, textAlign: 'center', color: 'var(--text2)', padding: 32 }}>{emptyText}</td></tr>
            : rows.map((row, i) => (
              <tr key={i} style={{ transition: 'background .1s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {row.map((cell, j) => <td key={j} style={C.td}>{cell}</td>)}
              </tr>
            ))
          }
        </tbody>
      </table>
    </div>
  )
}

function Modal({ title, onClose, children, width = 460 }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 24, width, maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text2)' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Tag({ type }) {
  const map = {
    naqd: { bg: 'var(--accent-light)', c: 'var(--accent)', label: 'Naqd' },
    karta: { bg: 'var(--blue-light)', c: 'var(--blue)', label: 'Karta' },
    aralash: { bg: 'var(--warning-light)', c: 'var(--warning)', label: 'Aralash' },
    qarz: { bg: 'var(--danger-light)', c: 'var(--danger)', label: 'Qarz' },
  }
  const m = map[type] || { bg: 'var(--surface2)', c: 'var(--text2)', label: type }
  return <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: m.bg, color: m.c }}>{m.label}</span>
}

function Toast({ msg }) {
  return (
    <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', padding: '9px 20px', borderRadius: 'var(--radius)', background: msg.type === 'error' ? 'var(--danger)' : 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600, zIndex: 1000, boxShadow: 'var(--shadow-md)' }}>
      {msg.text}
    </div>
  )
}

function InpField({ label, value, onChange, type = 'text', required }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>{label}{required && ' *'}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} style={C.input} />
    </div>
  )
}

function SelectField({ label, value, onChange, options, required }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>{label}{required && ' *'}</label>
      <select value={value} onChange={e => onChange(e.target.value)} style={C.input}>
        <option value="">Tanlang...</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}


function PageHeader({ title, action, onRefresh }) {
  const [spinning, setSpinning] = useState(false)

  const handleRefresh = () => {
    setSpinning(true)
    onRefresh()
    setTimeout(() => setSpinning(false), 600)
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>{title}</h2>
        {onRefresh && (
          <button onClick={handleRefresh} title="Yangilash"
            style={{
              ...C.btnGray, padding: '5px 9px', fontSize: 14,
              display: 'inline-block',
              transform: spinning ? 'rotate(360deg)' : 'rotate(0deg)',
              transition: 'transform 0.6s ease'
            }}>
            🔄
          </button>
        )}
      </div>
      {action}
    </div>
  )
}




// ── Statistika (to'liq, pro) ─────────────────────────────
const PIE_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4', '#ec4899', '#84cc16']

function toDateStr(d) {
  return d.toISOString().slice(0, 10)
}

function getPresetRange(preset) {
  const today = new Date()
  const to = toDateStr(today)
  let from
  if (preset === 'today') {
    from = to
  } else if (preset === 'week') {
    const d = new Date(today); d.setDate(d.getDate() - 6)
    from = toDateStr(d)
  } else if (preset === 'month') {
    const d = new Date(today.getFullYear(), today.getMonth(), 1)
    from = toDateStr(d)
  } else if (preset === 'year') {
    const d = new Date(today.getFullYear(), 0, 1)
    from = toDateStr(d)
  } else {
    from = to
  }
  return { from, to }
}

function StatCard({ icon, label, value, color, sub }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 18px', borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 19, fontWeight: 800, color }}>{fmt(value)}</div>
      <div style={{ fontSize: 10, color: 'var(--text2)' }}>{sub || "so'm"}</div>
    </div>
  )
}

function SectionTabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap', borderBottom: '1px solid var(--border)', paddingBottom: 2 }}>
      {tabs.map(tb => (
        <button key={tb.key} onClick={() => onChange(tb.key)}
          style={{
            padding: '9px 16px', borderRadius: '8px 8px 0 0', cursor: 'pointer', fontSize: 13, fontWeight: active === tb.key ? 700 : 500,
            border: 'none', borderBottom: active === tb.key ? '2.5px solid var(--accent)' : '2.5px solid transparent',
            background: active === tb.key ? 'var(--accent-light)' : 'transparent',
            color: active === tb.key ? 'var(--accent)' : 'var(--text2)',
          }}>
          {tb.icon} {tb.label}
        </button>
      ))}
    </div>
  )
}

function StatsPage() {
  const [preset, setPreset] = useState('month')
  const [dateFrom, setDateFrom] = useState(getPresetRange('month').from)
  const [dateTo, setDateTo] = useState(getPresetRange('month').to)
  const [activeTab, setActiveTab] = useState('overview')

  const [overview, setOverview] = useState(null)
  const [trend, setTrend] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [cashiers, setCashiers] = useState([])
  const [kontragentsStat, setKontragentsStat] = useState([])
  const [expenses, setExpenses] = useState([])
  const [spinning, setSpinning] = useState(false)

  const params = { date_from: dateFrom, date_to: dateTo }

  const loadAll = () => {
    setSpinning(true)
    advancedStatsApi.overview(params).then(r => setOverview(r.data)).catch(() => {})
    advancedStatsApi.dailyTrend(params).then(r => setTrend(r.data || [])).catch(() => {})
    advancedStatsApi.topProducts({ ...params, limit: 10 }).then(r => setTopProducts(r.data || [])).catch(() => {})
    advancedStatsApi.cashiers(params).then(r => setCashiers(r.data || [])).catch(() => {})
    advancedStatsApi.kontragents().then(r => setKontragentsStat(r.data || [])).catch(() => {})
    advancedStatsApi.expenses(params).then(r => setExpenses(r.data || [])).catch(() => {})
    setTimeout(() => setSpinning(false), 600)
  }

  useEffect(() => { loadAll() }, [dateFrom, dateTo])

  const applyPreset = (p) => {
    setPreset(p)
    const r = getPresetRange(p)
    setDateFrom(r.from)
    setDateTo(r.to)
  }

  const tabs = [
    { key: 'overview', label: 'Umumiy', icon: '📊' },
    { key: 'trend', label: 'Savdo tarixi', icon: '📈' },
    { key: 'products', label: 'Mahsulotlar', icon: '🛢️' },
    { key: 'cashiers', label: 'Kassirlar', icon: '👤' },
    { key: 'money', label: 'Tushum/Chiqim', icon: '💰' },
  ]

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>📊 Statistika</h2>
        <button onClick={loadAll} title="Yangilash"
          style={{
            ...C.btnGray, padding: '5px 9px', fontSize: 14,
            transform: spinning ? 'rotate(360deg)' : 'rotate(0deg)', transition: 'transform .6s ease'
          }}>🔄</button>
      </div>

      {/* Sana filtri */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {[
          { key: 'today', label: 'Bugun' },
          { key: 'week', label: '7 kun' },
          { key: 'month', label: 'Shu oy' },
          { key: 'year', label: 'Shu yil' },
        ].map(p => (
          <button key={p.key} onClick={() => applyPreset(p.key)}
            style={{
              padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: preset === p.key ? 700 : 500, cursor: 'pointer',
              border: `1.5px solid ${preset === p.key ? 'var(--accent)' : 'var(--border)'}`,
              background: preset === p.key ? 'var(--accent)' : 'var(--surface2)',
              color: preset === p.key ? '#fff' : 'var(--text)',
            }}>{p.label}</button>
        ))}
        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
        <input type="date" value={dateFrom} onChange={e => { setPreset('custom'); setDateFrom(e.target.value) }} style={{ ...C.input, maxWidth: 150 }} />
        <span style={{ color: 'var(--text2)' }}>—</span>
        <input type="date" value={dateTo} onChange={e => { setPreset('custom'); setDateTo(e.target.value) }} style={{ ...C.input, maxWidth: 150 }} />
      </div>

      <SectionTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {/* ═══ UMUMIY ═══ */}
      {activeTab === 'overview' && overview && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
            <StatCard icon="💰" label="Jami savdo" value={overview.total_sales} color="var(--accent)" />
            <StatCard icon="💵" label="Naqd" value={overview.naqd_amount} color="var(--blue)" />
            <StatCard icon="💳" label="Karta" value={overview.karta_amount} color="#a855f7" />
            <StatCard icon="📋" label="Qarzga" value={overview.debt_amount} color="var(--danger)" />
            <StatCard icon="↩" label="Qaytarilgan" value={overview.return_amount} color="var(--warning)" />
            <StatCard icon="📥" label="Sef kirim" value={overview.safe_kirim} color="var(--accent)" />
            <StatCard icon="📤" label="Sof xarajat" value={overview.safe_chiqim} color="var(--danger)" />
            <StatCard icon="✅" label="Sof foyda" value={overview.net_profit} color={overview.net_profit >= 0 ? 'var(--accent)' : 'var(--danger)'} />
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 18px', display: 'flex', gap: 30 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>Cheklar soni</div>
              <div style={{ fontFamily: 'var(--mono)', fontWeight: 800, fontSize: 20 }}>{overview.sales_count} ta</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>O'rtacha chek</div>
              <div style={{ fontFamily: 'var(--mono)', fontWeight: 800, fontSize: 20 }}>
                {fmt(overview.sales_count > 0 ? overview.total_sales / overview.sales_count : 0)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ SAVDO TARIXI (TREND) ═══ */}
      {activeTab === 'trend' && (
        <div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>📈 Kunlik savdo dinamikasi</div>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => (v / 1000000).toFixed(0) + 'M'} />
                <Tooltip formatter={v => fmt(v) + " so'm"} />
                <Legend />
                <Line type="monotone" dataKey="total_sales" name="Jami savdo" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="naqd_amount" name="Naqd" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="karta_amount" name="Karta" stroke="#a855f7" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <Table
            headers={['Sana', 'Jami savdo', 'Naqd', 'Karta']}
            rows={trend.slice().reverse().map(t => [
              t.date,
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--accent)' }}>{fmt(t.total_sales)}</span>,
              <span style={{ fontFamily: 'var(--mono)' }}>{fmt(t.naqd_amount)}</span>,
              <span style={{ fontFamily: 'var(--mono)' }}>{fmt(t.karta_amount)}</span>,
            ])}
          />
        </div>
      )}

      {/* ═══ MAHSULOTLAR ═══ */}
      {activeTab === 'products' && (
        <div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>🏆 Eng ko'p sotilgan mahsulotlar (summa bo'yicha)</div>
            <ResponsiveContainer width="100%" height={Math.max(300, topProducts.length * 40)}>
              <BarChart data={topProducts} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => (v / 1000000).toFixed(0) + 'M'} />
                <YAxis type="category" dataKey="product_name" tick={{ fontSize: 12 }} width={140} />
                <Tooltip formatter={v => fmt(v) + " so'm"} />
                <Bar dataKey="total_amount" name="Summa" fill="#22c55e" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <Table
            headers={['№', 'Mahsulot', 'Soni', 'Jami summa']}
            rows={topProducts.map((p, i) => [
              i + 1,
              <strong>{p.product_name}</strong>,
              <span style={{ fontFamily: 'var(--mono)' }}>{p.total_quantity} ta</span>,
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--accent)' }}>{fmt(p.total_amount)}</span>,
            ])}
          />
        </div>
      )}

      {/* ═══ KASSIRLAR ═══ */}
      {activeTab === 'cashiers' && (
        <div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>👤 Kassirlar bo'yicha savdo</div>
            <ResponsiveContainer width="100%" height={Math.max(260, cashiers.length * 60)}>
              <BarChart data={cashiers} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => (v / 1000000).toFixed(0) + 'M'} />
                <YAxis type="category" dataKey="username" tick={{ fontSize: 12 }} width={100} />
                <Tooltip formatter={v => fmt(v) + " so'm"} />
                <Bar dataKey="naqd_amount" name="Naqd" stackId="a" fill="#3b82f6" />
                <Bar dataKey="karta_amount" name="Karta" stackId="a" fill="#a855f7" radius={[0, 6, 6, 0]} />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <Table
            headers={['Kassir', 'Ism', 'Cheklar soni', 'Jami savdo', 'Naqd', 'Karta']}
            rows={cashiers.map(c => [
              <strong>{c.username}</strong>,
              c.full_name || '—',
              <span style={{ fontFamily: 'var(--mono)' }}>{c.sales_count} ta</span>,
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--accent)' }}>{fmt(c.total_sales)}</span>,
              <span style={{ fontFamily: 'var(--mono)' }}>{fmt(c.naqd_amount)}</span>,
              <span style={{ fontFamily: 'var(--mono)' }}>{fmt(c.karta_amount)}</span>,
            ])}
          />
        </div>
      )}

      {/* ═══ TUSHUM/CHIQIM (Kontragentlar + Xarajatlar) ═══ */}
      {activeTab === 'money' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>💸 Xarajatlar taqsimoti</div>
              {expenses.length === 0 ? (
                <div style={{ color: 'var(--text2)', fontSize: 13, textAlign: 'center', padding: 30 }}>Xarajat yo'q</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={expenses} dataKey="total_amount" nameKey="note_prefix" cx="50%" cy="50%" outerRadius={90} label={(e) => e.note_prefix}>
                      {expenses.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={v => fmt(v) + " so'm"} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>🏢 Kontragentlar holati</div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={kontragentsStat}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => (v / 1000000).toFixed(0) + 'M'} />
                  <Tooltip formatter={v => fmt(v) + " so'm"} />
                  <Legend />
                  <Bar dataKey="jami_qarz" name="Qarzimiz" fill="#ef4444" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <h3 style={{ marginBottom: 10, fontSize: 14, fontWeight: 700 }}>Xarajatlar ro'yxati</h3>
          <Table
            headers={['Izoh', 'Soni', 'Jami summa']}
            rows={expenses.map(e => [
              e.note_prefix,
              <span style={{ fontFamily: 'var(--mono)' }}>{e.count} ta</span>,
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--danger)' }}>{fmt(e.total_amount)}</span>,
            ])}
          />

          <h3 style={{ marginBottom: 10, marginTop: 24, fontSize: 14, fontWeight: 700 }}>Kontragentlar ro'yxati</h3>
          <Table
            headers={['Kontragent', 'Jami kirim (undan)', 'Jami to\'langan', 'Joriy qarz']}
            rows={kontragentsStat.map(k => [
              <strong>{k.name}</strong>,
              <span style={{ fontFamily: 'var(--mono)' }}>{fmt(k.jami_kirim)}</span>,
              <span style={{ fontFamily: 'var(--mono)', color: 'var(--accent)' }}>{fmt(k.jami_tolangan)}</span>,
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--danger)' }}>{fmt(k.jami_qarz)}</span>,
            ])}
          />
        </div>
      )}
    </div>
  )
}






// ── Savdolar ────────────────────────────────────────────
function SalesPage() {
  const [sales, setSales] = useState({ items: [], total: 0 })
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)
  const [msg, setMsg] = useState(null)
  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 2500) }

  useEffect(() => {
    saleApi.list({ page, page_size: 50 }).then(r => setSales(r.data)).catch(() => {})
  }, [page])

  return (
    <div style={{ padding: 24 }}>
      <PageHeader title="🧾 Cheklar ro'yxati" onRefresh={() => saleApi.list({ page, page_size: 50 }).then(r => setSales(r.data)).catch(() => {})} />
      <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 14 }}>Jami: {sales.total} ta savdo</div>

      <Table
        headers={['Chek', 'Sana', 'Kassir', 'Mijoz', 'Jami', "To'lov", 'Qarz']}
        rows={sales.items.map(s => [
          <button onClick={() => setSelected(s)} style={{ background: 'none', color: 'var(--blue)', fontWeight: 700, fontFamily: 'var(--mono)', cursor: 'pointer', fontSize: 13 }}>#{s.id}</button>,
          <span style={{ fontSize: 12, color: 'var(--text2)' }}>{new Date(s.created_at).toLocaleString('uz-UZ')}</span>,
          s.kassir?.username,
          s.client?.full_name || '—',
          <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--accent)' }}>{fmt(s.final_amount)}</span>,
          <Tag type={s.payment_type} />,
          s.debt_amount > 0
            ? <span style={{ color: 'var(--danger)', fontFamily: 'var(--mono)', fontWeight: 600 }}>{fmt(s.debt_amount)}</span>
            : <span style={{ color: 'var(--accent)' }}>—</span>
        ])}
      />

      {/* Pagination */}
      <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ ...C.btnGray, opacity: page === 1 ? 0.5 : 1 }}>← Oldingi</button>
        <span style={{ padding: '8px 12px', fontSize: 13, color: 'var(--text2)' }}>{page}-sahifa</span>
        <button onClick={() => setPage(p => p + 1)} disabled={sales.items.length < 50} style={{ ...C.btnGray, opacity: sales.items.length < 50 ? 0.5 : 1 }}>Keyingi →</button>
      </div>

      {/* Savdo detail modal */}
      {selected && (
        <Modal title={`Chek #${selected.id}`} onClose={() => setSelected(null)}>
          <div style={{ marginBottom: 14 }}>
            {[
              ['Kassir', selected.kassir?.username],
              ['Mijoz', selected.client?.full_name || '—'],
              ['Sana', new Date(selected.created_at).toLocaleString('uz-UZ')],
              ["To'lov", selected.payment_type],
              ['Jami', `${fmt(selected.total_amount)} so'm`],
              ["Chegirma", selected.discount_amount > 0 ? `-${fmt(selected.discount_amount)} so'm` : '—'],
              ["Yakuniy", `${fmt(selected.final_amount)} so'm`],
              ["To'langan", `${fmt(selected.paid_amount)} so'm`],
              ['Qarz', selected.debt_amount > 0 ? `${fmt(selected.debt_amount)} so'm` : '—'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text2)', fontSize: 13 }}>{k}:</span>
                <span style={{ fontWeight: 500, fontSize: 13 }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Mahsulotlar */}
          <h4 style={{ marginBottom: 10, fontWeight: 600 }}>Mahsulotlar</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Mahsulot', 'Narx', 'Soni', 'Jami', 'Holat'].map(h => (
                  <th key={h} style={{ ...C.th, fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {selected.items?.map(item => (
                <tr key={item.id} style={{ opacity: item.is_active ? 1 : 0.5, background: item.is_active ? 'transparent' : 'var(--danger-light)' }}>
                  <td style={C.td}>{item.batch?.product?.name}</td>
                  <td style={{ ...C.td, fontFamily: 'var(--mono)', fontSize: 12 }}>{fmt(item.sale_price)}</td>
                  <td style={{ ...C.td, textAlign: 'center' }}>{item.quantity}</td>
                  <td style={{ ...C.td, fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 12 }}>{fmt(item.total)}</td>
                  <td style={C.td}>
                    {item.is_active
                      ? <span style={{ color: 'var(--accent)', fontSize: 12 }}>✓</span>
                      : <span style={{ color: 'var(--danger)', fontSize: 11, fontWeight: 600 }}>Qaytarilgan</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Modal>
      )}
      {msg && <Toast msg={msg} />}
    </div>
  )
}


// ── Kirimlar ────────────────────────────────────────────
function IncomesPage() {
  const [incomes, setIncomes] = useState({ items: [], total: 0 })
  const [setPriceModal, setSetPriceModal] = useState(null)
  const [priceData, setPriceData] = useState({})

  const [payData, setPayData] = useState({ type: 'qarz', naqd: '', karta: '' })
  const [selectedIncome, setSelectedIncome] = useState(null)   // ⬅️ SHU YERDA (funksiya ichida)

  const [kontragents, setKontragents] = useState([])
  const [products, setProducts] = useState([])
  const [brands, setBrands] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ kontragent_id: '', items: [{ product_id: '', brand_id: '', quantity: '' }] })
  const [msg, setMsg] = useState(null)
  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 2500) }

  const load = () => incomeApi.list({ page_size: 50 }).then(r => setIncomes(r.data)).catch(() => {})

  useEffect(() => {
    load()
    kontragentApi.list().then(r => setKontragents(r.data || [])).catch(() => {})
    productApi.list({ page_size: 200 }).then(r => setProducts(r.data.items || [])).catch(() => {})
    brandApi.list().then(r => setBrands(r.data || [])).catch(() => {})
  }, [])



  const handleSetPrices = async () => {
    const items = setPriceModal.items.filter(i => !i.batch).map(i => ({
      income_item_id: i.id,
      price_usd: parseFloat(priceData[i.id]?.price_usd || 0),
      exchange_rate: parseFloat(priceData[i.id]?.exchange_rate || 0),
      markup_percent: parseFloat(priceData[i.id]?.markup_percent || 0),
    })).filter(i => i.price_usd > 0 && i.exchange_rate > 0)

    if (!items.length) return flash('Narxlarni to\'ldiring!', 'error')

    const naqd = parseFloat(payData.naqd || 0)
    const karta = parseFloat(payData.karta || 0)

    try {
      await incomeApi.setPrices(setPriceModal.id, {
        items,
        naqd_amount: naqd,
        karta_amount: karta,
        payment_type: payData.type || 'qarz',
      })
      flash('✅ Narx va to\'lov kiritildi!')
      setSetPriceModal(null)
      setPriceData({})
      setPayData({ type: 'qarz', naqd: '', karta: '' })
      load()
    } catch (e) { flash(e.response?.data?.detail || 'Xato!', 'error') }
  }


  const handleCreateIncome = async () => {
    if (!form.kontragent_id) return flash('Kontragentni tanlang!', 'error')
    if (form.items.some(i => !i.product_id || !i.quantity)) return flash('Mahsulot va sonini kiriting!', 'error')


    try {
      await incomeApi.create({
        kontragent_id: parseInt(form.kontragent_id),
        items: form.items.map(i => ({
          product_id: parseInt(i.product_id),
          brand_id: i.brand_id ? parseInt(i.brand_id) : null,
          quantity: parseInt(i.quantity)
        }))
      })
      flash('✅ Kirim yaratildi!')
      setShowForm(false)
      setForm({ kontragent_id: '', items: [{ product_id: '', brand_id: '', quantity: '' }] })
      load()
    } catch (e) { flash(e.response?.data?.detail || 'Xato!', 'error') }
  }



  return (
    <div style={{ padding: 24 }}>

      <PageHeader
        title="📦 Kirimlar"
        onRefresh={load}
        action={<button onClick={() => setShowForm(true)} style={C.btnGreen}>+ Yangi kirim</button>}
      />

      <Table
        headers={['Raqam', 'Sana', 'Kontragent', 'Omborchi', 'Mahsulotlar', 'Holat', 'Amallar']}
        rows={incomes.items.map(inc => [

          <button onClick={() => setSelectedIncome(inc)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--blue)' }}>{inc.income_number}</button>,

          <span style={{ color: 'var(--text2)', fontSize: 12 }}>{inc.date}</span>,
          inc.kontragent?.name,
          inc.warehouse_user?.username,
          <span style={{ fontSize: 12 }}>{inc.items?.length} ta</span>,
          inc.items?.some(i => !i.batch)
            ? <span style={{ color: 'var(--warning)', fontSize: 12, fontWeight: 600 }}>⏳ Narx kutilmoqda</span>
            : <span style={{ color: 'var(--accent)', fontSize: 12 }}>✓ To'liq</span>,
          inc.items?.some(i => !i.batch) && (
            <button onClick={() => setSetPriceModal(inc)} style={{ ...C.btnGreen, fontSize: 12, padding: '5px 10px' }}>
              💲 Narx kiritish
            </button>
          )
        ])}
      />

      {/* Narx kiritish modal */}
      {setPriceModal && (
        <Modal title={`${setPriceModal.income_number} — Narx kiritish`} onClose={() => setSetPriceModal(null)} width={520}>
          <div style={{ background: 'var(--warning-light)', border: '1px solid var(--warning)', borderRadius: 6, padding: '8px 12px', marginBottom: 14, fontSize: 12, color: 'var(--warning)' }}>
            ⚠️ Narx kiritilgandan keyin omborga mahsulot tushadi
          </div>

          {setPriceModal.items.filter(i => !i.batch).map(item => (
            <div key={item.id} style={{ background: 'var(--surface2)', borderRadius: 'var(--radius)', padding: 12, marginBottom: 12, border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 13 }}>
                Mahsulot ID: {item.product_id} · Soni: {item.quantity} ta
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {[
                  { key: 'price_usd', label: 'Mahsulot olingan narxi ($)', placeholder: '50' },
                  { key: 'exchange_rate', label: 'Dollar kursi', placeholder: '12700' },
                  { key: 'markup_percent', label: 'Ustama %', placeholder: '20' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: 11, color: 'var(--text2)', display: 'block', marginBottom: 3 }}>{f.label}</label>
                    <input type="number" placeholder={f.placeholder}
                      value={priceData[item.id]?.[f.key] || ''}
                      onChange={e => setPriceData(p => ({ ...p, [item.id]: { ...p[item.id], [f.key]: e.target.value } }))}
                      style={C.input}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}



          {/* ── TO'LOV QISMI ── */}
          {(() => {
            const jami = setPriceModal.items.filter(i => !i.batch).reduce((s, i) => {
              const pd = priceData[i.id] || {}
              const tan = (parseFloat(pd.price_usd || 0)) * (parseFloat(pd.exchange_rate || 0))
              return s + tan * (i.quantity || 0)
            }, 0)
            const naqd = parseFloat(payData.naqd || 0)
            const karta = parseFloat(payData.karta || 0)
            const tolangan = payData.type === 'naqd' ? naqd
              : payData.type === 'karta' ? karta
              : payData.type === 'aralash' ? naqd + karta : 0
            const qarz = Math.max(jami - tolangan, 0)

            return (
              <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius)', padding: 14, marginBottom: 14, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: 'var(--text2)' }}>Jami summa:</span>
                  <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 15 }}>{fmt(jami)} so'm</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 10 }}>
                  {['naqd', 'karta', 'aralash', 'qarz'].map(tp => (
                    <button key={tp} onClick={() => setPayData(p => ({ ...p, type: tp }))}
                      style={{
                        padding: '7px 4px', borderRadius: 6, fontSize: 11, fontWeight: payData.type === tp ? 700 : 500, cursor: 'pointer',
                        border: `1.5px solid ${payData.type === tp ? 'var(--accent)' : 'var(--border)'}`,
                        background: payData.type === tp ? 'var(--accent)' : 'var(--surface)',
                        color: payData.type === tp ? '#fff' : 'var(--text)',
                      }}>
                      {tp === 'naqd' ? '💵 Naqd' : tp === 'karta' ? '💳 Karta' : tp === 'aralash' ? '💵+💳' : '📋 Qarz'}
                    </button>
                  ))}
                </div>

                {(payData.type === 'naqd' || payData.type === 'aralash') && (
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 11, color: 'var(--text2)', display: 'block', marginBottom: 3 }}>💵 Naqd:</label>
                    <input type="number" value={payData.naqd} placeholder="0"
                      onChange={e => setPayData(p => ({ ...p, naqd: e.target.value }))}
                      style={{ ...C.input, fontFamily: 'var(--mono)' }} />
                  </div>
                )}

                {(payData.type === 'karta' || payData.type === 'aralash') && (
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 11, color: 'var(--text2)', display: 'block', marginBottom: 3 }}>💳 Karta:</label>
                    <input type="number" value={payData.karta} placeholder="0"
                      onChange={e => setPayData(p => ({ ...p, karta: e.target.value }))}
                      style={{ ...C.input, fontFamily: 'var(--mono)' }} />
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 13, color: 'var(--text2)' }}>Qarz qoladi:</span>
                  <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 14, color: qarz > 0 ? 'var(--danger)' : 'var(--accent)' }}>
                    {fmt(qarz)} so'm
                  </span>
                </div>
              </div>
            )
          })()}

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSetPrices} style={{ ...C.btnGreen, flex: 1 }}>✓ Narx va to'lovni saqlash</button>
            <button onClick={() => setSetPriceModal(null)} style={{ ...C.btnGray, flex: 1 }}>Bekor</button>
          </div>
        </Modal>
    )}




      {/* Yangi kirim modal */}
      {showForm && (
        <Modal title="Yangi kirim" onClose={() => setShowForm(false)} width={560}>
          <SelectField label="Kontragent *" value={form.kontragent_id}
            onChange={v => setForm(p => ({ ...p, kontragent_id: v }))}
            options={kontragents.map(k => ({ value: k.id, label: k.name }))}
            required
          />

          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Mahsulotlar</div>
          {form.items.map((item, idx) => (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px 32px', gap: 6, marginBottom: 8, alignItems: 'end' }}>
              <div>
                {idx === 0 && <label style={{ fontSize: 11, color: 'var(--text2)', display: 'block', marginBottom: 3 }}>Mahsulot *</label>}
                <select value={item.product_id}
                  onChange={e => setForm(p => ({ ...p, items: p.items.map((x, i) => i === idx ? { ...x, product_id: e.target.value } : x) }))}
                  style={C.input}>
                  <option value="">Tanlang...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                {idx === 0 && <label style={{ fontSize: 11, color: 'var(--text2)', display: 'block', marginBottom: 3 }}>Brand</label>}
                <select value={item.brand_id}
                  onChange={e => setForm(p => ({ ...p, items: p.items.map((x, i) => i === idx ? { ...x, brand_id: e.target.value } : x) }))}
                  style={C.input}>
                  <option value="">—</option>
                  {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                {idx === 0 && <label style={{ fontSize: 11, color: 'var(--text2)', display: 'block', marginBottom: 3 }}>Soni *</label>}
                <input type="number" placeholder="0" value={item.quantity}
                  onChange={e => setForm(p => ({ ...p, items: p.items.map((x, i) => i === idx ? { ...x, quantity: e.target.value } : x) }))}
                  style={C.input}
                />
              </div>
              <button onClick={() => setForm(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }))}
                style={{ padding: '8px', background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 6, border: 'none', cursor: 'pointer', height: 36 }}>✕</button>
            </div>
          ))}


          <button onClick={() => setForm(p => ({ ...p, items: [...p.items, { product_id: '', brand_id: '', quantity: '' }] }))}
          style={{ ...C.btnGray, fontSize: 12, marginBottom: 16 }}>+ Mahsulot qo'shish</button>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>📝 Izoh (ixtiyoriy)</label>
          <textarea
            value={form.note}
            onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
            placeholder="Partiya haqida eslatma..."
            rows={2}
            style={{ ...C.input, resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>

        <div style={{ background: 'var(--warning-light)', border: '1px solid var(--warning)', borderRadius: 6, padding: '8px 12px', marginBottom: 14, fontSize: 12, color: 'var(--warning)' }}>
          ⚠️ Narx, kurs va ustama admin tomonidan kiritiladi
        </div>


          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleCreateIncome} style={{ ...C.btnGreen, flex: 1 }}>✓ Saqlash</button>
            <button onClick={() => setShowForm(false)} style={{ ...C.btnGray, flex: 1 }}>Bekor</button>
          </div>
        </Modal>
      )}




      {/* ── KIRIM DETAIL MODAL ── */}
      {selectedIncome && (
        <Modal title={`${selectedIncome.income_number} — Tafsilot`} onClose={() => setSelectedIncome(null)} width={700}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 18 }}>
            <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius)', padding: '12px 14px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Kontragent</div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>🏢 {selectedIncome.kontragent?.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>{selectedIncome.kontragent?.phone}</div>
            </div>
            <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius)', padding: '12px 14px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Omborchi</div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>👤 {selectedIncome.warehouse_user?.username}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>{selectedIncome.date}</div>
            </div>

            <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius)', padding: '12px 14px', border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Holat</div>
        <div style={{ fontWeight: 700, fontSize: 14 }}>
          {selectedIncome.items?.some(i => !i.batch)
            ? <span style={{ color: 'var(--warning)' }}>⏳ Narx kutilmoqda</span>
            : <span style={{ color: 'var(--accent)' }}>✓ To'liq</span>}
        </div>
      </div>
    </div>

    {/* Izoh */}
    {selectedIncome.note && (
      <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 14px', marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>📝 Izoh</div>
        <div style={{ fontSize: 13 }}>{selectedIncome.note}</div>
      </div>
    )}

    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>📦 Mahsulotlar</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
            <thead>
              <tr>
                {['№', 'Mahsulot', 'Soni', 'Tan narx', 'Sotuv narx', 'Jami', 'Holat'].map(h => (
                  <th key={h} style={{ ...C.th, fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {selectedIncome.items?.map((item, idx) => {
                const tanNarx = item.batch ? item.batch.price_som : 0
                const jami = tanNarx * (item.quantity || 0)
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ ...C.td, color: 'var(--text2)', fontSize: 12 }}>{idx + 1}</td>
                    <td style={C.td}>
                      <div style={{ fontWeight: 600 }}>{item.batch?.product?.name || `ID: ${item.product_id}`}</div>
                      {item.batch?.brand && <div style={{ fontSize: 11, color: 'var(--text2)' }}>{item.batch.brand.name}</div>}
                    </td>
                    <td style={{ ...C.td, fontFamily: 'var(--mono)', fontWeight: 700 }}>{item.quantity}</td>
                    <td style={{ ...C.td, fontFamily: 'var(--mono)', fontSize: 12 }}>
                      {item.batch ? fmt(tanNarx) : <span style={{ color: 'var(--warning)' }}>—</span>}
                    </td>
                    <td style={{ ...C.td, fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>
                      {item.batch ? fmt(item.batch.sale_price) : <span style={{ color: 'var(--warning)' }}>Narx yo'q</span>}
                    </td>
                    <td style={{ ...C.td, fontFamily: 'var(--mono)', fontWeight: 700 }}>
                      {item.batch ? fmt(jami) : '—'}
                    </td>
                    <td style={C.td}>
                      {item.batch
                        ? <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: 'var(--accent-light)', color: 'var(--accent)' }}>✓ Tayyor</span>
                        : <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: 'var(--warning-light)', color: 'var(--warning)' }}>⏳ Narx kerak</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {selectedIncome.payment && (
            <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius)', padding: 14, border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>💰 To'lov</div>
              {[
                { l: 'Jami summa:', v: selectedIncome.payment.total_amount, c: 'var(--text)', bold: true },
                selectedIncome.payment.naqd_amount > 0 && { l: 'Naqd:', v: selectedIncome.payment.naqd_amount, c: 'var(--accent)' },
                selectedIncome.payment.karta_amount > 0 && { l: 'Karta:', v: selectedIncome.payment.karta_amount, c: 'var(--blue)' },
                selectedIncome.payment.debt_amount > 0 && { l: 'Qarz:', v: selectedIncome.payment.debt_amount, c: 'var(--danger)', bold: true },
              ].filter(Boolean).map(({ l, v, c, bold }) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 13, color: 'var(--text2)' }}>{l}</span>
                  <span style={{ fontFamily: 'var(--mono)', fontWeight: bold ? 700 : 400, color: c }}>{fmt(v)} so'm</span>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {msg && <Toast msg={msg} />}
    </div>
  )
}





// ── Mijozlar ────────────────────────────────────────────
function ClientsPage() {
  const [clients, setClients] = useState({ items: [], total: 0 })
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [oilRecords, setOilRecords] = useState([])

  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ full_name: '', phone: '', car_number: '', car_model: '' })
  const [msg, setMsg] = useState(null)
  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 2500) }

  const load = (s = '') => clientApi.list({ search: s, page_size: 50 }).then(r => setClients(r.data)).catch(() => {})

  useEffect(() => { load() }, [])

  const openClient = async (c) => {
    setSelected(c)
    oilRecordApi.list(c.id, { page_size: 20 }).then(r => setOilRecords(r.data.items || [])).catch(() => {})
  }

  const openCreate = () => {
    setEditItem(null)
    setForm({ full_name: '', phone: '', car_number: '', car_model: '' })
    setShowForm(true)
  }

  const openEdit = (c) => {
    setEditItem(c)
    setForm({ full_name: c.full_name, phone: c.phone || '', car_number: c.car_number || '', car_model: c.car_model || '' })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.full_name.trim()) return flash('Ism familiyani kiriting!', 'error')
    try {
      if (editItem) {
        await clientApi.update(editItem.id, form)
        flash('✅ Mijoz yangilandi!')
      } else {
        await clientApi.create(form)
        flash('✅ Mijoz qo\'shildi!')
      }
      setShowForm(false)
      load(search)
    } catch (e) { flash(e.response?.data?.detail || 'Xato!', 'error') }
  }

  const handleDelete = async (c) => {
    if (!window.confirm(`"${c.full_name}"ni o'chirasizmi?`)) return
    try {
      await clientApi.delete(c.id)
      flash('✅ O\'chirildi!')
      load(search)
    } catch (e) { flash(e.response?.data?.detail || 'Xato!', 'error') }
  }

  return (
    <div style={{ padding: 24 }}>

      <PageHeader
        title="👥 Mijozlar"
        onRefresh={() => load(search)}
        action={<button onClick={openCreate} style={C.btnGreen}>+ Yangi mijoz</button>}
      />

      <div style={{ marginBottom: 16, maxWidth: 300 }}>
        <input type="text" placeholder="Qidirish (ism, tel, mashina)..."
          value={search}
          onChange={e => { setSearch(e.target.value); load(e.target.value) }}
          style={C.input}
        />
      </div>

      <Table
        headers={['ID', 'Ism', 'Telefon', 'Mashina', 'Qarz', 'Amallar']}
        rows={clients.items.map(c => [
          <span style={{ color: 'var(--text2)', fontSize: 12 }}>{c.id}</span>,
          <button onClick={() => openClient(c)} style={{ background: 'none', color: 'var(--blue)', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>{c.full_name}</button>,
          c.phone || '—',
          c.car_number ? <span>🚗 {c.car_number} <span style={{ color: 'var(--text2)', fontSize: 11 }}>({c.car_model || ''})</span></span> : '—',
          c.jami_qarz > 0
            ? <span style={{ color: 'var(--danger)', fontFamily: 'var(--mono)', fontWeight: 700 }}>{fmt(c.jami_qarz)} so'm</span>
            : <span style={{ color: 'var(--accent)' }}>—</span>,
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => openClient(c)} style={{ ...C.btnGray, fontSize: 12, padding: '5px 10px' }}>👁</button>
            <button onClick={() => openEdit(c)} style={{ ...C.btnGray, fontSize: 12, padding: '5px 10px' }}>✏️</button>
            <button onClick={() => handleDelete(c)} style={{ ...C.btnRed, fontSize: 12, padding: '5px 10px' }}>🗑</button>
          </div>
        ])}
      />

      {showForm && (
        <Modal title={editItem ? '✏️ Mijozni tahrirlash' : '+ Yangi mijoz'} onClose={() => setShowForm(false)}>
          <InpField label="Ism familiya *" value={form.full_name} onChange={v => setForm(p => ({ ...p, full_name: v }))} required />
          <InpField label="Telefon" value={form.phone} onChange={v => setForm(p => ({ ...p, phone: v }))} />
          <InpField label="Mashina raqami" value={form.car_number} onChange={v => setForm(p => ({ ...p, car_number: v }))} />
          <InpField label="Mashina modeli" value={form.car_model} onChange={v => setForm(p => ({ ...p, car_model: v }))} />
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button onClick={handleSave} style={{ ...C.btnGreen, flex: 1 }}>Saqlash</button>
            <button onClick={() => setShowForm(false)} style={{ ...C.btnGray, flex: 1 }}>Bekor</button>
          </div>
        </Modal>
      )}

      {selected && (
        <Modal title={`👤 ${selected.full_name}`} onClose={() => setSelected(null)} width={540}>
          <div style={{ marginBottom: 16 }}>
            {[
              ['Telefon', selected.phone || '—'],
              ['Mashina', selected.car_number ? `${selected.car_number} (${selected.car_model || ''})` : '—'],
              ['Umumiy qarz', `${fmt(selected.jami_qarz)} so'm`],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text2)', fontSize: 13 }}>{k}:</span>
                <span style={{ fontWeight: 500, fontSize: 13 }}>{v}</span>
              </div>
            ))}
          </div>

          <h4 style={{ marginBottom: 10, fontWeight: 600 }}>🛢️ Probeg daftarchasi</h4>
          {oilRecords.length === 0
            ? <div style={{ color: 'var(--text2)', fontSize: 13, padding: '12px 0' }}>Yozuv yo'q</div>
            : oilRecords.map(r => (
              <div key={r.id} style={{ background: 'var(--surface2)', borderRadius: 'var(--radius)', padding: 12, marginBottom: 10, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{r.oil_brand} {r.oil_type}</span>
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>{r.date}</span>
                </div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>
                  {r.mileage && <span>📍 {fmt(r.mileage)} km</span>}
                  {r.next_date && <span style={{ color: 'var(--accent)', fontWeight: 600 }}>📅 Keyingi: {r.next_date}</span>}
                  {r.transmission && <span>⚙️ {r.transmission}</span>}
                  {r.master_name && <span>👨‍🔧 {r.master_name}</span>}
                </div>
                {[r.oil_filter && 'Moy filtri', r.air_filter && 'Havo filtri', r.salon_filter && 'Salon filtri', r.spark_plug && 'Shamlar', r.fuel_filter && 'Yoqilg\'i filtri', r.pampers && 'Pampers'].filter(Boolean).map(f => (
                  <span key={f} style={{ padding: '2px 7px', background: 'var(--accent-light)', color: 'var(--accent)', borderRadius: 4, fontSize: 11, fontWeight: 600, marginRight: 5 }}>✓ {f}</span>
                ))}
              </div>
            ))
          }
        </Modal>
      )}
      {msg && <Toast msg={msg} />}
    </div>
  )
}






// ── Kategoriyalar ───────────────────────────────────────
function CategoriesPage() {
  const [categories, setCategories] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)   // null = yangi, obyekt = tahrirlash
  const [name, setName] = useState('')
  const [msg, setMsg] = useState(null)
  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 2500) }

  const load = () => categoryApi.list().then(r => setCategories(r.data || [])).catch(() => {})
  useEffect(() => { load() }, [])

  const openCreate = () => { setEditItem(null); setName(''); setShowForm(true) }
  const openEdit = (c) => { setEditItem(c); setName(c.name); setShowForm(true) }

  const handleSave = async () => {
    if (!name.trim()) return flash('Nomni kiriting!', 'error')
    try {
      if (editItem) {
        await categoryApi.update(editItem.id, { name: name.trim() })
        flash('✅ Kategoriya yangilandi!')
      } else {
        await categoryApi.create({ name: name.trim() })
        flash('✅ Kategoriya qo\'shildi!')
      }
      setShowForm(false)
      load()
    } catch (e) { flash(e.response?.data?.detail || 'Xato!', 'error') }
  }

  const handleDelete = async (c) => {
    if (!window.confirm(`"${c.name}" kategoriyasini o'chirasizmi?`)) return
    try {
      await categoryApi.delete(c.id)
      flash('✅ O\'chirildi!')
      load()
    } catch (e) { flash(e.response?.data?.detail || 'Xato!', 'error') }
  }

  return (
    <div style={{ padding: 24 }}>

      <PageHeader
        title="🏷️ Kategoriyalar"
        onRefresh={load}
        action={<button onClick={openCreate} style={C.btnGreen}>+ Yangi kategoriya</button>}
      />

      <Table
        headers={['ID', 'Nomi', 'Amallar']}
        rows={categories.map(c => [
          <span style={{ color: 'var(--text2)', fontSize: 12 }}>{c.id}</span>,
          <strong>{c.name}</strong>,
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => openEdit(c)} style={{ ...C.btnGray, fontSize: 12, padding: '5px 10px' }}>✏️ Tahrirlash</button>
            <button onClick={() => handleDelete(c)} style={{ ...C.btnRed, fontSize: 12, padding: '5px 10px' }}>🗑 O'chirish</button>
          </div>
        ])}
      />

      {showForm && (
        <Modal title={editItem ? '✏️ Kategoriyani tahrirlash' : '+ Yangi kategoriya'} onClose={() => setShowForm(false)}>
          <InpField label="Nomi *" value={name} onChange={setName} required />
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button onClick={handleSave} style={{ ...C.btnGreen, flex: 1 }}>Saqlash</button>
            <button onClick={() => setShowForm(false)} style={{ ...C.btnGray, flex: 1 }}>Bekor</button>
          </div>
        </Modal>
      )}

      {msg && <Toast msg={msg} />}
    </div>
  )
}




// ── Brandlar ────────────────────────────────────────────
function BrandsPage() {
  const [brands, setBrands] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [name, setName] = useState('')
  const [msg, setMsg] = useState(null)
  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 2500) }

  const load = () => brandApi.list().then(r => setBrands(r.data || [])).catch(() => {})
  useEffect(() => { load() }, [])

  const openCreate = () => { setEditItem(null); setName(''); setShowForm(true) }
  const openEdit = (b) => { setEditItem(b); setName(b.name); setShowForm(true) }

  const handleSave = async () => {
    if (!name.trim()) return flash('Nomni kiriting!', 'error')
    try {
      if (editItem) {
        await brandApi.update(editItem.id, { name: name.trim() })
        flash('✅ Brand yangilandi!')
      } else {
        await brandApi.create({ name: name.trim() })
        flash('✅ Brand qo\'shildi!')
      }
      setShowForm(false)
      load()
    } catch (e) { flash(e.response?.data?.detail || 'Xato!', 'error') }
  }

  const handleDelete = async (b) => {
    if (!window.confirm(`"${b.name}" brandini o'chirasizmi?`)) return
    try {
      await brandApi.delete(b.id)
      flash('✅ O\'chirildi!')
      load()
    } catch (e) { flash(e.response?.data?.detail || 'Xato!', 'error') }
  }

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="🏭 Brandlar"
        action={<button onClick={openCreate} style={C.btnGreen}>+ Yangi brand</button>}
      />

      <Table
        headers={['ID', 'Nomi', 'Amallar']}
        rows={brands.map(b => [
          <span style={{ color: 'var(--text2)', fontSize: 12 }}>{b.id}</span>,
          <strong>{b.name}</strong>,
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => openEdit(b)} style={{ ...C.btnGray, fontSize: 12, padding: '5px 10px' }}>✏️ Tahrirlash</button>
            <button onClick={() => handleDelete(b)} style={{ ...C.btnRed, fontSize: 12, padding: '5px 10px' }}>🗑 O'chirish</button>
          </div>
        ])}
      />

      {showForm && (
        <Modal title={editItem ? '✏️ Brandni tahrirlash' : '+ Yangi brand'} onClose={() => setShowForm(false)}>
          <InpField label="Nomi *" value={name} onChange={setName} required />
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button onClick={handleSave} style={{ ...C.btnGreen, flex: 1 }}>Saqlash</button>
            <button onClick={() => setShowForm(false)} style={{ ...C.btnGray, flex: 1 }}>Bekor</button>
          </div>
        </Modal>
      )}

      {msg && <Toast msg={msg} />}
    </div>
  )
}





// ── O'lchov birliklari ──────────────────────────────────
function UnitsPage() {
  const [units, setUnits] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [name, setName] = useState('')
  const [msg, setMsg] = useState(null)
  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 2500) }

  const load = () => unitApi.list().then(r => setUnits(r.data || [])).catch(() => {})
  useEffect(() => { load() }, [])

  const openCreate = () => { setEditItem(null); setName(''); setShowForm(true) }
  const openEdit = (u) => { setEditItem(u); setName(u.name); setShowForm(true) }

  const handleSave = async () => {
    if (!name.trim()) return flash('Nomni kiriting!', 'error')
    try {
      if (editItem) {
        await unitApi.update(editItem.id, { name: name.trim() })
        flash('✅ O\'lchov birligi yangilandi!')
      } else {
        await unitApi.create({ name: name.trim() })
        flash('✅ O\'lchov birligi qo\'shildi!')
      }
      setShowForm(false)
      load()
    } catch (e) { flash(e.response?.data?.detail || 'Xato!', 'error') }
  }

  const handleDelete = async (u) => {
    if (!window.confirm(`"${u.name}" o'lchov birligini o'chirasizmi?`)) return
    try {
      await unitApi.delete(u.id)
      flash('✅ O\'chirildi!')
      load()
    } catch (e) { flash(e.response?.data?.detail || 'Xato!', 'error') }
  }

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="📏 O'lchov birliklari"
        action={<button onClick={openCreate} style={C.btnGreen}>+ Yangi birlik</button>}
      />

      <Table
        headers={['ID', 'Nomi', 'Amallar']}
        rows={units.map(u => [
          <span style={{ color: 'var(--text2)', fontSize: 12 }}>{u.id}</span>,
          <strong>{u.name}</strong>,
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => openEdit(u)} style={{ ...C.btnGray, fontSize: 12, padding: '5px 10px' }}>✏️ Tahrirlash</button>
            <button onClick={() => handleDelete(u)} style={{ ...C.btnRed, fontSize: 12, padding: '5px 10px' }}>🗑 O'chirish</button>
          </div>
        ])}
      />

      {showForm && (
        <Modal title={editItem ? '✏️ Birlikni tahrirlash' : '+ Yangi birlik'} onClose={() => setShowForm(false)}>
          <InpField label="Nomi *" value={name} onChange={setName} required />
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button onClick={handleSave} style={{ ...C.btnGreen, flex: 1 }}>Saqlash</button>
            <button onClick={() => setShowForm(false)} style={{ ...C.btnGray, flex: 1 }}>Bekor</button>
          </div>
        </Modal>
      )}

      {msg && <Toast msg={msg} />}
    </div>
  )
}






// ── Kontragentlar ───────────────────────────────────────
function KontragentsPage() {
  const [kontragents, setKontragents] = useState([])
  const [products, setProducts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', username: '', password: '' })

  const [returnModal, setReturnModal] = useState(null)   // qaysi kontragentga qaytarish
  const [returnForm, setReturnForm] = useState({ product_id: '', quantity: '', note: '' })

  const [payModal, setPayModal] = useState(null)   // qaysi kontragentdan to'lov (ular bizga)
  const [payForm, setPayForm] = useState({ amount: '', naqd_amount: '', karta_amount: '', payment_type: 'naqd', note: '' })

  const [ourPayModal, setOurPayModal] = useState(null)   // biz kontragentga to'laymiz
  const [ourPayForm, setOurPayForm] = useState({ naqd_amount: '', karta_amount: '', payment_type: 'naqd', note: '' })

  const openOurPay = (k) => { setOurPayModal(k); setOurPayForm({ naqd_amount: '', karta_amount: '', payment_type: 'naqd', note: '' }) }

  const handleOurPay = async () => {
    const naqd = parseFloat(ourPayForm.naqd_amount) || 0
    const karta = parseFloat(ourPayForm.karta_amount) || 0
    if (naqd + karta <= 0) return flash('Summani kiriting!', 'error')
    try {
      await kontragentApi.pay(ourPayModal.id, {
        naqd_amount: naqd,
        karta_amount: karta,
        payment_type: ourPayForm.payment_type,
        note: ourPayForm.note || null
      })
      flash('✅ To\'lov qilindi!')
      setOurPayModal(null)
      load()
    } catch (e) { flash(e.response?.data?.detail || 'Xato!', 'error') }
  }



  const [historyModal, setHistoryModal] = useState(null)   // qaysi kontragent tarixi
  const [returnHistory, setReturnHistory] = useState([])

  const openHistory = async (k) => {
    setHistoryModal(k)
    try {
      const r = await kontragentReturnApi.list({ kontragent_id: k.id })
      setReturnHistory(r.data || [])
    } catch (e) { setReturnHistory([]) }
  }

  const [payHistoryModal, setPayHistoryModal] = useState(null)   // "biz to'lagan" tarix
  const [payHistory, setPayHistory] = useState([])

  const openPayHistory = async (k) => {
    setPayHistoryModal(k)
    try {
      const r = await kontragentApi.payments(k.id)
      setPayHistory(r.data || [])
    } catch (e) { setPayHistory([]) }
  }




  const [msg, setMsg] = useState(null)
  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 2500) }

  const load = () => kontragentApi.list().then(r => setKontragents(r.data || [])).catch(() => {})
  useEffect(() => {
    load()
    productApi.list({ page_size: 200 }).then(r => setProducts(r.data.items || [])).catch(() => {})
  }, [])

  const openCreate = () => { setEditItem(null); setForm({ name: '', phone: '', username: '', password: '' }); setShowForm(true) }
  const openEdit = (k) => { setEditItem(k); setForm({ name: k.name, phone: k.phone || '', username: '', password: '' }); setShowForm(true) }

  const handleSave = async () => {
    if (!form.name.trim()) return flash('Nomni kiriting!', 'error')
    try {
      if (editItem) {
        await kontragentApi.update(editItem.id, { name: form.name.trim(), phone: form.phone || null })
        flash('✅ Kontragent yangilandi!')
      } else {
        if (!form.username.trim() || !form.password.trim()) return flash('Username va parol kiriting!', 'error')
        await kontragentApi.create({
          name: form.name.trim(),
          phone: form.phone || null,
          username: form.username.trim(),
          password: form.password
        })
        flash('✅ Kontragent qo\'shildi!')
      }
      setShowForm(false)
      load()
    } catch (e) { flash(e.response?.data?.detail || 'Xato!', 'error') }
  }

  const handleDelete = async (k) => {
    if (!window.confirm(`"${k.name}" kontragentini o'chirasizmi?`)) return
    try {
      await kontragentApi.delete(k.id)
      flash('✅ O\'chirildi!')
      load()
    } catch (e) { flash(e.response?.data?.detail || 'Xato!', 'error') }
  }

  const openReturn = (k) => { setReturnModal(k); setReturnForm({ product_id: '', quantity: '', note: '' }) }

  const handleReturn = async () => {
    if (!returnForm.product_id || !returnForm.quantity) return flash('Mahsulot va sonini kiriting!', 'error')
    try {
      const res = await kontragentReturnApi.create({
        kontragent_id: returnModal.id,
        product_id: parseInt(returnForm.product_id),
        quantity: parseInt(returnForm.quantity),
        note: returnForm.note || null
      })
      flash(`✅ Qaytarildi! Summa: ${fmt(res.data.total_amount)} so'm`)
      setReturnModal(null)
      load()
    } catch (e) { flash(e.response?.data?.detail || 'Xato!', 'error') }
  }

  const openPay = (k) => { setPayModal(k); setPayForm({ amount: String(k.menga_qarzi), naqd_amount: '', karta_amount: '', payment_type: 'naqd', note: '' }) }

  const handlePay = async () => {
    const amount = parseFloat(payForm.amount) || 0
    if (amount <= 0) return flash('Summani kiriting!', 'error')
    const body = { amount, payment_type: payForm.payment_type, note: payForm.note || null }
    if (payForm.payment_type === 'aralash') {
      body.naqd_amount = parseFloat(payForm.naqd_amount) || 0
      body.karta_amount = parseFloat(payForm.karta_amount) || 0
    } else if (payForm.payment_type === 'naqd') {
      body.naqd_amount = amount
      body.karta_amount = 0
    } else {
      body.naqd_amount = 0
      body.karta_amount = amount
    }
    try {
      await kontragentReturnApi.pay(payModal.id, body)
      flash('✅ To\'lov qabul qilindi!')
      setPayModal(null)
      load()
    } catch (e) { flash(e.response?.data?.detail || 'Xato!', 'error') }
  }

  return (
    <div style={{ padding: 24 }}>

      <PageHeader
        title="🏢 Kontragentlar"
        onRefresh={load}
        action={<button onClick={openCreate} style={C.btnGreen}>+ Yangi kontragent</button>}
      />

      <Table
        headers={['ID', 'Nomi', 'Telefon', 'Biz qarzmiz', 'Ular qarzdor', 'Amallar']}
        rows={kontragents.map(k => [
          <span style={{ color: 'var(--text2)', fontSize: 12 }}>{k.id}</span>,
          <strong>{k.name}</strong>,
          k.phone || '—',
          <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: k.jami_qarz > 0 ? 'var(--danger)' : 'var(--accent)' }}>
            {fmt(k.jami_qarz)}
          </span>,
          <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: k.menga_qarzi > 0 ? 'var(--warning)' : 'var(--accent)' }}>
            {fmt(k.menga_qarzi)}
          </span>,


          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button onClick={() => openReturn(k)} style={{ ...C.btnGray, fontSize: 11, padding: '4px 8px' }}>↩ Qaytarish</button>
            <button onClick={() => openHistory(k)} style={{ ...C.btnGray, fontSize: 11, padding: '4px 8px' }}>📜 Tarix</button>



            {k.jami_qarz > 0 && (
              <button onClick={() => openOurPay(k)} style={{ ...C.btnRed, fontSize: 11, padding: '4px 8px' }}>💸 Biz to'laymiz</button>
            )}
            <button onClick={() => openPayHistory(k)} style={{ ...C.btnGray, fontSize: 11, padding: '4px 8px' }}>📋 To'lov tarixi</button>


            {k.menga_qarzi > 0 && (
              <button onClick={() => openPay(k)} style={{ ...C.btnGreen, fontSize: 11, padding: '4px 8px' }}>💰 Ular to'laydi</button>
            )}
            <button onClick={() => openEdit(k)} style={{ ...C.btnGray, fontSize: 11, padding: '4px 8px' }}>✏️</button>
            <button onClick={() => handleDelete(k)} style={{ ...C.btnRed, fontSize: 11, padding: '4px 8px' }}>🗑</button>
          </div>



        ])}
      />

      {/* ── YANGI/TAHRIRLASH MODAL ── */}
      {showForm && (
        <Modal title={editItem ? '✏️ Kontragentni tahrirlash' : '+ Yangi kontragent'} onClose={() => setShowForm(false)}>
          <InpField label="Nomi *" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} required />
          <InpField label="Telefon" value={form.phone} onChange={v => setForm(p => ({ ...p, phone: v }))} />

          {!editItem && (
            <>
              <div style={{ background: 'var(--warning-light)', border: '1px solid var(--warning)', borderRadius: 6, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: 'var(--warning)' }}>
                ⚠️ Kontragent tizimga kirishi uchun login ma'lumotlari kerak
              </div>
              <InpField label="Username *" value={form.username} onChange={v => setForm(p => ({ ...p, username: v }))} required />
              <InpField label="Parol *" value={form.password} onChange={v => setForm(p => ({ ...p, password: v }))} type="password" required />
            </>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button onClick={handleSave} style={{ ...C.btnGreen, flex: 1 }}>Saqlash</button>
            <button onClick={() => setShowForm(false)} style={{ ...C.btnGray, flex: 1 }}>Bekor</button>
          </div>
        </Modal>
      )}

      {/* ── MAHSULOT QAYTARISH MODAL ── */}
      {returnModal && (
        <Modal title={`↩ ${returnModal.name} — Mahsulot qaytarish`} onClose={() => setReturnModal(null)}>
          <SelectField label="Mahsulot *" value={returnForm.product_id}
            onChange={v => setReturnForm(p => ({ ...p, product_id: v }))}
            options={products.map(p => ({ value: p.id, label: p.name }))} required />
          <InpField label="Miqdor *" value={returnForm.quantity} onChange={v => setReturnForm(p => ({ ...p, quantity: v }))} type="number" required />
          <InpField label="Izoh" value={returnForm.note} onChange={v => setReturnForm(p => ({ ...p, note: v }))} />
          <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', marginBottom: 14, fontSize: 12, color: 'var(--text2)' }}>
            ℹ️ Summa avtomatik hisoblanadi — eng oxirgi kelgan partiyadan boshlab (LIFO), asl kirim narxi bo'yicha
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleReturn} style={{ ...C.btnGreen, flex: 1 }}>Qaytarish</button>
            <button onClick={() => setReturnModal(null)} style={{ ...C.btnGray, flex: 1 }}>Bekor</button>
          </div>
        </Modal>
      )}

      {/* ── TO'LOV QABUL QILISH MODAL ── */}
      {payModal && (
        <Modal title={`💰 ${payModal.name} — To'lov qabul qilish`} onClose={() => setPayModal(null)}>
          <div style={{ background: 'var(--surface2)', borderRadius: 6, padding: '10px 14px', marginBottom: 14, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--text2)' }}>Ular qarzdor:</span>
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--warning)' }}>{fmt(payModal.menga_qarzi)} so'm</span>
            </div>
          </div>
          <InpField label="Summa *" value={payForm.amount} onChange={v => setPayForm(p => ({ ...p, amount: v }))} type="number" required />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 12 }}>
            {['naqd', 'karta', 'aralash'].map(tp => (
              <button key={tp} onClick={() => setPayForm(p => ({ ...p, payment_type: tp }))}
                style={{
                  padding: '9px 4px', borderRadius: 6, fontSize: 12, fontWeight: payForm.payment_type === tp ? 700 : 500, cursor: 'pointer',
                  border: `1.5px solid ${payForm.payment_type === tp ? 'var(--accent)' : 'var(--border)'}`,
                  background: payForm.payment_type === tp ? 'var(--accent)' : 'var(--surface2)',
                  color: payForm.payment_type === tp ? '#fff' : 'var(--text)',
                }}>
                {tp === 'naqd' ? '💵 Naqd' : tp === 'karta' ? '💳 Karta' : '💵+💳 Aralash'}
              </button>
            ))}
          </div>
          {payForm.payment_type === 'aralash' && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <InpField label="💵 Naqd" value={payForm.naqd_amount} onChange={v => setPayForm(p => ({ ...p, naqd_amount: v }))} type="number" />
              <InpField label="💳 Karta" value={payForm.karta_amount} onChange={v => setPayForm(p => ({ ...p, karta_amount: v }))} type="number" />
            </div>
          )}
          <InpField label="Izoh" value={payForm.note} onChange={v => setPayForm(p => ({ ...p, note: v }))} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handlePay} style={{ ...C.btnGreen, flex: 1 }}>To'lovni saqlash</button>
            <button onClick={() => setPayModal(null)} style={{ ...C.btnGray, flex: 1 }}>Bekor</button>
          </div>
        </Modal>
      )}

      {/* ── BIZ KONTRAGENTGA TO'LAYMIZ MODAL ── */}
      {ourPayModal && (
        <Modal title={`💸 ${ourPayModal.name} — Biz to'laymiz`} onClose={() => setOurPayModal(null)}>
          <div style={{ background: 'var(--surface2)', borderRadius: 6, padding: '10px 14px', marginBottom: 14, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--text2)' }}>Biz qarzmiz:</span>
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--danger)' }}>{fmt(ourPayModal.jami_qarz)} so'm</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 12 }}>
            {['naqd', 'karta', 'aralash'].map(tp => (
              <button key={tp} onClick={() => setOurPayForm(p => ({ ...p, payment_type: tp }))}
                style={{
                  padding: '9px 4px', borderRadius: 6, fontSize: 12, fontWeight: ourPayForm.payment_type === tp ? 700 : 500, cursor: 'pointer',
                  border: `1.5px solid ${ourPayForm.payment_type === tp ? 'var(--accent)' : 'var(--border)'}`,
                  background: ourPayForm.payment_type === tp ? 'var(--accent)' : 'var(--surface2)',
                  color: ourPayForm.payment_type === tp ? '#fff' : 'var(--text)',
                }}>
                {tp === 'naqd' ? '💵 Naqd' : tp === 'karta' ? '💳 Karta' : '💵+💳 Aralash'}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <InpField label="💵 Naqd" value={ourPayForm.naqd_amount} onChange={v => setOurPayForm(p => ({ ...p, naqd_amount: v }))} type="number" />
            <InpField label="💳 Karta" value={ourPayForm.karta_amount} onChange={v => setOurPayForm(p => ({ ...p, karta_amount: v }))} type="number" />
          </div>
          <InpField label="Izoh" value={ourPayForm.note} onChange={v => setOurPayForm(p => ({ ...p, note: v }))} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleOurPay} style={{ ...C.btnGreen, flex: 1 }}>To'lovni saqlash</button>
            <button onClick={() => setOurPayModal(null)} style={{ ...C.btnGray, flex: 1 }}>Bekor</button>
          </div>
        </Modal>
      )}





      {/* ── BIZ TO'LAGAN TARIX MODAL ── */}
      {payHistoryModal && (
        <Modal title={`📋 ${payHistoryModal.name} — Biz to'lagan tarix`} onClose={() => setPayHistoryModal(null)} width={560}>
          {payHistory.length === 0 ? (
            <div style={{ color: 'var(--text2)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>To'lov tarixi yo'q</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Jami', 'Naqd', 'Karta', 'Izoh', 'Sana'].map(h => (
                    <th key={h} style={{ ...C.th, background: 'var(--surface2)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payHistory.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '9px 12px', fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--danger)' }}>{fmt(p.total_amount)}</td>
                    <td style={{ padding: '9px 12px', fontFamily: 'var(--mono)', color: 'var(--accent)' }}>{fmt(p.naqd_amount)}</td>
                    <td style={{ padding: '9px 12px', fontFamily: 'var(--mono)', color: 'var(--blue)' }}>{fmt(p.karta_amount)}</td>
                    <td style={{ padding: '9px 12px', fontSize: 12, color: 'var(--text2)' }}>{p.note || '—'}</td>
                    <td style={{ padding: '9px 12px', fontSize: 12, color: 'var(--text2)' }}>{p.created_at ? new Date(p.created_at).toLocaleString('uz-UZ') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <button onClick={() => setPayHistoryModal(null)} style={{ ...C.btnGray, width: '100%', marginTop: 16, padding: '10px' }}>Yopish</button>
        </Modal>
      )}





      {/* ── QAYTARISH TARIXI MODAL ── */}
      {historyModal && (
        <Modal title={`📜 ${historyModal.name} — Qaytarish tarixi`} onClose={() => setHistoryModal(null)} width={640}>
          {returnHistory.length === 0 ? (
            <div style={{ color: 'var(--text2)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>Qaytarish tarixi yo'q</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Mahsulot', 'Soni', 'Summa', 'Holat', 'Sana'].map(h => (
                    <th key={h} style={{ ...C.th, background: 'var(--surface2)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {returnHistory.map(r => {
                  const product = products.find(p => p.id === r.product_id)
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '9px 12px', fontSize: 13 }}><strong>{product?.name || `ID: ${r.product_id}`}</strong></td>
                      <td style={{ padding: '9px 12px', fontFamily: 'var(--mono)', fontWeight: 700 }}>{r.quantity}</td>
                      <td style={{ padding: '9px 12px', fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--accent)' }}>{fmt(r.total_amount)}</td>
                      <td style={{ padding: '9px 12px' }}>
                        {r.is_paid
                          ? <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: 'var(--accent-light)', color: 'var(--accent)' }}>✓ To'langan</span>
                          : <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: 'var(--warning-light)', color: 'var(--warning)' }}>Qolgan: {fmt(r.debt_amount)}</span>}
                      </td>
                      <td style={{ padding: '9px 12px', fontSize: 12, color: 'var(--text2)' }}>{new Date(r.created_at).toLocaleString('uz-UZ')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
          <button onClick={() => setHistoryModal(null)} style={{ ...C.btnGray, width: '100%', marginTop: 16, padding: '10px' }}>Yopish</button>
        </Modal>
      )}



      {msg && <Toast msg={msg} />}
    </div>
  )
}







// ── Mahsulotlar ─────────────────────────────────────────
function ProductsPage() {
  const [products, setProducts] = useState({ items: [], total: 0 })
  const [search, setSearch] = useState('')
  const [categories, setCategories] = useState([])
  const [units, setUnits] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)   // null = yangi, obyekt = tahrirlash
  const [form, setForm] = useState({ name: '', barcode: '', description: '', category_id: '', unit_id: '' })
  const [msg, setMsg] = useState(null)
  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 2500) }
  const [historyModal, setHistoryModal] = useState(null)
  const openHistory = async (product) => {
    try {
      const r = await batchApi.history(product.id)
      setHistoryModal({ product, batches: r.data || [] })
    } catch (e) { flash('Tarix yuklanmadi', 'error') }
  }
  const load = (s = '') => productApi.list({ search: s, page_size: 50 }).then(r => setProducts(r.data)).catch(() => {})

  useEffect(() => {
    load()
    categoryApi.list().then(r => setCategories(r.data || [])).catch(() => {})
    unitApi.list().then(r => setUnits(r.data || [])).catch(() => {})
  }, [])

  const openCreate = () => {
    setEditItem(null)
    setForm({ name: '', barcode: '', description: '', category_id: '', unit_id: '' })
    setShowForm(true)
  }

  const openEdit = (p) => {
    setEditItem(p)
    setForm({
      name: p.name,
      barcode: p.barcode || '',
      description: p.description || '',
      category_id: p.category?.id || '',
      unit_id: p.unit?.id || ''
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.category_id || !form.unit_id)
      return flash('Nom, kategoriya va o\'lchov birligini to\'ldiring!', 'error')
    try {
      const body = { ...form, category_id: parseInt(form.category_id), unit_id: parseInt(form.unit_id) }
      if (editItem) {
        await productApi.update(editItem.id, body)
        flash('✅ Mahsulot yangilandi!')
      } else {
        if (!form.barcode) return flash('Barcode kiriting!', 'error')
        await productApi.create(body)
        flash('✅ Mahsulot qo\'shildi!')
      }
      setShowForm(false)
      load(search)
    } catch (e) { flash(e.response?.data?.detail || 'Xato!', 'error') }
  }

  const handleDelete = async (p) => {
    if (!window.confirm(`"${p.name}" mahsulotini o'chirasizmi?`)) return
    try {
      await productApi.delete(p.id)
      flash('✅ O\'chirildi!')
      load(search)
    } catch (e) { flash(e.response?.data?.detail || 'Xato!', 'error') }
  }

  return (
    <div style={{ padding: 24 }}>

      <PageHeader
        title="🛢️ Mahsulotlar"
        onRefresh={() => load(search)}
        action={<button onClick={openCreate} style={C.btnGreen}>+ Yangi mahsulot</button>}
      />

      <div style={{ marginBottom: 16, maxWidth: 300 }}>
        <input type="text" placeholder="Nom yoki barcode..."
          value={search} onChange={e => { setSearch(e.target.value); load(e.target.value) }}
          style={C.input}
        />
      </div>

      <Table
        headers={['ID', 'Nomi', 'Barcode', 'Kategoriya', "O'lchov", 'Amallar']}
        rows={products.items.map(p => [
          <span style={{ color: 'var(--text2)', fontSize: 12 }}>{p.id}</span>,
          <strong>{p.name}</strong>,
          <span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{p.barcode}</span>,
          p.category?.name,
          p.unit?.name,
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => openHistory(p)} style={{ ...C.btnGray, fontSize: 12, padding: '4px 10px' }}>📦 Tarix</button>
            <button onClick={() => openEdit(p)} style={{ ...C.btnGray, fontSize: 12, padding: '4px 10px' }}>✏️</button>
            <button onClick={() => handleDelete(p)} style={{ ...C.btnRed, fontSize: 12, padding: '4px 10px' }}>🗑</button>
          </div>
        ])}
      />

      {showForm && (
        <Modal title={editItem ? '✏️ Mahsulotni tahrirlash' : 'Yangi mahsulot'} onClose={() => setShowForm(false)}>
          <InpField label="Nomi *" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} required />
          <InpField label={editItem ? "Barcode" : "Barcode *"} value={form.barcode} onChange={v => setForm(p => ({ ...p, barcode: v }))} required={!editItem} />
          <InpField label="Tavsif" value={form.description} onChange={v => setForm(p => ({ ...p, description: v }))} />
          <SelectField label="Kategoriya *" value={form.category_id} onChange={v => setForm(p => ({ ...p, category_id: v }))}
            options={categories.map(c => ({ value: c.id, label: c.name }))} required />
          <SelectField label="O'lchov birligi *" value={form.unit_id} onChange={v => setForm(p => ({ ...p, unit_id: v }))}
            options={units.map(u => ({ value: u.id, label: u.name }))} required />
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button onClick={handleSave} style={{ ...C.btnGreen, flex: 1 }}>Saqlash</button>
            <button onClick={() => setShowForm(false)} style={{ ...C.btnGray, flex: 1 }}>Bekor</button>
          </div>
        </Modal>
      )}

      {/* ── PARTIYA TARIXI MODAL ── */}
      {historyModal && (
        <Modal title={`${historyModal.product.name} — Partiya tarixi`} onClose={() => setHistoryModal(null)} width={850}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Kirim', 'Sana', 'Soni', 'Tan narx', 'Sotuv narx', 'Jami', 'Holat'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text2)', borderBottom: '1px solid var(--border)', background: 'var(--surface2)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {historyModal.batches.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 20, textAlign: 'center', color: 'var(--text2)' }}>Partiya yo'q</td></tr>
              )}
              {historyModal.batches.map(b => {
                const statusMeta = {
                  aktiv: { label: '✓ Aktiv', color: 'var(--accent)', bg: 'var(--accent-light)' },
                  kutmoqda: { label: '⏳ Kutmoqda', color: 'var(--warning)', bg: 'var(--warning-light)' },
                  tugagan: { label: 'Tugagan', color: 'var(--text2)', bg: 'var(--surface2)' },
                }[b.status] || { label: b.status, color: 'var(--text2)', bg: 'var(--surface2)' }
                return (
                  <tr key={b.id} style={{ borderBottom: '1px solid var(--border)', opacity: b.status === 'tugagan' ? 0.6 : 1 }}>
                    <td style={{ padding: '9px 10px', fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 12 }}>{b.income_number || `#${b.income_id}`}</td>
                    <td style={{ padding: '9px 10px', fontSize: 12, color: 'var(--text2)' }}>{b.date}</td>
                    <td style={{ padding: '9px 10px', fontFamily: 'var(--mono)', fontWeight: 700 }}>{b.quantity}</td>
                    <td style={{ padding: '9px 10px', fontFamily: 'var(--mono)', fontSize: 12 }}>{fmt(b.price_som)}</td>
                    <td style={{ padding: '9px 10px', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>{fmt(b.sale_price)}</td>
                    <td style={{ padding: '9px 10px', fontFamily: 'var(--mono)', fontWeight: 700 }}>{fmt(b.total_som)}</td>
                    <td style={{ padding: '9px 10px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: statusMeta.bg, color: statusMeta.color }}>{statusMeta.label}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Modal>
      )}

      {msg && <Toast msg={msg} />}
    </div>
  )
}




// ── Transferlar ─────────────────────────────────────────
function TransfersPage() {
  const [transfers, setTransfers] = useState([])
  const [selected, setSelected] = useState(null)
  const [msg, setMsg] = useState(null)
  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 2500) }
  const load = () => transferApi.list().then(r => setTransfers(r.data || [])).catch(() => {})
  useEffect(() => { load() }, [])

  const statusMap = {
    yuborildi: { bg: 'var(--warning-light)', c: 'var(--warning)', label: '⏳ Kutilmoqda' },
    qabul: { bg: 'var(--accent-light)', c: 'var(--accent)', label: '✓ Qabul qilindi' },
    rad: { bg: 'var(--danger-light)', c: 'var(--danger)', label: '✕ Rad etilgan' },
  }

  return (
    <div style={{ padding: 24 }}>
      <PageHeader title="➡️ Transferlar" onRefresh={load} />
      <Table
        headers={['ID', 'Mahsulotlar', 'Jami yuborilgan', 'Status', 'Yubordi', 'Kassirga', 'Sana']}
        rows={transfers.map(tr => {
          const s = statusMap[tr.status] || {}
          const totalSent = (tr.items || []).reduce((sum, i) => sum + (i.sent_quantity || 0), 0)
          return [
            <span style={{ fontFamily: 'var(--mono)', color: 'var(--text2)' }}>#{tr.id}</span>,
            <button onClick={() => setSelected(tr)} style={{ background: 'none', color: 'var(--blue)', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
              {tr.items?.length || 0} tur mahsulot
            </button>,
            <span style={{ fontFamily: 'var(--mono)', fontWeight: 700 }}>{totalSent} ta</span>,
            <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: s.bg, color: s.c }}>{s.label}</span>,
            tr.sender?.username || '—',
            tr.kassir?.username || '—',
            <span style={{ fontSize: 12, color: 'var(--text2)' }}>{tr.created_at ? new Date(tr.created_at).toLocaleString('uz-UZ') : '—'}</span>
          ]
        })}
      />

      {/* ── TRANSFER DETAIL MODAL ── */}
      {selected && (
        <Modal title={`➡️ Transfer #${selected.id}`} onClose={() => setSelected(null)} width={640}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius)', padding: '10px 12px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>Yubordi</div>
              <div style={{ fontWeight: 700 }}>{selected.sender?.username || '—'}</div>
            </div>
            <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius)', padding: '10px 12px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>Status</div>
              <div style={{ fontWeight: 700, color: statusMap[selected.status]?.c }}>{statusMap[selected.status]?.label}</div>
            </div>
          </div>

          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>📦 Mahsulotlar</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
            <thead>
              <tr>{['Mahsulot', 'Yuborilgan', 'Qabul qilingan'].map(h => <th key={h} style={{ ...C.th, background: 'var(--surface2)' }}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {selected.items?.map(it => (
                <tr key={it.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 12px', fontSize: 13 }}><strong>{it.batch?.product?.name || `batch ${it.batch_id}`}</strong></td>
                  <td style={{ padding: '8px 12px', fontFamily: 'var(--mono)', fontWeight: 700 }}>{it.sent_quantity}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'var(--mono)', color: 'var(--text2)' }}>{it.confirmed_quantity ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <button onClick={() => setSelected(null)} style={{ ...C.btnGray, width: '100%', padding: 10 }}>Yopish</button>
        </Modal>
      )}

      {msg && <Toast msg={msg} />}
    </div>
  )
}





// ── Kassa uchun stock (faqat ko'rish, admin nazorati uchun) ──
function AdminKassaStockPage() {
  const [rows, setRows] = useState([])
  const [query, setQuery] = useState('')

  const load = () => batchApi.kassaStockView().then(r => setRows(r.data || [])).catch(() => {})
  useEffect(() => { load() }, [])

  const filtered = query.trim()
    ? rows.filter(s => (s.product_name || '').toLowerCase().includes(query.toLowerCase()) || (s.product_barcode || '').includes(query))
    : rows

  return (
    <div style={{ padding: 24 }}>
      <PageHeader title="🏪 Kassa uchun stock" onRefresh={load} />

      <div style={{ marginBottom: 16, maxWidth: 300 }}>
        <input type="text" placeholder="🔍 Mahsulot nomi yoki barcode..."
          value={query} onChange={e => setQuery(e.target.value)}
          style={C.input} />
      </div>

      <Table
        headers={['Mahsulot', 'Barcode', 'Holat', 'Omborda', 'Kassada', 'Sotuv narxi']}
        rows={filtered.map(s => [
          <strong>{s.product_name}</strong>,
          <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text2)' }}>{s.product_barcode}</span>,
          <span style={{
            padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: 11,
            background: s.is_current ? 'var(--accent-light)' : 'var(--warning-light)',
            color: s.is_current ? 'var(--accent)' : 'var(--warning)'
          }}>
            {s.is_current ? '✓ Aktiv' : '⏳ Navbatda'}
          </span>,
          <span style={{ padding: '3px 10px', borderRadius: 4, background: s.ombor_soni > 0 ? 'var(--accent-light)' : 'var(--danger-light)', color: s.ombor_soni > 0 ? 'var(--accent)' : 'var(--danger)', fontWeight: 700, fontFamily: 'var(--mono)' }}>
            {s.ombor_soni}
          </span>,
          <span style={{ fontFamily: 'var(--mono)', color: 'var(--blue)', fontWeight: 700 }}>{s.kassa_soni}</span>,
          <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--accent)' }}>{fmt(s.sotuv_narx)}</span>
        ])}
      />
    </div>
  )
}




function Collapsible({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ marginBottom: 24, border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'var(--surface2)', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 600, color: 'var(--text)'
        }}>
        <span>{title}</span>
        <span style={{ fontSize: 13, color: 'var(--text2)' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && <div style={{ padding: 16, background: 'var(--surface)' }}>{children}</div>}
    </div>
  )
}







// ── Admin Sefi (Xazina) ─────────────────────────────────
function SafePage() {
  const [balance, setBalance] = useState(null)
  const [transactions, setTransactions] = useState({ items: [], total: 0 })

  const [filters, setFilters] = useState({ date_from: '', date_to: '', note_search: '', direction: '', onlyBuxgalter: false })

  const [showForm, setShowForm] = useState(false)
  const [formDirection, setFormDirection] = useState('kirim')
  const [form, setForm] = useState({ naqd_amount: '', karta_amount: '', note: '' })
  const [msg, setMsg] = useState(null)
  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 2500) }


  // Ishchi maoshi
  const [users, setUsers] = useState([])
  const [workersSummary, setWorkersSummary] = useState([])
  const [showSalaryForm, setShowSalaryForm] = useState(false)
  const [salaryForm, setSalaryForm] = useState({ user_id: '', naqd_amount: '', karta_amount: '', note: '' })
  const [workerHistoryModal, setWorkerHistoryModal] = useState(null)
  const [workerHistory, setWorkerHistory] = useState([])

  // Buxgalterlardan tushgan yig'imlar
  const [collections, setCollections] = useState([])
  const loadCollections = () => {
    safeApi.list({ page_size: 100, direction: 'kirim' }).then(r => {
      const list = (r.data.items || []).filter(t => t.related_user_id)
      setCollections(list)
    }).catch(() => {})
  }



  const loadBalance = () => safeApi.balance().then(r => setBalance(r.data)).catch(() => {})
  const loadTransactions = () => {
    const params = { page_size: 100 }
    if (filters.date_from) params.date_from = filters.date_from
    if (filters.date_to) params.date_to = filters.date_to
    if (filters.note_search) params.note_search = filters.note_search
    if (filters.direction) params.direction = filters.direction
    safeApi.list(params).then(r => setTransactions(r.data)).catch(() => {})
  }
  const loadWorkersSummary = () => safeApi.workersSummary().then(r => setWorkersSummary(r.data || [])).catch(() => {})


  useEffect(() => {
    loadBalance(); loadTransactions(); loadWorkersSummary(); loadCollections()
    userApi.list().then(r => setUsers(r.data || [])).catch(() => {})
  }, [])



  useEffect(() => { loadTransactions() }, [filters])

  const openForm = (direction) => {
    setFormDirection(direction)
    setForm({ naqd_amount: '', karta_amount: '', note: '' })
    setShowForm(true)
  }

  const handleSave = async () => {
    const naqd = parseFloat(form.naqd_amount) || 0
    const karta = parseFloat(form.karta_amount) || 0
    if (naqd + karta <= 0) return flash('Summani kiriting!', 'error')
    try {
      await safeApi.create({
        direction: formDirection,
        naqd_amount: naqd,
        karta_amount: karta,
        note: form.note || null
      })
      flash(formDirection === 'kirim' ? '✅ Kirim qo\'shildi!' : '✅ Xarajat yozildi!')
      setShowForm(false)
      loadBalance()
      loadTransactions()
    } catch (e) { flash(e.response?.data?.detail || 'Xato!', 'error') }
  }

  const openSalaryForm = () => {
    setSalaryForm({ user_id: '', naqd_amount: '', karta_amount: '', note: '' })
    setShowSalaryForm(true)
  }

  const handleSalarySave = async () => {
    const naqd = parseFloat(salaryForm.naqd_amount) || 0
    const karta = parseFloat(salaryForm.karta_amount) || 0
    if (!salaryForm.user_id) return flash('Xodimni tanlang!', 'error')
    if (naqd + karta <= 0) return flash('Summani kiriting!', 'error')
    try {
      await safeApi.create({
        direction: 'chiqim',
        naqd_amount: naqd,
        karta_amount: karta,
        note: salaryForm.note || null,
        related_user_id: parseInt(salaryForm.user_id)
      })
      flash('✅ Maosh yozildi!')
      setShowSalaryForm(false)
      loadBalance()
      loadTransactions()
      loadWorkersSummary()
    } catch (e) { flash(e.response?.data?.detail || 'Xato!', 'error') }
  }

  const openWorkerHistory = async (w) => {
    setWorkerHistoryModal(w)
    try {
      const r = await safeApi.list({ related_user_id: w.user_id, page_size: 100 })
      setWorkerHistory(r.data.items || [])
    } catch (e) { setWorkerHistory([]) }
  }








  return (
    <div style={{ padding: 24 }}>
      <PageHeader title="🗄️ Admin Sefi" onRefresh={() => { loadBalance(); loadTransactions(); loadWorkersSummary(); loadCollections() }} />

      {/* Balans kartochkalari */}
      {balance && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: '💵 Naqd balans', value: balance.naqd_balans, color: 'var(--accent)' },
            { label: '💳 Karta balans', value: balance.karta_balans, color: 'var(--blue)' },
            { label: '💰 Jami balans', value: balance.jami_balans, color: 'var(--text)' },
          ].map(c => (
            <div key={c.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 22px', borderLeft: `4px solid ${c.color}` }}>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>{c.label}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 24, fontWeight: 800, color: c.color }}>{fmt(c.value)}</div>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>so'm</div>
            </div>
          ))}
        </div>
      )}




      {/* Amallar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button onClick={() => openForm('kirim')} style={C.btnGreen}>+ Pul qo'shish</button>
        <button onClick={() => openForm('chiqim')} style={C.btnRed}>− Xarajat qilish</button>
        <button onClick={openSalaryForm} style={{ ...C.btnGray, borderColor: 'var(--warning)', color: 'var(--warning)' }}>💰 Ishchi maoshi</button>
      </div>





      {/* Ishchilar bo'yicha xarajatlar */}
      {workersSummary.length > 0 && (
        <Collapsible title="👨‍💼 Ishchilarga berilgan xarajatlar">
          <Table
            headers={['Xodim', 'Jami xarajat', 'Amallar']}
            rows={workersSummary.map(w => [
              <strong>{w.full_name || w.username}</strong>,
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--warning)' }}>{fmt(w.jami_xarajat)}</span>,
              <button onClick={() => openWorkerHistory(w)} style={{ ...C.btnGray, fontSize: 12, padding: '4px 10px' }}>📜 Tarix</button>
            ])}
          />
        </Collapsible>
      )}

      {/* Buxgalterlardan tushgan yig'imlar */}
      {collections.length > 0 && (
        <Collapsible title="💼 Buxgalterlardan tushgan yig'imlar">
          <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 12, display: 'flex', gap: 24 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>Jami yig'ilgan</div>
              <div style={{ fontFamily: 'var(--mono)', fontWeight: 800, fontSize: 18, color: 'var(--accent)' }}>
                {fmt(collections.reduce((s, c) => s + c.amount, 0))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>Yig'ish soni</div>
              <div style={{ fontFamily: 'var(--mono)', fontWeight: 800, fontSize: 18 }}>{collections.length} ta</div>
            </div>
          </div>
          <Table
            headers={['Kim yig\'di', 'Naqd', 'Karta', 'Jami', 'Izoh', 'Sana']}
            rows={collections.map(c => [
              <strong>{users.find(u => u.id === c.related_user_id)?.profile?.full_name || users.find(u => u.id === c.related_user_id)?.username || `ID: ${c.related_user_id}`}</strong>,
              <span style={{ fontFamily: 'var(--mono)' }}>{fmt(c.naqd_amount)}</span>,
              <span style={{ fontFamily: 'var(--mono)' }}>{fmt(c.karta_amount)}</span>,
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--accent)' }}>{fmt(c.amount)}</span>,
              <span style={{ fontSize: 12 }}>{c.note || '—'}</span>,
              <span style={{ fontSize: 12, color: 'var(--text2)' }}>{new Date(c.created_at).toLocaleString('uz-UZ')}</span>
            ])}
          />
        </Collapsible>
      )}





      <Collapsible title="📋 Barcha tranzaksiyalar">
        {/* Filtrlar */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <input type="date" value={filters.date_from} onChange={e => setFilters(p => ({ ...p, date_from: e.target.value }))} style={{ ...C.input, maxWidth: 160 }} />
          <input type="date" value={filters.date_to} onChange={e => setFilters(p => ({ ...p, date_to: e.target.value }))} style={{ ...C.input, maxWidth: 160 }} />
          <input type="text" placeholder="🔍 Izoh bo'yicha qidirish..." value={filters.note_search} onChange={e => setFilters(p => ({ ...p, note_search: e.target.value }))} style={{ ...C.input, maxWidth: 240 }} />
          <select value={filters.direction} onChange={e => setFilters(p => ({ ...p, direction: e.target.value }))} style={{ ...C.input, maxWidth: 160 }}>
            <option value="">Hammasi</option>
            <option value="kirim">Faqat kirim</option>
            <option value="chiqim">Faqat chiqim</option>
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '0 8px', cursor: 'pointer' }}>
            <input type="checkbox" checked={filters.onlyBuxgalter}
              onChange={e => setFilters(p => ({ ...p, onlyBuxgalter: e.target.checked }))}
              style={{ accentColor: 'var(--accent)' }} />
            Faqat buxgalter yig'imlari
          </label>
          {(filters.date_from || filters.date_to || filters.note_search || filters.direction || filters.onlyBuxgalter) && (
            <button onClick={() => setFilters({ date_from: '', date_to: '', note_search: '', direction: '', onlyBuxgalter: false })} style={C.btnGray}>Tozalash</button>
          )}
        </div>

        <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 10 }}>
          Jami: {(filters.onlyBuxgalter ? transactions.items.filter(t => t.related_user_id) : transactions.items).length} ta tranzaksiya
        </div>

        <Table
          headers={['ID', 'Yo\'nalish', 'Naqd', 'Karta', 'Jami', 'Izoh', 'Sana']}
          rows={(filters.onlyBuxgalter ? transactions.items.filter(t => t.related_user_id) : transactions.items).map(t => [
            <span style={{ color: 'var(--text2)', fontSize: 12 }}>{t.id}</span>,
            <span style={{
              padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
              background: t.direction === 'kirim' ? 'var(--accent-light)' : 'var(--danger-light)',
              color: t.direction === 'kirim' ? 'var(--accent)' : 'var(--danger)'
            }}>
              {t.direction === 'kirim' ? '↓ Kirim' : '↑ Chiqim'}
            </span>,
            <span style={{ fontFamily: 'var(--mono)' }}>{t.naqd_amount > 0 ? fmt(t.naqd_amount) : '—'}</span>,
            <span style={{ fontFamily: 'var(--mono)' }}>{t.karta_amount > 0 ? fmt(t.karta_amount) : '—'}</span>,
            <span style={{ fontFamily: 'var(--mono)', fontWeight: 700 }}>{fmt(t.amount)}</span>,
            <span style={{ fontSize: 12 }}>{t.note || '—'}</span>,
            <span style={{ fontSize: 12, color: 'var(--text2)' }}>{new Date(t.created_at).toLocaleString('uz-UZ')}</span>
          ])}
        />
      </Collapsible>




      {showForm && (
        <Modal title={formDirection === 'kirim' ? '+ Pul qo\'shish' : '− Xarajat qilish'} onClose={() => setShowForm(false)}>
          <InpField label="💵 Naqd summa" value={form.naqd_amount} onChange={v => setForm(p => ({ ...p, naqd_amount: v }))} type="number" />
          <InpField label="💳 Karta summa" value={form.karta_amount} onChange={v => setForm(p => ({ ...p, karta_amount: v }))} type="number" />
          <InpField label="Izoh (masalan: ehson, svet, boshlang'ich kirim)" value={form.note} onChange={v => setForm(p => ({ ...p, note: v }))} />
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button onClick={handleSave} style={{ ...C.btnGreen, flex: 1 }}>Saqlash</button>
            <button onClick={() => setShowForm(false)} style={{ ...C.btnGray, flex: 1 }}>Bekor</button>
          </div>
        </Modal>
      )}

      {/* ── ISHCHI MAOSHI MODAL ── */}
      {showSalaryForm && (
        <Modal title="💰 Ishchi maoshi" onClose={() => setShowSalaryForm(false)}>
          <SelectField label="Xodim *" value={salaryForm.user_id}
            onChange={v => setSalaryForm(p => ({ ...p, user_id: v }))}
            options={users.map(u => ({ value: u.id, label: u.profile?.full_name || u.username }))} required />
          <InpField label="💵 Naqd summa" value={salaryForm.naqd_amount} onChange={v => setSalaryForm(p => ({ ...p, naqd_amount: v }))} type="number" />
          <InpField label="💳 Karta summa" value={salaryForm.karta_amount} onChange={v => setSalaryForm(p => ({ ...p, karta_amount: v }))} type="number" />
          <InpField label="Izoh (masalan: 4 500 000 asosiy + 400 000 bonus)" value={salaryForm.note} onChange={v => setSalaryForm(p => ({ ...p, note: v }))} />
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button onClick={handleSalarySave} style={{ ...C.btnGreen, flex: 1 }}>Saqlash</button>
            <button onClick={() => setShowSalaryForm(false)} style={{ ...C.btnGray, flex: 1 }}>Bekor</button>
          </div>
        </Modal>
      )}

      {/* ── ISHCHI TARIXI MODAL ── */}
      {workerHistoryModal && (
        <Modal title={`📜 ${workerHistoryModal.full_name || workerHistoryModal.username} — Maosh tarixi`} onClose={() => setWorkerHistoryModal(null)} width={560}>
          {workerHistory.length === 0 ? (
            <div style={{ color: 'var(--text2)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>Tarix yo'q</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Naqd', 'Karta', 'Jami', 'Izoh', 'Sana'].map(h => (
                    <th key={h} style={{ ...C.th, background: 'var(--surface2)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {workerHistory.map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '9px 12px', fontFamily: 'var(--mono)' }}>{t.naqd_amount > 0 ? fmt(t.naqd_amount) : '—'}</td>
                    <td style={{ padding: '9px 12px', fontFamily: 'var(--mono)' }}>{t.karta_amount > 0 ? fmt(t.karta_amount) : '—'}</td>
                    <td style={{ padding: '9px 12px', fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--warning)' }}>{fmt(t.amount)}</td>
                    <td style={{ padding: '9px 12px', fontSize: 12 }}>{t.note || '—'}</td>
                    <td style={{ padding: '9px 12px', fontSize: 12, color: 'var(--text2)' }}>{new Date(t.created_at).toLocaleString('uz-UZ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <button onClick={() => setWorkerHistoryModal(null)} style={{ ...C.btnGray, width: '100%', marginTop: 16, padding: '10px' }}>Yopish</button>
        </Modal>
      )}

      {msg && <Toast msg={msg} />}
    </div>
  )
}









// ── Qarzlar ─────────────────────────────────────────────
function DebtsPage() {
  const [debts, setDebts] = useState([])
  const [incomeDebts, setIncomeDebts] = useState([])
  const [msg, setMsg] = useState(null)
  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 2500) }

  const [payModal, setPayModal] = useState(null)     // to'lov qilinayotgan mijoz (guruhlangan obyekt)
  const [historyModal, setHistoryModal] = useState(null)  // tarix ko'rsatilayotgan mijoz
  const [payAmount, setPayAmount] = useState('')
  const [payType, setPayType] = useState('naqd')
  const [payNaqd, setPayNaqd] = useState('')
  const [payKarta, setPayKarta] = useState('')

  const load = () => {
    clientDebtApi.list().then(r => setDebts(r.data || [])).catch(() => {})
    paymentApi.debts().then(r => setIncomeDebts(r.data || [])).catch(() => {})
  }

  useEffect(() => { load() }, [])

  // Mijoz bo'yicha guruhlash — bitta mijoz uchun jami/to'langan/qolgan
  const groupedByClient = Object.values(
    debts.reduce((acc, d) => {
      const cid = d.client_id
      if (!acc[cid]) {
        acc[cid] = { client: d.client, total: 0, paid: 0, remaining: 0, items: [] }
      }
      acc[cid].total += d.total_amount
      acc[cid].paid += d.paid_amount
      acc[cid].remaining += d.debt_amount
      acc[cid].items.push(d)
      return acc
    }, {})
  ).filter(g => g.remaining > 0)

  const openPayModal = (group) => {
    setPayModal(group)
    setPayAmount(String(group.remaining))
    setPayType('naqd')
    setPayNaqd('')
    setPayKarta('')
  }

  const handlePay = async () => {
    const amount = parseFloat(payAmount) || 0
    if (amount <= 0) return flash('Summani kiriting!', 'error')
    if (amount > payModal.remaining) return flash('Summa qarzdan ko\'p bo\'lishi mumkin emas!', 'error')

    const body = { amount, payment_type: payType }
    if (payType === 'aralash') {
      body.naqd_amount = parseFloat(payNaqd) || 0
      body.karta_amount = parseFloat(payKarta) || 0
      if (body.naqd_amount + body.karta_amount !== amount) {
        return flash('Naqd + Karta yig\'indisi summaga teng bo\'lishi kerak!', 'error')
      }
    }

    try {
      await clientDebtApi.payTotal(payModal.client.id, body)
      flash('✅ To\'lov qabul qilindi!')
      setPayModal(null)
      load()
    } catch (e) { flash(e.response?.data?.detail || 'Xato!', 'error') }
  }

  return (
    <div style={{ padding: 24 }}>
      <PageHeader title="💳 Qarzlar" onRefresh={load} />

      <h3 style={{ marginBottom: 12, fontSize: 15, fontWeight: 600 }}>Mijoz qarzlari</h3>
      <Table
        headers={['Mijoz', 'Jami', "To'langan", 'Qolgan', 'Holat', 'Amallar']}
        rows={groupedByClient.map(g => [
          g.client?.full_name || '—',
          <span style={{ fontFamily: 'var(--mono)' }}>{fmt(g.total)}</span>,
          <span style={{ fontFamily: 'var(--mono)', color: 'var(--accent)' }}>{fmt(g.paid)}</span>,
          <span style={{ fontFamily: 'var(--mono)', color: 'var(--danger)', fontWeight: 700 }}>{fmt(g.remaining)}</span>,
          <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: 'var(--danger-light)', color: 'var(--danger)' }}>
            Qarz
          </span>,
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setHistoryModal(g)} style={{ ...C.btnGray, fontSize: 12, padding: '5px 10px' }}>📜 Tarix</button>
            <button onClick={() => openPayModal(g)} style={{ ...C.btnGreen, fontSize: 12, padding: '5px 10px' }}>💰 To'lov</button>
          </div>
        ])}
      />

      <h3 style={{ marginBottom: 12, fontSize: 15, fontWeight: 600, marginTop: 28 }}>Kontragent qarzlari</h3>
      <Table
        headers={['Kirim', "Jami summa", "To'langan", 'Qarz', 'Holat']}
        rows={incomeDebts.map(d => [
          <span style={{ fontFamily: 'var(--mono)', fontWeight: 700 }}>{d.income_id}</span>,
          <span style={{ fontFamily: 'var(--mono)' }}>{fmt(d.total_amount)}</span>,
          <span style={{ fontFamily: 'var(--mono)', color: 'var(--accent)' }}>{fmt(d.naqd_amount + d.karta_amount)}</span>,
          <span style={{ fontFamily: 'var(--mono)', color: 'var(--danger)', fontWeight: 700 }}>{fmt(d.debt_amount)}</span>,
          <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: d.is_paid ? 'var(--accent-light)' : 'var(--danger-light)', color: d.is_paid ? 'var(--accent)' : 'var(--danger)' }}>
            {d.is_paid ? "To'langan" : "Qarz"}
          </span>
        ])}
      />

      {/* ── TO'LOV MODAL ── */}
      {payModal && (
        <Modal title={`💰 ${payModal.client?.full_name} — To'lov`} onClose={() => setPayModal(null)} width={420}>
          <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 14, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
              <span style={{ color: 'var(--text2)' }}>Jami qarz:</span>
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 700 }}>{fmt(payModal.total)} so'm</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--text2)' }}>Qolgan qarz:</span>
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--danger)' }}>{fmt(payModal.remaining)} so'm</span>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>To'lov summasi *</label>
            <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)}
              max={payModal.remaining} style={{ ...C.input, fontFamily: 'var(--mono)', fontWeight: 700 }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 12 }}>
            {['naqd', 'karta', 'aralash'].map(tp => (
              <button key={tp} onClick={() => setPayType(tp)}
                style={{
                  padding: '9px 4px', borderRadius: 6, fontSize: 12, fontWeight: payType === tp ? 700 : 500, cursor: 'pointer',
                  border: `1.5px solid ${payType === tp ? 'var(--accent)' : 'var(--border)'}`,
                  background: payType === tp ? 'var(--accent)' : 'var(--surface2)',
                  color: payType === tp ? '#fff' : 'var(--text)',
                }}>
                {tp === 'naqd' ? '💵 Naqd' : tp === 'karta' ? '💳 Karta' : '💵+💳 Aralash'}
              </button>
            ))}
          </div>

          {payType === 'aralash' && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: 'var(--text2)', display: 'block', marginBottom: 3 }}>💵 Naqd:</label>
                <input type="number" value={payNaqd} onChange={e => setPayNaqd(e.target.value)}
                  placeholder="0" style={{ ...C.input, fontFamily: 'var(--mono)' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: 'var(--text2)', display: 'block', marginBottom: 3 }}>💳 Karta:</label>
                <input type="number" value={payKarta} onChange={e => setPayKarta(e.target.value)}
                  placeholder="0" style={{ ...C.input, fontFamily: 'var(--mono)' }} />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handlePay} style={{ ...C.btnGreen, flex: 1 }}>✓ To'lovni saqlash</button>
            <button onClick={() => setPayModal(null)} style={{ ...C.btnGray, flex: 1 }}>Bekor</button>
          </div>
        </Modal>
      )}

      {/* ── TARIX MODAL ── */}
      {historyModal && (
        <Modal title={`📜 ${historyModal.client?.full_name} — Qarzlar tarixi`} onClose={() => setHistoryModal(null)} width={480}>
          {historyModal.items
            .slice()
            .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
            .map(d => (
              <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 4px', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Chek #{d.sale_id}</div>
                  <div style={{ fontSize: 11, color: 'var(--text2)' }}>
                    {d.created_at ? new Date(d.created_at).toLocaleString('uz-UZ') : '—'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: d.is_paid ? 'var(--accent)' : 'var(--danger)' }}>
                    {fmt(d.total_amount)} so'm
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text2)' }}>
                    {d.is_paid ? "✓ To'liq to'langan" : `Qolgan: ${fmt(d.debt_amount)}`}
                  </div>
                </div>
              </div>
            ))}
          <button onClick={() => setHistoryModal(null)} style={{ ...C.btnGray, width: '100%', marginTop: 16, padding: '10px' }}>Yopish</button>
        </Modal>
      )}

      {msg && <Toast msg={msg} />}
    </div>
  )
}



// ── Xodimlar ────────────────────────────────────────────

const PERMISSION_GROUPS = [
  { label: 'Sotuv', keys: ['sotish', 'narx_ozgartirish', 'mahsulot_chegirma', 'umumiy_chegirma', 'qaytarish'] },
  { label: 'Savatcha', keys: ['savatdan_ochirish', 'savatchani_tozalash'] },
  { label: 'Mahsulotlar', keys: ['mahsulot_royxati', 'mahsulot_qidirish', 'narx_yorligi'] },
  { label: 'Mijozlar', keys: ['mijoz_royxati', 'mijoz_tarixi', 'mijoz_tahrirlash', 'mijoz_ochirish'] },
  { label: 'Cheklar', keys: ['check_royxati', 'check_korish'] },
  { label: 'Ombor', keys: ['ombor_royxati', 'ombor_qidirish', 'mahsulot_kiritish', 'kassaga_yuborish', 'ombor_tasdiqlash'] },
  { label: 'Mijoz eslatma', keys: ['eslatma_qoshish', 'yaqin_sanalar'] },
  { label: 'Hisobot', keys: ['hisobot_korish'] },
  { label: 'Boshqaruv', keys: ['xodim_boshqarish'] },
]

const PERMISSION_LABELS = {
  sotish: 'Sotish', narx_ozgartirish: 'Narx o\'zgartirish', mahsulot_chegirma: 'Mahsulot chegirma', umumiy_chegirma: 'Umumiy chegirma', qaytarish: 'Qaytarish',
  savatdan_ochirish: 'Savatdan o\'chirish', savatchani_tozalash: 'Savatchani tozalash',
  mahsulot_royxati: 'Mahsulot ro\'yxati', mahsulot_qidirish: 'Mahsulot qidirish', narx_yorligi: 'Narx yorlig\'i',
  mijoz_royxati: 'Mijoz ro\'yxati', mijoz_tarixi: 'Mijoz tarixi', mijoz_tahrirlash: 'Mijoz tahrirlash', mijoz_ochirish: 'Mijoz o\'chirish',
  check_royxati: 'Chek ro\'yxati', check_korish: 'Chek ko\'rish',
  ombor_royxati: 'Ombor ro\'yxati', ombor_qidirish: 'Ombor qidirish', mahsulot_kiritish: 'Mahsulot kiritish', kassaga_yuborish: 'Kassaga yuborish', ombor_tasdiqlash: 'Ombor tasdiqlash',
  eslatma_qoshish: 'Eslatma qo\'shish', yaqin_sanalar: 'Yaqin sanalar',
  hisobot_korish: 'Hisobot ko\'rish',
  xodim_boshqarish: 'Xodim boshqarish',
}

function PermissionEditor({ perms, onChange }) {
  const toggle = (key) => onChange({ ...perms, [key]: !perms[key] })
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 14, maxHeight: 320, overflowY: 'auto' }}>
      {PERMISSION_GROUPS.map(g => (
        <div key={g.label} style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', marginBottom: 5, textTransform: 'uppercase' }}>{g.label}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {g.keys.map(k => (
              <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '3px 6px', borderRadius: 4, cursor: 'pointer', background: perms[k] ? 'var(--accent-light)' : 'transparent' }}>
                <input type="checkbox" checked={!!perms[k]} onChange={() => toggle(k)} style={{ accentColor: 'var(--accent)' }} />
                <span style={{ color: perms[k] ? 'var(--accent)' : 'var(--text)' }}>{PERMISSION_LABELS[k]}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function UsersPage() {
  const [users, setUsers] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editUser, setEditUser] = useState(null)   // null = yangi, obyekt = tahrirlash


  const [form, setForm] = useState({ username: '', password: '', role: 'kassir', full_name: '', phone: '' })
  const [msg, setMsg] = useState(null)


  const { user } = useAuthStore()
  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 2500) }

  const load = () => userApi.list().then(r => setUsers(r.data || [])).catch(() => {})
  useEffect(() => { load() }, [])

  const canManage = (target) => {
    // Hech kim superadminni tahrirlay olmaydi (o'zidan boshqa)
    if (target.role === 'superadmin' && target.username !== user?.username) return false
    // Admin — superadmin va boshqa adminni boshqara olmaydi
    if (user?.role === 'admin' && (target.role === 'superadmin' || target.role === 'admin')) return false
    return true
  }

  const roles = [
    { value: 'kassir', label: 'Kassir' },
    { value: 'skladchi', label: 'Omborchi' },
    { value: 'operator', label: 'Operator' },
    { value: 'buxgalter', label: 'Buxgalter' },
  ]
  if (user?.role === 'superadmin') roles.unshift({ value: 'admin', label: 'Admin' })


  const openCreate = () => {
    setEditUser(null)
    setForm({ username: '', password: '', role: 'kassir', full_name: '', phone: '' })
    setShowForm(true)
  }

  const openEdit = (u) => {
    setEditUser(u)
    setForm({ username: u.username, password: '', role: u.role, full_name: u.profile?.full_name || '', phone: u.profile?.phone || '' })
    setShowForm(true)
  }

  const handleSave = async () => {
    try {
      if (editUser) {
        // Faqat username/parol/profil yangilanadi (rol o'zgarmaydi — backend ham buni qo'llab-quvvatlamaydi)
        const body = { username: form.username, full_name: form.full_name, phone: form.phone }
        if (form.password) body.password = form.password
        await userApi.update(editUser.id, body)
        flash('✅ Xodim yangilandi!')
      } else {
        if (!form.username || !form.password) return flash('Username va parol kiriting!', 'error')
        await userApi.create(form)
        flash('✅ Xodim qo\'shildi! (Standart ruxsatlar avtomatik o\'rnatildi)')
      }
      setShowForm(false)
      load()
    } catch (e) { flash(e.response?.data?.detail || 'Xato!', 'error') }
  }

  const handleDelete = async (u) => {
    if (!window.confirm(`"${u.username}"ni o'chirasizmi?`)) return
    try {
      await userApi.delete(u.id)
      flash('✅ O\'chirildi!')
      load()
    } catch (e) { flash(e.response?.data?.detail || 'Xato!', 'error') }
  }

  const roleColors = {
    superadmin: { bg: '#fef3c7', c: '#92400e' },
    admin: { bg: 'var(--blue-light)', c: 'var(--blue)' },
    kassir: { bg: 'var(--accent-light)', c: 'var(--accent)' },
    skladchi: { bg: 'var(--warning-light)', c: 'var(--warning)' },
    operator: { bg: 'var(--surface2)', c: 'var(--text2)' },
    kontragent: { bg: 'var(--danger-light)', c: 'var(--danger)' },
  }

  return (
    <div style={{ padding: 24 }}>

      <PageHeader
        title="👨‍💼 Xodimlar"
        onRefresh={load}
        action={<button onClick={openCreate} style={C.btnGreen}>+ Yangi xodim</button>}
      />

      <Table
        headers={['ID', 'Username', 'Rol', 'Ism', 'Telefon', 'Holat', 'Amallar']}
        rows={users.map(u => {
          const rc = roleColors[u.role] || { bg: 'var(--surface2)', c: 'var(--text2)' }
          const editable = canManage(u)
          return [
            <span style={{ color: 'var(--text2)', fontSize: 12 }}>{u.id}</span>,
            <strong>{u.username}</strong>,
            <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: rc.bg, color: rc.c, textTransform: 'capitalize' }}>{u.role}</span>,
            u.profile?.full_name || '—',
            u.profile?.phone || '—',
            <span style={{ fontSize: 12, color: u.is_active ? 'var(--accent)' : 'var(--danger)', fontWeight: 600 }}>
              {u.is_active ? '✓ Aktiv' : '✗ Bloklangan'}
            </span>,
            editable ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => openEdit(u)} style={{ ...C.btnGray, fontSize: 12, padding: '5px 10px' }}>✏️ Tahrirlash</button>
                {u.role !== 'superadmin' && (
                  <button onClick={() => handleDelete(u)} style={{ ...C.btnRed, fontSize: 12, padding: '5px 10px' }}>🗑</button>
                )}
              </div>
            ) : <span style={{ fontSize: 11, color: 'var(--text2)' }}>—</span>
          ]
        })}
      />

      {showForm && (
        <Modal title={editUser ? `✏️ ${editUser.username} — Tahrirlash` : 'Yangi xodim'} onClose={() => setShowForm(false)} width={520}>
          <InpField label="Username *" value={form.username} onChange={v => setForm(p => ({ ...p, username: v }))} required />
          <InpField label={editUser ? "Yangi parol (bo'sh qoldirsa o'zgarmaydi)" : "Parol *"} value={form.password} onChange={v => setForm(p => ({ ...p, password: v }))} type="password" required={!editUser} />
          {!editUser && (
            <SelectField label="Rol *" value={form.role} onChange={v => setForm(p => ({ ...p, role: v }))} options={roles} required />
          )}


          <InpField label="Ism familiya" value={form.full_name} onChange={v => setForm(p => ({ ...p, full_name: v }))} />
          <InpField label="Telefon" value={form.phone} onChange={v => setForm(p => ({ ...p, phone: v }))} />

          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>


            <button onClick={handleSave} style={{ ...C.btnGreen, flex: 1 }}>Saqlash</button>
            <button onClick={() => setShowForm(false)} style={{ ...C.btnGray, flex: 1 }}>Bekor</button>
          </div>
        </Modal>
      )}
      {msg && <Toast msg={msg} />}
    </div>
  )
}






// ── Main ────────────────────────────────────────────────
export default function AdminPage() {
  return (
    <Layout>


      <Routes>
        <Route path="/" element={<StatsPage />} />
        <Route path="/sales" element={<SalesPage />} />
        <Route path="/incomes" element={<IncomesPage />} />
        <Route path="/clients" element={<ClientsPage />} />

        <Route path="/products" element={<ProductsPage />} />

        <Route path="/kassa-stock" element={<AdminKassaStockPage />} />
        <Route path="/safe" element={<SafePage />} />
        <Route path="/categories" element={<CategoriesPage />} />


        <Route path="/brands" element={<BrandsPage />} />
        <Route path="/units" element={<UnitsPage />} />
        <Route path="/kontragents" element={<KontragentsPage />} />

        <Route path="/transfers" element={<TransfersPage />} />

        <Route path="/debts" element={<DebtsPage />} />
        <Route path="/users" element={<UsersPage />} />
      </Routes>


    </Layout>
  )
}
