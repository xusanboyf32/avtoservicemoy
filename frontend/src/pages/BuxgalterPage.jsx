import React, { useState, useEffect } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import { useAuthStore, useThemeStore } from '../store'
import { cashRegisterApi, safeApi } from '../api'

const fmt = n => Math.round(n || 0).toLocaleString('uz-UZ')

const S = {
  th: { padding: '10px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text2)', borderBottom: '1px solid var(--border)', background: 'var(--surface2)' },
  td: { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid var(--border)' },
  mono: { fontFamily: 'var(--mono)', fontWeight: 700 },
  card: { background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: 20, marginBottom: 20 },
  input: { padding: '8px 10px', border: '1.5px solid var(--border)', borderRadius: 8, background: 'var(--surface2)', color: 'var(--text)', fontSize: 13 },
  btnGray: { padding: '8px 12px', borderRadius: 8, background: 'var(--surface2)', color: 'var(--text)', fontSize: 13, border: '1px solid var(--border)', cursor: 'pointer' },
}

// ── Layout ────────────────────────────────────────────
function Layout({ children }) {
  const { user, logout } = useAuthStore()
  const { dark, toggle } = useThemeStore()

  const navItems = [
    { to: '/buxgalter', label: 'Kassa holati', icon: '💰', end: true },
    { to: '/buxgalter/history', label: "Yig'ish tarixi", icon: '📜' },
  ]

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)' }}>
      <div style={{ width: 220, background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--accent)' }}>💼 Buxgalter</div>
          <div style={{ marginTop: 8, padding: '5px 8px', borderRadius: 6, background: 'var(--surface2)', fontSize: 12 }}>
            👤 <b>{user?.username}</b>
          </div>
        </div>

        <nav style={{ padding: '8px 8px', flex: 1, overflowY: 'auto' }}>
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '8px 10px', borderRadius: 8,
                marginBottom: 2, textDecoration: 'none', fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                background: isActive ? 'var(--accent-light)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--text)',
              })}
            >
              <span style={{ fontSize: 15 }}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: '10px 8px', borderTop: '1px solid var(--border)', display: 'flex', gap: 5 }}>
          <button onClick={toggle} style={{ ...S.btnGray, padding: '7px 10px', fontSize: 14 }}>{dark ? '☀️' : '🌙'}</button>
          <button onClick={logout} style={{ flex: 1, padding: '7px', borderRadius: 6, background: 'var(--danger-light)', color: 'var(--danger)', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
            ↩ Chiqish
          </button>
        </div>
      </div>


      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>{children}</div>
    </div>
  )
}

function PageHeader({ title, onRefresh }) {
  const [spinning, setSpinning] = useState(false)
  const [showToast, setShowToast] = useState(false)

  const handleRefresh = () => {
    setSpinning(true)
    onRefresh()
    setShowToast(true)
    setTimeout(() => setSpinning(false), 600)
    setTimeout(() => setShowToast(false), 2000)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{title}</h2>
      {onRefresh && (
        <button onClick={handleRefresh} title="Yangilash"
          style={{
            ...S.btnGray, padding: '5px 9px', fontSize: 14,
            transform: spinning ? 'rotate(360deg)' : 'rotate(0deg)',
            transition: 'transform 0.6s ease'
          }}>
          🔄
        </button>
      )}
      {showToast && (
        <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>✅ Yangilandi</span>
      )}
    </div>
  )
}



// ── Kassa holati (asosiy) ───────────────────────────────
function DashboardPage() {
  const { user } = useAuthStore()
  const [status, setStatus] = useState(null)
  const [recent, setRecent] = useState([])
  const [msg, setMsg] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 2500) }

  const loadStatus = () => cashRegisterApi.status().then(r => setStatus(r.data)).catch(() => {})




  const loadRecent = () => safeApi.list({ page_size: 30, direction: 'kirim' }).then(r => {
    // Faqat "yig'ish" orqali kelgan (related_user_id bor) kirimlarni filtrlaymiz
    const collected = (r.data.items || []).filter(t => t.related_user_id)
    setRecent(collected)
  }).catch(() => {})



  useEffect(() => { loadStatus(); loadRecent() }, [])

  const handleCollect = async () => {
    if (!status || (status.oylik_naqd + status.oylik_karta) <= 0) return flash("Yig'ib olinadigan pul yo'q!", 'error')
    if (!confirming) { setConfirming(true); setTimeout(() => setConfirming(false), 4000); return }
    try {
      const res = await cashRegisterApi.collect({ note: `Yig'ildi: ${user?.username}` })
      flash(`✅ Yig'ildi: ${fmt(res.data.collected_total)} so'm (Naqd: ${fmt(res.data.collected_naqd)}, Karta: ${fmt(res.data.collected_karta)})`)
      setConfirming(false)
      loadStatus()
      loadRecent()
    } catch (e) { flash(e.response?.data?.detail || 'Xato!', 'error') }
  }

  const totalOylik = status ? status.oylik_naqd + status.oylik_karta : 0

  return (
    <div>
      <PageHeader title="💰 Kassa holati" onRefresh={() => { loadStatus(); loadRecent() }} />
      {status && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div style={S.card}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>📅 Bugungi (hali yig'ilmagan)</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: 'var(--text2)', fontSize: 13 }}>💵 Naqd:</span>
                <span style={{ ...S.mono, fontSize: 16, color: 'var(--accent)' }}>{fmt(status.kunlik_naqd)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text2)', fontSize: 13 }}>💳 Karta:</span>
                <span style={{ ...S.mono, fontSize: 16, color: 'var(--blue)' }}>{fmt(status.kunlik_karta)}</span>
              </div>
            </div>

            <div style={S.card}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>📆 Yig'ilmagan jami (bir necha kun)</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: 'var(--text2)', fontSize: 13 }}>💵 Naqd:</span>
                <span style={{ ...S.mono, fontSize: 16, color: 'var(--accent)' }}>{fmt(status.oylik_naqd)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text2)', fontSize: 13 }}>💳 Karta:</span>
                <span style={{ ...S.mono, fontSize: 16, color: 'var(--blue)' }}>{fmt(status.oylik_karta)}</span>
              </div>
            </div>
          </div>

          <div style={{ ...S.card, textAlign: 'center', border: '2px solid var(--accent)' }}>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 6 }}>Jami yig'ib olinadigan summa</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 32, fontWeight: 800, color: 'var(--accent)', marginBottom: 16 }}>
              {fmt(totalOylik)} so'm
            </div>
            <button onClick={handleCollect} disabled={totalOylik <= 0}
              style={{
                padding: '12px 20px', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer', border: 'none',
                background: confirming ? 'var(--danger)' : 'var(--accent)', color: '#fff', opacity: totalOylik <= 0 ? 0.5 : 1
              }}>
              {confirming ? "⚠️ Tasdiqlash uchun yana bosing!" : "💰 Kassadan yig'ish"}
            </button>
          </div>
        </>
      )}

      {/* Oxirgi yig'ishlar (qisqa ro'yxat) */}
      <div style={S.card}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>📋 Oxirgi yig'ishlar</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>{['Naqd', 'Karta', 'Jami', 'Izoh', 'Sana'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {recent.length === 0 && (
              <tr><td colSpan={5} style={{ ...S.td, textAlign: 'center', color: 'var(--text2)' }}>Hali yig'ish bo'lmagan</td></tr>
            )}
            {recent.map(t => (
              <tr key={t.id}>
                <td style={{ ...S.td, ...S.mono }}>{fmt(t.naqd_amount)}</td>
                <td style={{ ...S.td, ...S.mono }}>{fmt(t.karta_amount)}</td>
                <td style={{ ...S.td, ...S.mono, fontWeight: 700, color: 'var(--accent)' }}>{fmt(t.amount)}</td>
                <td style={{ ...S.td, fontSize: 12, color: 'var(--text2)' }}>{t.note || '—'}</td>
                <td style={{ ...S.td, fontSize: 12, color: 'var(--text2)' }}>{new Date(t.created_at).toLocaleString('uz-UZ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {msg && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', padding: '9px 20px', borderRadius: 8, background: msg.type === 'error' ? 'var(--danger)' : 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600, zIndex: 1000 }}>
          {msg.text}
        </div>
      )}
    </div>
  )
}

// ── Yig'ish tarixi (to'liq, sana filtri bilan) ─────────
function HistoryPage() {
  const [transactions, setTransactions] = useState({ items: [], total: 0 })
  const [filters, setFilters] = useState({ date_from: '', date_to: '' })



  const load = () => {
    const params = { page_size: 100, direction: 'kirim' }
    if (filters.date_from) params.date_from = filters.date_from
    if (filters.date_to) params.date_to = filters.date_to
    safeApi.list(params).then(r => {
      const collected = (r.data.items || []).filter(t => t.related_user_id)
      setTransactions({ ...r.data, items: collected, total: collected.length })
    }).catch(() => {})
  }



  useEffect(() => { load() }, [filters])

  const totalNaqd = transactions.items.reduce((s, t) => s + (t.naqd_amount || 0), 0)
  const totalKarta = transactions.items.reduce((s, t) => s + (t.karta_amount || 0), 0)

  return (
    <div>
      <PageHeader title="📜 Yig'ish tarixi" onRefresh={load} />
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="date" value={filters.date_from} onChange={e => setFilters(p => ({ ...p, date_from: e.target.value }))} style={{ ...S.input, maxWidth: 160 }} />
        <span style={{ color: 'var(--text2)' }}>—</span>
        <input type="date" value={filters.date_to} onChange={e => setFilters(p => ({ ...p, date_to: e.target.value }))} style={{ ...S.input, maxWidth: 160 }} />
        {(filters.date_from || filters.date_to) && (
          <button onClick={() => setFilters({ date_from: '', date_to: '' })} style={S.btnGray}>Tozalash</button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
        {[
          { label: '💵 Jami naqd', value: totalNaqd, color: 'var(--accent)' },
          { label: '💳 Jami karta', value: totalKarta, color: 'var(--blue)' },
          { label: '💰 Umumiy', value: totalNaqd + totalKarta, color: 'var(--text)' },
        ].map(c => (
          <div key={c.label} style={{ ...S.card, marginBottom: 0, borderLeft: `4px solid ${c.color}` }}>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 800, color: c.color }}>{fmt(c.value)}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 10 }}>Jami: {transactions.total} ta yig'ish</div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>{['Naqd', 'Karta', 'Jami', 'Izoh', 'Sana'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {transactions.items.length === 0 && (
              <tr><td colSpan={5} style={{ ...S.td, textAlign: 'center', color: 'var(--text2)', padding: 32 }}>Yig'ish yo'q</td></tr>
            )}
            {transactions.items.map(t => (
              <tr key={t.id}>
                <td style={{ ...S.td, ...S.mono }}>{fmt(t.naqd_amount)}</td>
                <td style={{ ...S.td, ...S.mono }}>{fmt(t.karta_amount)}</td>
                <td style={{ ...S.td, ...S.mono, fontWeight: 700, color: 'var(--accent)' }}>{fmt(t.amount)}</td>
                <td style={{ ...S.td, fontSize: 12, color: 'var(--text2)' }}>{t.note || '—'}</td>
                <td style={{ ...S.td, fontSize: 12, color: 'var(--text2)' }}>{new Date(t.created_at).toLocaleString('uz-UZ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────
export default function BuxgalterPage() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/history" element={<HistoryPage />} />
      </Routes>
    </Layout>
  )
}


