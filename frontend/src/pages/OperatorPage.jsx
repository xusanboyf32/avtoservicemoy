import React, { useState, useEffect } from 'react'
import { useAuthStore, useThemeStore } from '../store'
import { oilRecordApi, clientApi } from '../api'

const fmt = n => Math.round(n || 0).toLocaleString('uz-UZ')

const S = {
  input: { width: '100%', padding: '9px 12px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 13 },
  btnGreen: { padding: '8px 14px', borderRadius: 'var(--radius)', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', whiteSpace: 'nowrap' },
  btnGray: { padding: '8px 12px', borderRadius: 'var(--radius)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 13, border: '1px solid var(--border)', cursor: 'pointer' },
  btnRed: { padding: '6px 10px', borderRadius: 'var(--radius)', background: 'var(--danger-light)', color: 'var(--danger)', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer' },
}

// Bo'limlar — chap sidebar filterlari
const SECTIONS = [
  { key: 'yaqin',       label: 'Probegi yaqinlar',      icon: '⏰', color: 'var(--warning)' },
  { key: 'chiqildi',    label: 'Aloqaga chiqildi',      icon: '✓',  color: 'var(--accent)' },
  { key: 'chiqolmadik', label: 'Aloqaga chiqa olmadik', icon: '✕',  color: 'var(--danger)' },
  { key: 'hammasi',     label: 'Hammasi',               icon: '📋', color: 'var(--blue)' },
]

// Status ko'rinishi
const STATUS_META = {
  kutilmoqda:  { label: 'Kutilmoqda',        color: 'var(--text2)',  bg: 'var(--surface2)' },
  gaplashildi: { label: 'Gaplashildi',       color: 'var(--accent)', bg: 'var(--accent-light)' },
  keladi:      { label: 'Kelishini aytdi',   color: 'var(--blue)',   bg: 'var(--blue-light)' },
  kotarmadi:   { label: 'Ko\'tarmadi',       color: 'var(--danger)', bg: 'var(--danger-light)' },
  hal_qilindi: { label: 'Hal qilindi',       color: 'var(--accent)', bg: 'var(--accent-light)' },
}

export default function OperatorPage() {
  const { user, logout } = useAuthStore()
  const { dark, toggle } = useThemeStore()

  const [section, setSection] = useState('yaqin')
  const [stats, setStats] = useState({ yaqin: 0, chiqildi: 0, chiqolmadik: 0, hammasi: 0 })
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)      // tanlangan task (o'ng panel)
  const [records, setRecords] = useState([])          // tanlangan mijozning probeg tarixi
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)

  // Qo'ng'iroq modal
  const [showCall, setShowCall] = useState(false)
  const [callStatus, setCallStatus] = useState('gaplashildi')
  const [callNote, setCallNote] = useState('')

  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 2500) }

  const loadTasks = (sec = section) => {
    setLoading(true)
    oilRecordApi.tasks(sec)
      .then(r => { setStats(r.data.stats || {}); setItems(r.data.items || []) })
      .catch(() => flash('Yuklashda xato', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadTasks(section) }, [section])

  const openClient = (task) => {
    setSelected(task)

    oilRecordApi.list(task.client_id, { page_size: 50 })
  .then(r => {
    const sorted = (r.data.items || []).sort((a, b) => new Date(b.date) - new Date(a.date))
    setRecords(sorted)
  })

      .catch(() => setRecords([]))
  }

  const submitCall = () => {
    if (!selected) return
    oilRecordApi.call(selected.oil_record_id, { call_status: callStatus, call_note: callNote || null })
      .then(() => {
        flash('✅ Holat saqlandi')
        setShowCall(false); setCallNote('')
        loadTasks(section)
        setSelected(s => s ? { ...s, call_status: callStatus, call_note: callNote } : s)
      })
      .catch(() => flash('Xato yuz berdi', 'error'))
  }

  // Tez holat o'zgartirish (kartochka tugmalari)
  const quickStatus = (task, newStatus) => {
    oilRecordApi.call(task.oil_record_id, { call_status: newStatus })
      .then(() => { flash('✅ Holat yangilandi'); loadTasks(section) })
      .catch(() => flash('Xato', 'error'))
  }

  // Qidiruv filtri (front tomonda)
  const shown = items.filter(t => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (t.full_name || '').toLowerCase().includes(q)
      || (t.phone || '').includes(q)
      || (t.car_number || '').toLowerCase().includes(q)
  })

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>

      {/* ═══════════ CHAP SIDEBAR ═══════════ */}
      <aside style={{ width: 290, minWidth: 290, background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>

        {/* Logo + rol */}
        <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
            <span style={{ fontSize: 22 }}>🛢️</span>
            <span style={{ fontWeight: 800, fontSize: 17 }}>
              <span style={{ color: 'var(--accent)' }}>Murod</span>Oil POS
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 15 }}>👤</span>
            <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--accent)', letterSpacing: 0.5 }}>OPERATOR</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2, marginLeft: 24 }}>{user?.username}</div>
        </div>

        {/* Qidiruv */}
        <div style={{ padding: '12px 16px 8px' }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text2)', fontSize: 13 }}>🔍</span>
            <input type="text" placeholder="Qidirish..." value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ ...S.input, paddingLeft: 32, height: 36 }} />
          </div>
        </div>

        {/* Bo'limlar (filterlar) */}
        <div style={{ padding: '4px 12px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {SECTIONS.map(sec => {
            const active = section === sec.key
            const count = stats[sec.key] || 0
            return (
              <button key={sec.key} onClick={() => { setSection(sec.key); setSelected(null) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                  borderRadius: 'var(--radius)', cursor: 'pointer', textAlign: 'left',
                  border: `1.5px solid ${active ? 'var(--accent)' : 'transparent'}`,
                  background: active ? 'var(--accent-light)' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--text)', fontSize: 13,
                  fontWeight: active ? 700 : 500,
                }}>
                <span style={{ fontSize: 15, color: sec.color }}>{sec.icon}</span>
                <span style={{ flex: 1 }}>{sec.label}</span>
                {count > 0 && (
                  <span style={{
                    minWidth: 22, textAlign: 'center', padding: '1px 7px', borderRadius: 11,
                    background: active ? 'var(--accent)' : 'var(--surface2)',
                    color: active ? '#fff' : 'var(--text2)', fontSize: 11, fontWeight: 700,
                  }}>{count}</span>
                )}
              </button>
            )
          })}
        </div>

        <div style={{ height: 1, background: 'var(--border)', margin: '4px 16px' }} />

        {/* Mijozlar ro'yxati */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 12px' }}>
          {loading ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text2)', fontSize: 13 }}>Yuklanmoqda...</div>
          ) : shown.length === 0 ? (
            <div style={{ padding: '30px 12px', textAlign: 'center', color: 'var(--text2)', fontSize: 13 }}>
              <div style={{ fontSize: 30, marginBottom: 8 }}>📭</div>
              {section === 'yaqin' ? 'Yaqin sanadagi mijoz yo\'q' : 'Ro\'yxat bo\'sh'}
            </div>
          ) : (
            shown.map(t => {
              const active = selected?.oil_record_id === t.oil_record_id
              const meta = STATUS_META[t.call_status] || STATUS_META.kutilmoqda
              const overdue = t.days_left < 0
              return (
                <div key={t.oil_record_id} onClick={() => openClient(t)}
                  style={{
                    padding: '11px 12px', marginBottom: 6, borderRadius: 'var(--radius)', cursor: 'pointer',
                    border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                    background: active ? 'var(--accent-light)' : 'var(--surface2)',
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{t.full_name}</div>
                    <span style={{ padding: '1px 7px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: meta.bg, color: meta.color, whiteSpace: 'nowrap' }}>
                      {meta.label}
                    </span>
                  </div>
                  {t.phone && <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 3 }}>📞 {t.phone}</div>}
                  {t.car_number && <div style={{ fontSize: 11, color: 'var(--text2)' }}>🚗 {t.car_number} {t.car_model && `(${t.car_model})`}</div>}
                  {t.jami_qarz > 0 && <div style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 600, fontFamily: 'var(--mono)' }}>Qarz: {fmt(t.jami_qarz)} so'm</div>}
                  <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 4, fontWeight: 600,
                      background: overdue ? 'var(--danger-light)' : 'var(--warning-light)',
                      color: overdue ? 'var(--danger)' : 'var(--warning)' }}>
                      📅 {t.next_date}
                    </span>
                    <span style={{ fontSize: 10, color: overdue ? 'var(--danger)' : 'var(--text2)', fontWeight: 600 }}>
                      {overdue ? `${Math.abs(t.days_left)} kun o'tdi` : `${t.days_left} kun qoldi`}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Pastki panel — tema, til, chiqish */}
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center' }}>


          <button onClick={toggle} style={{ ...S.btnGray, padding: '8px 10px', fontSize: 15 }}>{dark ? '☀️' : '🌙'}</button>
          <button onClick={() => loadTasks(section)} title="Yangilash" style={{ ...S.btnGray, padding: '8px 10px', fontSize: 15 }}>🔄</button>
          <button onClick={logout} style={{ ...S.btnRed, flex: 1, padding: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            ↩ Chiqish
          </button>


        </div>
      </aside>

      {/* ═══════════ O'NG PANEL ═══════════ */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {selected ? (
          <>
            {/* Mijoz header */}
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 54, height: 54, borderRadius: 14, background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>👤</div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 20 }}>{selected.full_name}</div>
                    <div style={{ display: 'flex', gap: 18, marginTop: 6, flexWrap: 'wrap' }}>
                      {selected.phone && <span style={{ fontSize: 13, color: 'var(--text2)' }}>📞 {selected.phone}</span>}
                      {selected.car_number && <span style={{ fontSize: 13, color: 'var(--text2)' }}>🚗 {selected.car_number} {selected.car_model && `(${selected.car_model})`}</span>}
                      {selected.jami_qarz > 0 && <span style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 700 }}>💳 Qarz: {fmt(selected.jami_qarz)} so'm</span>}
                    </div>
                  </div>
                </div>
                <button onClick={() => { setCallStatus('gaplashildi'); setCallNote(selected.call_note || ''); setShowCall(true) }}
                  style={{ ...S.btnGreen, padding: '10px 18px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  📞 Qo'ng'iroq holati
                </button>
              </div>

              {/* Tez tugmalar */}
              <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                <QuickBtn label="✓ Gaplashildi" active={selected.call_status === 'gaplashildi'}
                  onClick={() => quickStatus(selected, 'gaplashildi')} color="var(--accent)" />
                <QuickBtn label="✕ Ko'tarmadi" active={selected.call_status === 'kotarmadi'}
                  onClick={() => quickStatus(selected, 'kotarmadi')} color="var(--danger)" />
              </div>

              {/* Oxirgi izoh */}
              {selected.call_note && (
                <div style={{ marginTop: 12, padding: '9px 14px', background: 'var(--surface2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: 13 }}>
                  <span style={{ color: 'var(--text2)' }}>💬 Izoh: </span>
                  <span>{selected.call_note}</span>
                  {selected.call_time && <span style={{ color: 'var(--text2)', fontSize: 11, marginLeft: 8 }}>· {selected.call_time}</span>}
                </div>
              )}
            </div>

            {/* Probeg tarixi — timeline */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                📖 Probeg daftarchasi
                <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 400 }}>({records.length} ta yozuv)</span>
              </div>

              {records.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text2)' }}>Probeg yozuvi yo'q</div>
              ) : (
                <div style={{ position: 'relative', paddingLeft: 26 }}>
                  {/* Timeline chizig'i */}
                  <div style={{ position: 'absolute', left: 7, top: 8, bottom: 8, width: 2, background: 'var(--border)' }} />
                  {records.map((r, idx) => {
                    const dotColor = idx === 0 ? 'var(--accent)' : 'var(--blue)'
                    const filters = [
                      r.oil_filter && 'Moy filtri', r.air_filter && 'Havo filtri',
                      r.salon_filter && 'Salon filtri', r.spark_plug && 'Shamlar',
                      r.fuel_filter && 'Yoqilg\'i filtri', r.pampers && 'Pampers',
                    ].filter(Boolean)
                    return (
                      <div key={r.id} style={{ position: 'relative', marginBottom: 14 }}>
                        <div style={{ position: 'absolute', left: -25, top: 16, width: 14, height: 14, borderRadius: '50%', background: dotColor, border: '3px solid var(--bg)' }} />
                        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 18px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                            <div style={{ fontSize: 13, color: 'var(--text2)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>📅 {r.date}</div>
                            {r.next_date && (
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: 10, color: 'var(--text2)' }}>Keyingi kelish</div>
                                <div style={{ fontSize: 13, color: 'var(--warning)', fontWeight: 700 }}>{r.next_date}</div>
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: 20, marginTop: 8, flexWrap: 'wrap', fontSize: 13 }}>
                            {r.mileage != null && <span>📍 Probeg: <b>{fmt(r.mileage)} km</b></span>}
                            {r.transmission && <span>⚙️ Karobka: <b>{r.transmission}</b></span>}
                            {r.oil_brand && <span>🛢️ Moy: <b>{r.oil_brand}</b> {r.oil_type && <span style={{ color: 'var(--text2)' }}>({r.oil_type})</span>}</span>}
                          </div>
                          {r.master_name && (
                            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text2)' }}>
                              👤 Usta: {r.master_name} {r.master_phone && `(${r.master_phone})`}
                            </div>
                          )}
                          {filters.length > 0 && (
                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>
                              {filters.map(f => (
                                <span key={f} style={{ padding: '2px 8px', background: 'var(--accent-light)', color: 'var(--accent)', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>✓ {f}</span>
                              ))}
                            </div>
                          )}
                          {r.note && (
                            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text2)', fontStyle: 'italic' }}>💬 {r.note}</div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Hech kim tanlanmagan */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)' }}>
            <div style={{ fontSize: 54, marginBottom: 14 }}>👈</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Chap tarafdan mijozni tanlang</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>Probeg tarixi va qo'ng'iroq holati shu yerda ko'rinadi</div>
          </div>
        )}
      </main>

      {/* ═══════════ QO'NG'IROQ MODAL ═══════════ */}
      {showCall && selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 26, width: 440, boxShadow: 'var(--shadow-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div style={{ fontWeight: 800, fontSize: 17 }}>📞 Qo'ng'iroq holati</div>
              <button onClick={() => setShowCall(false)} style={{ background: 'none', fontSize: 20, cursor: 'pointer', border: 'none', color: 'var(--text2)' }}>✕</button>
            </div>

            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 6 }}>Mijoz: <b style={{ color: 'var(--text)' }}>{selected.full_name}</b></div>

            <div style={{ fontSize: 12, color: 'var(--text2)', margin: '14px 0 8px' }}>Holat:</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              {[
                { v: 'gaplashildi', l: '✓ Gaplashildi', c: 'var(--accent)' },
                { v: 'kotarmadi',   l: '✕ Ko\'tarmadi', c: 'var(--danger)' },
              ].map(o => (
                <button key={o.v} onClick={() => setCallStatus(o.v)}
                  style={{
                    padding: '11px', borderRadius: 'var(--radius)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    border: `1.5px solid ${callStatus === o.v ? o.c : 'var(--border)'}`,
                    background: callStatus === o.v ? 'var(--accent-light)' : 'var(--surface2)',
                    color: callStatus === o.v ? o.c : 'var(--text)',
                  }}>{o.l}</button>
              ))}
            </div>

            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>Izoh:</div>
            <textarea value={callNote} onChange={e => setCallNote(e.target.value)} rows={3}
              placeholder="Masalan: Juma kuni keladi dedi"
              style={{ ...S.input, resize: 'vertical', marginBottom: 16 }} />

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={submitCall} style={{ ...S.btnGreen, flex: 1, padding: '12px', fontSize: 14 }}>✓ Saqlash</button>
              <button onClick={() => setShowCall(false)} style={{ ...S.btnGray, padding: '12px', fontSize: 13 }}>Bekor</button>
            </div>
          </div>
        </div>
      )}

      {/* XABAR */}
      {msg && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', padding: '10px 20px', borderRadius: 'var(--radius)', background: msg.type === 'error' ? 'var(--danger)' : 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600, zIndex: 1000, boxShadow: 'var(--shadow-md)', whiteSpace: 'nowrap' }}>
          {msg.text}
        </div>
      )}
    </div>
  )
}

function QuickBtn({ label, active, onClick, color }) {
  return (
    <button onClick={onClick}
      style={{
        padding: '7px 13px', borderRadius: 'var(--radius)', cursor: 'pointer', fontSize: 12, fontWeight: 600,
        border: `1.5px solid ${active ? color : 'var(--border)'}`,
        background: active ? 'var(--accent-light)' : 'var(--surface2)',
        color: active ? color : 'var(--text)', whiteSpace: 'nowrap',
      }}>{label}</button>
  )
}

