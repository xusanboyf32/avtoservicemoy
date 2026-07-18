import React, { useEffect, useState } from 'react'
import { useAuthStore, useThemeStore } from '../store'
import { kontragentApi } from '../api'

const fmt = n => Math.round(n || 0).toLocaleString('uz-UZ')

const S = {
  page: { minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' },
  top: { background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  body: { padding: 24, maxWidth: 1000, margin: '0 auto' },
  card: { background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: 20, marginBottom: 20 },
  th: { padding: '10px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text2)', borderBottom: '1px solid var(--border)', background: 'var(--surface2)' },
  td: { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid var(--border)' },
  mono: { fontFamily: 'var(--mono)', fontWeight: 700 },
}

export default function KontragentPage() {
  const { user, logout } = useAuthStore()
  const { dark, toggle } = useThemeStore()
  const [debts, setDebts] = useState([])
  const [payments, setPayments] = useState([])
  const [jamiQarz, setJamiQarz] = useState(0)

  const load = async () => {
    try {
      const [d, p] = await Promise.all([
        kontragentApi.myDebts(),
        kontragentApi.myPayments(),
      ])
      setDebts(d.data || [])
      setPayments(p.data || [])
      const qarz = (d.data || []).reduce((s, x) => s + (x.debt_amount || 0), 0)
      setJamiQarz(qarz)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div style={S.page}>
      <div style={S.top}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--accent)' }}>🏢 Kontragent</div>
          <div style={{ fontSize: 13, color: 'var(--text2)' }}>{user?.username}</div>
        </div>



        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={toggle} style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', cursor: 'pointer' }}>
            {dark ? '☀️' : '🌙'}
          </button>
          <button onClick={load} title="Yangilash" style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', cursor: 'pointer' }}>
            🔄
          </button>
          <button onClick={logout} style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--danger)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
            Chiqish
          </button>
        </div>



      </div>

      <div style={S.body}>
        {/* Jami qarz */}
        <div style={{ ...S.card, textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 6 }}>Do'kon sizga qarzdor</div>
          <div style={{ ...S.mono, fontSize: 32, color: jamiQarz > 0 ? 'var(--danger)' : 'var(--accent)' }}>
            {fmt(jamiQarz)} so'm
          </div>
        </div>

        {/* Kirim tarixi */}
        <div style={S.card}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>📦 Yetkazib berganlarim</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Kirim', 'Jami summa', "To'langan", 'Qarz', 'Holat'].map(h => <th key={h} style={S.th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {debts.length === 0 && (
                <tr><td colSpan={5} style={{ ...S.td, textAlign: 'center', color: 'var(--text2)' }}>Ma'lumot yo'q</td></tr>
              )}
              {debts.map(d => {
                const tolangan = (d.naqd_amount || 0) + (d.karta_amount || 0)
                return (
                  <tr key={d.id}>
                    <td style={{ ...S.td, ...S.mono }}>KR-{String(d.income_id).padStart(4, '0')}</td>
                    <td style={{ ...S.td, ...S.mono }}>{fmt(d.total_amount)}</td>
                    <td style={{ ...S.td, ...S.mono, color: 'var(--accent)' }}>{fmt(tolangan)}</td>
                    <td style={{ ...S.td, ...S.mono, color: d.debt_amount > 0 ? 'var(--danger)' : 'var(--accent)' }}>{fmt(d.debt_amount)}</td>
                    <td style={S.td}>
                      {d.is_paid
                        ? <span style={{ color: 'var(--accent)', fontWeight: 600 }}>✓ To'langan</span>
                        : <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Qarz</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* To'lov tarixi */}
        <div style={S.card}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>💰 Menga to'langan to'lovlar</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Sana', 'Jami', 'Naqd', 'Karta', 'Izoh'].map(h => <th key={h} style={S.th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 && (
                <tr><td colSpan={5} style={{ ...S.td, textAlign: 'center', color: 'var(--text2)' }}>To'lov yo'q</td></tr>
              )}
              {payments.map(p => (
                <tr key={p.id}>
                  <td style={S.td}>{(p.created_at || '').slice(0, 10)}</td>
                  <td style={{ ...S.td, ...S.mono }}>{fmt(p.total_amount)}</td>
                  <td style={{ ...S.td, ...S.mono, color: 'var(--accent)' }}>{fmt(p.naqd_amount)}</td>
                  <td style={{ ...S.td, ...S.mono, color: 'var(--blue)' }}>{fmt(p.karta_amount)}</td>
                  <td style={{ ...S.td, color: 'var(--text2)', fontSize: 12 }}>{p.note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
