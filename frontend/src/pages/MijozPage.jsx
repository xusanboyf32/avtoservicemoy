import React, { useEffect, useState } from 'react'
import { useAuthStore } from '../store'
import { clientPortalApi, API_BASE } from '../api'

const fmt = (n) => (Math.round(n || 0)).toLocaleString('ru-RU') + " so'm"
const fmtNum = (n) => (n || 0).toLocaleString('ru-RU')
const fmtDate = (s) => s ? new Date(s).toLocaleDateString('ru-RU') : '—'

const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { key: 'profile', label: 'Profile', icon: '👤' },
  { key: 'products', label: 'Mahsulotlar', icon: '🛢️' },
  { key: 'debts', label: 'Qarzlar', icon: '💳' },
]

export default function MijozPage() {
  const { logout } = useAuthStore()
  const [me, setMe] = useState(null)
  const [debtData, setDebtData] = useState(null)
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [oilRecords, setOilRecords] = useState([])
  const [activeCat, setActiveCat] = useState('all')
  const [section, setSection] = useState('dashboard')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [meRes, debtRes, catRes, prodRes, oilRes] = await Promise.all([
          clientPortalApi.me(),
          clientPortalApi.debts(),
          clientPortalApi.categories(),
          clientPortalApi.products(),
          clientPortalApi.oilRecords(),
        ])
        setMe(meRes.data)
        setDebtData(debtRes.data)
        setCategories(catRes.data)
        setProducts(prodRes.data)
        setOilRecords(oilRes.data)
      } catch (err) {
        localStorage.removeItem('client_token')
        logout()
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('client_token')
    logout()
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--text2)' }}>
        Yuklanmoqda...
      </div>
    )
  }

  const qolgan = debtData?.jami_qolgan || 0

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      {/* ═══ CHAP SIDEBAR ═══ */}
      <div style={{ width: 230, background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>🛢️</span>
          <span style={{ fontWeight: 800, fontSize: 17, color: 'var(--accent)' }}>MUROD OIL</span>
        </div>

        {/* Nav */}
        <nav style={{ padding: '12px 10px', flex: 1 }}>
          {NAV.map(item => {
            const active = section === item.key
            return (
              <button key={item.key} onClick={() => setSection(item.key)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 14px', borderRadius: 'var(--radius)', marginBottom: 4,
                  border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 14,
                  fontWeight: active ? 700 : 500,
                  background: active ? 'var(--accent-light)' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--text)',
                  transition: 'all .15s',
                }}>
                <span style={{ fontSize: 17 }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Pastda mijoz ismi */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text2)' }}>
          👤 {me?.full_name}
        </div>
      </div>

      {/* ═══ ASOSIY QISM ═══ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Yuqori panel — chiqish o'ng tomonda */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 24px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0
        }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>
            {NAV.find(n => n.key === section)?.label}
          </div>
          <button onClick={handleLogout} style={{
            padding: '8px 16px', borderRadius: 'var(--radius)',
            background: 'var(--danger-light)', color: 'var(--danger)',
            border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600
          }}>
            ↩ Chiqish
          </button>
        </div>

        {/* Kontent */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {section === 'dashboard' && <DashboardSection me={me} qolgan={qolgan} oilRecords={oilRecords} productCount={products.length} onGo={setSection} />}
          {section === 'profile' && <ProfileSection me={me} oilRecords={oilRecords} />}
          {section === 'products' && <ProductsSection products={products} categories={categories} activeCat={activeCat} setActiveCat={setActiveCat} />}
          {section === 'debts' && <DebtsSection debtData={debtData} />}
        </div>
      </div>
    </div>
  )
}

// ═══════════════ DASHBOARD ═══════════════
function DashboardSection({ me, qolgan, oilRecords, productCount, onGo }) {
  const lastOil = oilRecords[0]
  return (
    <div style={{ maxWidth: 800 }}>
      {/* Salom */}
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Assalomu alaykum, {me?.full_name}! 👋</div>
      <div style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 20 }}>
        {me?.car_model || 'Mashina'} {me?.car_number ? `· ${me.car_number}` : ''}
      </div>

      {/* Kartalar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
        {/* Qarz */}
        <div onClick={() => onGo('debts')} style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
          padding: 20, cursor: 'pointer', borderLeft: `4px solid ${qolgan > 0 ? 'var(--danger)' : 'var(--accent)'}`
        }}>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 6 }}>💳 Jami qarzingiz</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: qolgan > 0 ? 'var(--danger)' : 'var(--accent)' }}>
            {fmt(qolgan)}
          </div>
          <div style={{ fontSize: 12, color: qolgan > 0 ? 'var(--danger)' : 'var(--accent)', marginTop: 4 }}>
            {qolgan > 0 ? 'To\'lash kerak' : '✅ Qarzingiz yo\'q'}
          </div>
        </div>

        {/* Oxirgi moy */}
        <div onClick={() => onGo('profile')} style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
          padding: 20, cursor: 'pointer', borderLeft: '4px solid var(--blue)'
        }}>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 6 }}>🛢️ Oxirgi moy almashtirish</div>
          {lastOil ? (
            <>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{lastOil.oil_brand || '—'} {lastOil.oil_type || ''}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
                {fmtDate(lastOil.sana)} · {lastOil.mileage ? fmtNum(lastOil.mileage) + ' km' : ''}
              </div>
            </>
          ) : <div style={{ fontSize: 14, color: 'var(--text2)' }}>Ma'lumot yo'q</div>}
        </div>

        {/* Mahsulotlar */}
        <div onClick={() => onGo('products')} style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
          padding: 20, cursor: 'pointer', borderLeft: '4px solid var(--accent)'
        }}>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 6 }}>🛢️ Mahsulotlar</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{productCount} ta</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>Narxlarni ko'rish →</div>
        </div>
      </div>

      {/* Keyingi moy eslatmasi */}
      {lastOil?.next_date && (
        <div style={{
          background: 'var(--warning-light)', border: '1px solid var(--warning)', borderRadius: 'var(--radius-lg)',
          padding: '16px 20px', color: 'var(--warning)', fontSize: 14, fontWeight: 600
        }}>
          📅 Keyingi moy almashtirish sanasi: {fmtDate(lastOil.next_date)}
        </div>
      )}
    </div>
  )
}

// ═══════════════ PROFILE ═══════════════
function ProfileSection({ me, oilRecords }) {
  return (
    <div style={{ maxWidth: 800 }}>
      {/* Shaxsiy ma'lumot */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>👤</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{me?.full_name}</div>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>{me?.phone || '—'}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          <InfoBox label="Mashina modeli" value={me?.car_model || '—'} />
          <InfoBox label="Mashina raqami" value={me?.car_number || '—'} />
          <InfoBox label="Telefon" value={me?.phone || '—'} />
        </div>
      </div>

      {/* Probeg tarixi */}
      <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 14 }}>🛢️ Moy almashtirish tarixi (probeg)</div>

      {oilRecords.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 30, textAlign: 'center', color: 'var(--text2)' }}>
          Hali probeg yozuvi yo'q
        </div>
      ) : (
        oilRecords.map((r, idx) => (
          <div key={r.id} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: 18, marginBottom: 12,
            borderLeft: idx === 0 ? '4px solid var(--accent)' : '4px solid var(--border)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>
                {r.oil_brand || '—'} {r.oil_type || ''}
                {idx === 0 && <span style={{ marginLeft: 8, fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'var(--accent-light)', color: 'var(--accent)', fontWeight: 700 }}>Oxirgi</span>}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text2)' }}>{fmtDate(r.sana)}</div>
            </div>

            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13, color: 'var(--text2)', marginBottom: 10 }}>
              {r.mileage != null && <span>📍 Probeg: <b style={{ color: 'var(--text)' }}>{fmtNum(r.mileage)} km</b></span>}
              {r.next_date && <span style={{ color: 'var(--accent)', fontWeight: 600 }}>📅 Keyingi: {fmtDate(r.next_date)}</span>}
              {r.transmission && <span>⚙️ {r.transmission}</span>}
              {r.master_name && <span>👨‍🔧 {r.master_name}</span>}
            </div>

            {/* Filtrlar */}
            {r.filtrlar && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[
                  r.filtrlar.oil_filter && 'Moy filtri',
                  r.filtrlar.air_filter && 'Havo filtri',
                  r.filtrlar.salon_filter && 'Salon filtri',
                  r.filtrlar.spark_plug && 'Shamlar',
                  r.filtrlar.fuel_filter && "Yoqilg'i filtri",
                  r.filtrlar.pampers && 'Pampers',
                ].filter(Boolean).map(f => (
                  <span key={f} style={{ padding: '3px 9px', background: 'var(--accent-light)', color: 'var(--accent)', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>✓ {f}</span>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}

// ═══════════════ MAHSULOTLAR ═══════════════
function ProductsSection({ products, categories, activeCat, setActiveCat }) {
  const filtered = activeCat === 'all' ? products : products.filter(p => p.category_id === activeCat)

  return (
    <div style={{ maxWidth: 1000 }}>
      {/* Kategoriya filter */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        <button onClick={() => setActiveCat('all')} style={chip(activeCat === 'all')}>Hammasi</button>
        {categories.map(c => (
          <button key={c.id} onClick={() => setActiveCat(c.id)} style={chip(activeCat === c.id)}>{c.name}</button>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 16 }}>
        {filtered.map(p => (
          <div key={p.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 12, textAlign: 'center' }}>
            <div style={{ width: '100%', height: 140, borderRadius: 8, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 10 }}>
              {p.image_url
                ? <img src={`${API_BASE}${p.image_url}`} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 34, opacity: 0.25 }}>🛢️</span>}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, minHeight: 38, marginBottom: 4 }}>{p.name}</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--accent)' }}>{fmt(p.price)}</div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text2)', padding: 40 }}>Mahsulot yo'q</div>
      )}
    </div>
  )
}

// ═══════════════ QARZLAR ═══════════════
function DebtsSection({ debtData }) {
  return (
    <div style={{ maxWidth: 800 }}>
      {/* Umumiy hisob */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        <SumCard label="Jami qarz" value={fmt(debtData?.jami_qarz)} color="var(--text)" />
        <SumCard label="To'langan" value={fmt(debtData?.jami_tolangan)} color="var(--accent)" />
        <SumCard label="Qolgan" value={fmt(debtData?.jami_qolgan)} color="var(--danger)" />
      </div>

      {(!debtData?.debts || debtData.debts.length === 0) ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 40, textAlign: 'center', color: 'var(--text2)' }}>
          ✅ Qarz tarixingiz yo'q
        </div>
      ) : (
        debtData.debts.map(d => (
          <div key={d.id} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: 18, marginBottom: 12,
            borderLeft: `4px solid ${d.is_paid ? 'var(--accent)' : 'var(--danger)'}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>{fmtDate(d.sana)}</span>
              <span style={{
                fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 4,
                background: d.is_paid ? 'var(--accent-light)' : 'var(--danger-light)',
                color: d.is_paid ? 'var(--accent)' : 'var(--danger)'
              }}>
                {d.is_paid ? "✓ To'langan" : 'Qarz bor'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 14, marginBottom: d.payments?.length ? 12 : 0 }}>
              <span>Summa: <b>{fmt(d.total_amount)}</b></span>
              <span style={{ color: 'var(--accent)' }}>To'langan: <b>{fmt(d.paid_amount)}</b></span>
              <span style={{ color: 'var(--danger)' }}>Qolgan: <b>{fmt(d.debt_amount)}</b></span>
            </div>

            {/* To'lovlar tarixi */}
            {d.payments?.length > 0 && (
              <div style={{ borderTop: '1px dashed var(--border)', paddingTop: 10 }}>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>To'lovlar:</div>
                {d.payments.map((p, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span style={{ color: 'var(--text2)' }}>{fmtDate(p.sana)} · {p.payment_type}</span>
                    <span style={{ color: 'var(--accent)', fontWeight: 600 }}>+{fmt(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}

// ═══════════════ Kichik komponentlar ═══════════════
function InfoBox({ label, value }) {
  return (
    <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius)', padding: '12px 14px' }}>
      <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 600 }}>{value}</div>
    </div>
  )
}

function SumCard({ label, value, color }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18, textAlign: 'center' }}>
      <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
    </div>
  )
}

function chip(active) {
  return {
    padding: '8px 16px', borderRadius: 20, whiteSpace: 'nowrap',
    border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: active ? 'var(--accent)' : 'var(--surface)',
    color: active ? '#fff' : 'var(--text)',
    fontSize: 13, fontWeight: active ? 700 : 500, cursor: 'pointer',
  }
}
