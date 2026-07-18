import React, { useState, useEffect } from 'react'
import { Routes, Route, NavLink, useNavigate,  useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore, useThemeStore } from '../store'


import {
  batchApi, incomeApi, transferApi,
  kontragentApi, productApi, brandApi,
  categoryApi, unitApi, labelApi, userApi
} from '../api'


const fmt = n => Math.round(n || 0).toLocaleString('uz-UZ')

const C = {
  input: { width: '100%', padding: '8px 10px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 13 },
  btnGreen: { padding: '8px 14px', borderRadius: 'var(--radius)', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', whiteSpace: 'nowrap' },
  btnGray: { padding: '8px 12px', borderRadius: 'var(--radius)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 13, border: '1px solid var(--border)', cursor: 'pointer' },
  btnRed: { padding: '6px 10px', borderRadius: 'var(--radius)', background: 'var(--danger-light)', color: 'var(--danger)', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer' },
  th: { padding: '8px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text2)', background: 'var(--surface2)', borderBottom: '1px solid var(--border)' },
  td: { padding: '9px 12px', fontSize: 13, borderBottom: '1px solid var(--border)', verticalAlign: 'middle' },
}

function Toast({ msg }) {
  return (
    <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', padding: '9px 20px', borderRadius: 'var(--radius)', background: msg.type === 'error' ? 'var(--danger)' : 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600, zIndex: 1000 }}>
      {msg.text}
    </div>
  )
}

function Layout({ children }) {
  const { i18n } = useTranslation()
  const { user, logout } = useAuthStore()
  const { dark, toggle } = useThemeStore()

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)' }}>
      <div style={{ width: 210, background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 14px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--accent)' }}>🏭 OMBOR</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 5 }}>👤 {user?.username}</div>
        </div>
        <nav style={{ padding: '8px', flex: 1 }}>


          {[
            { to: '/warehouse', label: 'Stock', icon: '📊', end: true },
            { to: '/warehouse/kassa-stock', label: 'Kassa uchun stock', icon: '🏪' },
            { to: '/warehouse/incomes', label: 'Kirimlar', icon: '📦' },
            { to: '/warehouse/transfer', label: 'Transfer tarixi', icon: '📋' },

          ].map(item => (


            <NavLink key={item.to} to={item.to} end={item.end}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px', borderRadius: 'var(--radius)',
                marginBottom: 2, textDecoration: 'none', fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                background: isActive ? 'var(--accent-light)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--text)',
              })}
            >
              <span>{item.icon}</span><span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div style={{ padding: '10px 8px', borderTop: '1px solid var(--border)', display: 'flex', gap: 5 }}>
          <button onClick={toggle} style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface2)', fontSize: 14, cursor: 'pointer' }}>{dark ? '☀️' : '🌙'}</button>



          <button onClick={logout} style={{ flex: 1, padding: '7px', borderRadius: 6, background: 'var(--danger-light)', color: 'var(--danger)', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer' }}>↩</button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>{children}</div>
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{title}</h2>
      {onRefresh && (
        <button onClick={handleRefresh} title="Yangilash"
          style={{
            ...C.btnGray, padding: '5px 9px', fontSize: 14,
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



// ── Stock ───────────────────────────────────────────────
function StockPage() {
  const [stock, setStock] = useState([])
  const [kontragentFilter, setKontragentFilter] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    batchApi.warehouseStock().then(r => setStock(r.data || [])).catch(() => {})
  }, [])

  // Kontragentlar ro'yxati (filter uchun — takrorlanmas)
  const kontragents = [...new Set(stock.map(s => s.kontragent).filter(Boolean))]

  // Filtrlangan + sana bo'yicha yangi birinchi (desc)
  const filtered = stock
    .filter(s => !kontragentFilter || s.kontragent === kontragentFilter)
    .filter(s => {
      const q = query.trim().toLowerCase()
      if (!q) return true
      return (s.product_name || '').toLowerCase().includes(q) || (s.product_barcode || '').includes(q)
    })
    .sort((a, b) => (b.kelgan_sana || '').localeCompare(a.kelgan_sana || ''))

  return (
    <div style={{ padding: 24 }}>

      <PageHeader title="📊 Ombor qoldig'i" onRefresh={() => batchApi.warehouseStock().then(r => setStock(r.data || [])).catch(() => {})} />
      {/* Filtrlar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input value={query} onChange={e => setQuery(e.target.value)}
          placeholder="🔍 Mahsulot nomi yoki barcode..."
          style={{ ...C.input, maxWidth: 280 }} />
        <select value={kontragentFilter} onChange={e => setKontragentFilter(e.target.value)}
          style={{ ...C.input, maxWidth: 220 }}>
          <option value="">Barcha kontragentlar</option>
          {kontragents.map(k => <option key={k} value={k}>{k}</option>)}
        </select>
        {(query || kontragentFilter) && (
          <button onClick={() => { setQuery(''); setKontragentFilter('') }} style={C.btnGray}>Tozalash</button>
        )}
        <span style={{ marginLeft: 'auto', alignSelf: 'center', fontSize: 13, color: 'var(--text2)' }}>Jami: {filtered.length} ta partiya</span>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>{['Mahsulot', 'Barcode', 'Joriy soni', 'Kontragent', 'Kelgan sana'].map(h => (
              <th key={h} style={C.th}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {filtered.length === 0
              ? <tr><td colSpan={5} style={{ ...C.td, textAlign: 'center', color: 'var(--text2)', padding: 32 }}>Stock bo'sh</td></tr>
              : filtered.map(s => (
                <tr key={s.batch_id}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={C.td}><strong>{s.product_name}</strong></td>
                  <td style={{ ...C.td, fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text2)' }}>{s.product_barcode}</td>
                  <td style={{ ...C.td, textAlign: 'center' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 4, background: s.joriy_soni > 0 ? 'var(--accent-light)' : 'var(--danger-light)', color: s.joriy_soni > 0 ? 'var(--accent)' : 'var(--danger)', fontWeight: 700, fontFamily: 'var(--mono)' }}>
                      {s.joriy_soni}
                    </span>
                  </td>
                  <td style={C.td}>{s.kontragent || '—'}</td>
                  <td style={{ ...C.td, fontSize: 12, color: 'var(--text2)' }}>{s.kelgan_sana ? s.kelgan_sana.slice(0, 16).replace('T', ' ') : '—'}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}




// ── Kirimlar ─────────────────────────────────────────────
function IncomesPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin'


  const [incomes, setIncomes] = useState({ items: [], total: 0 })
  const [showForm, setShowForm] = useState(false)
  const [showNewProduct, setShowNewProduct] = useState(false)
  const [kontragents, setKontragents] = useState([])
  const [products, setProducts] = useState([])
  const [brands, setBrands] = useState([])
  const [categories, setCategories] = useState([])
  const [units, setUnits] = useState([])
  const [form, setForm] = useState({

    kontragent_id: '', note: '',
    items: [{ product_id: '', brand_id: '', quantity: '' }]
  })
  const [newProduct, setNewProduct] = useState({
    name: '', barcode: '', description: '',
    category_id: '', unit_id: ''
  })
  const [selectedIncome, setSelectedIncome] = useState(null)
  const [msg, setMsg] = useState(null)
  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 2500) }

  const load = () => incomeApi.list({ page_size: 50 }).then(r => setIncomes(r.data)).catch(() => {})

  const loadProducts = () => productApi.list({ page_size: 200 }).then(r => setProducts(r.data.items || [])).catch(() => {})

  useEffect(() => {
    load()
    kontragentApi.list().then(r => setKontragents(r.data || [])).catch(() => {})
    loadProducts()
    brandApi.list().then(r => setBrands(r.data || [])).catch(() => {})
    categoryApi.list().then(r => setCategories(r.data || [])).catch(() => {})
    unitApi.list().then(r => setUnits(r.data || [])).catch(() => {})
  }, [])

  const updateItem = (idx, key, val) =>
    setForm(p => ({ ...p, items: p.items.map((x, i) => i === idx ? { ...x, [key]: val } : x) }))

  const handleCreateIncome = async () => {
    if (!form.kontragent_id) return flash('Kontragentni tanlang!', 'error')
    if (form.items.some(i => !i.product_id || !i.quantity))
      return flash('Mahsulot va sonini to\'ldiring!', 'error')

    try {
      await incomeApi.create({
        kontragent_id: parseInt(form.kontragent_id),
        note: form.note || null,
        items: form.items.map(it => ({
          product_id: parseInt(it.product_id),
          brand_id: it.brand_id ? parseInt(it.brand_id) : null,
          quantity: parseInt(it.quantity),
        }))
      })
      flash('✅ Kirim yaratildi!')
      setShowForm(false)
      setForm({ kontragent_id: '', note: '', items: [{ product_id: '', brand_id: '', quantity: '' }] })
      load()
    } catch (e) { flash(e.response?.data?.detail || 'Xato!', 'error') }
  }

  const handleCreateProduct = async () => {


    if (!newProduct.name || !newProduct.barcode || !newProduct.category_id || !newProduct.unit_id)
      return flash('Barcha majburiy maydonlarni to\'ldiring!', 'error')
    try {
      const res = await productApi.create({
        ...newProduct,
        category_id: parseInt(newProduct.category_id),
        unit_id: parseInt(newProduct.unit_id)
      })
      flash(`✅ ${res.data.name} qo'shildi!`)
      setShowNewProduct(false)
      setNewProduct({ name: '', barcode: '', description: '', category_id: '', unit_id: '' })
      await loadProducts()
      // Yangi mahsulotni oxirgi item ga tanlash
      setForm(p => ({
        ...p,
        items: p.items.map((item, idx) =>
          idx === p.items.length - 1 ? { ...item, product_id: String(res.data.id) } : item
        )
      }))
    } catch (e) { flash(e.response?.data?.detail || 'Xato!', 'error') }
  }

  return (
    <div style={{ padding: 24 }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <PageHeader title="📦 Kirimlar" onRefresh={load} />
        <button onClick={() => setShowForm(true)} style={C.btnGreen}>+ Yangi kirim</button>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>{['Raqam', 'Sana', 'Kontragent', 'Mahsulotlar', 'Holat'].map(h => <th key={h} style={C.th}>{h}</th>)}</tr>
          </thead>
          <tbody>

            {incomes.items?.map(inc => (
              <tr key={inc.id}
                onClick={() => setSelectedIncome(inc)}
                style={{ cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                <td style={C.td}><span style={{ fontFamily: 'var(--mono)', fontWeight: 700 }}>{inc.income_number}</span></td>
                <td style={{ ...C.td, color: 'var(--text2)', fontSize: 12 }}>{inc.date}</td>
                <td style={C.td}>{inc.kontragent?.name}</td>
                <td style={{ ...C.td, fontSize: 12 }}>{inc.items?.length} ta mahsulot</td>
                <td style={C.td}>
                  {inc.items?.some(i => !i.batch)
                    ? <span style={{ color: 'var(--warning)', fontSize: 12, fontWeight: 600 }}>⏳ Narx kutilmoqda</span>
                    : <span style={{ color: 'var(--accent)', fontSize: 12 }}>✓ To'liq</span>}
                </td>
              </tr>
            ))}
            {(!incomes.items || incomes.items.length === 0) && (
              <tr><td colSpan={5} style={{ ...C.td, textAlign: 'center', color: 'var(--text2)', padding: 32 }}>Kirim yo'q</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── YANGI KIRIM MODAL ── */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 24, width: 600, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
              <strong style={{ fontSize: 16 }}>📦 Yangi kirim</strong>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', fontSize: 20, cursor: 'pointer', border: 'none', color: 'var(--text2)' }}>✕</button>
            </div>

            {/* Kontragent */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Kontragent *</label>
              <select value={form.kontragent_id} onChange={e => setForm(p => ({ ...p, kontragent_id: e.target.value }))} style={C.input}>
                <option value="">Tanlang...</option>
                {kontragents.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
              </select>
            </div>

            {/* Mahsulotlar */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>Mahsulotlar</span>
                {/* Yangi mahsulot qo'shish tugmasi */}
                <button onClick={() => setShowNewProduct(true)}
                  style={{ ...C.btnGray, fontSize: 12, padding: '5px 10px', color: 'var(--blue)', borderColor: 'var(--blue)' }}>
                  + Yangi mahsulot bazaga qo'shish
                </button>
              </div>

              {form.items.map((item, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 90px 34px', gap: 6, marginBottom: 8, alignItems: 'end' }}>
                  <div>
                    {idx === 0 && <label style={{ fontSize: 11, color: 'var(--text2)', display: 'block', marginBottom: 3 }}>Mahsulot *</label>}
                    <select value={item.product_id}
                      onChange={e => updateItem(idx, 'product_id', e.target.value)}
                      style={C.input}>
                      <option value="">Tanlang...</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    {idx === 0 && <label style={{ fontSize: 11, color: 'var(--text2)', display: 'block', marginBottom: 3 }}>Brand</label>}
                    <select value={item.brand_id}
                      onChange={e => updateItem(idx, 'brand_id', e.target.value)}
                      style={C.input}>
                      <option value="">—</option>
                      {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div>
                    {idx === 0 && <label style={{ fontSize: 11, color: 'var(--text2)', display: 'block', marginBottom: 3 }}>Soni *</label>}
                    <input type="number" placeholder="0" value={item.quantity}
                      onChange={e => updateItem(idx, 'quantity', e.target.value)}
                      style={C.input} />
                  </div>
                  <button
                    onClick={() => setForm(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }))}
                    style={{ height: 38, background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 14 }}>✕</button>
                </div>
              ))}

              <button
                onClick={() => setForm(p => ({ ...p, items: [...p.items, { product_id: '', brand_id: '', quantity: '' }] }))}
                style={{ ...C.btnGray, fontSize: 12, marginTop: 4 }}>
                + Qator qo'shish
              </button>
            </div>


            {/* Izoh */}
            <div style={{ marginTop: 14, marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>📝 Izoh (ixtiyoriy)</label>
              <textarea
                value={form.note}
                onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
                placeholder="Partiya haqida eslatma..."
                rows={2}
                style={{ ...C.input, resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>


            {/* Eslatma */}
            <div style={{ background: 'var(--warning-light)', border: '1px solid var(--warning)', borderRadius: 6, padding: '8px 12px', marginTop: 14, marginBottom: 16, fontSize: 12, color: 'var(--warning)' }}>
              ⚠️ Dollar narxi, kurs va ustama foizini admin kiritadi
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleCreateIncome} style={{ ...C.btnGreen, flex: 1 }}>✓ Saqlash</button>
              <button onClick={() => setShowForm(false)} style={{ ...C.btnGray, flex: 1 }}>Bekor</button>
            </div>
          </div>
        </div>
      )}

      {/* ── YANGI MAHSULOT QO'SHISH MODAL ── */}
      {showNewProduct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 600 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 24, width: 420, boxShadow: 'var(--shadow-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
              <strong style={{ fontSize: 16 }}>🛢️ Yangi mahsulot qo'shish</strong>
              <button onClick={() => setShowNewProduct(false)} style={{ background: 'none', fontSize: 20, cursor: 'pointer', border: 'none', color: 'var(--text2)' }}>✕</button>
            </div>

            {[
              { key: 'name', label: 'Mahsulot nomi *', placeholder: 'Masalan: Hyundai ATF SP-IV 4L' },
              { key: 'barcode', label: 'Barcode *', placeholder: 'Masalan: 8801234567890' },
              { key: 'description', label: 'Tavsif', placeholder: 'Qisqacha tavsif...' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>{f.label}</label>
                <input type="text" placeholder={f.placeholder}
                  value={newProduct[f.key]}
                  onChange={e => setNewProduct(p => ({ ...p, [f.key]: e.target.value }))}
                  style={C.input} />
              </div>
            ))}

            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Kategoriya *</label>
              <select value={newProduct.category_id}
                onChange={e => setNewProduct(p => ({ ...p, category_id: e.target.value }))}
                style={C.input}>
                <option value="">Tanlang...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>O'lchov birligi *</label>
              <select value={newProduct.unit_id}
                onChange={e => setNewProduct(p => ({ ...p, unit_id: e.target.value }))}
                style={C.input}>
                <option value="">Tanlang...</option>
                {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>



            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleCreateProduct} style={{ ...C.btnGreen, flex: 1 }}>✓ Qo'shish</button>
              <button onClick={() => setShowNewProduct(false)} style={{ ...C.btnGray, flex: 1 }}>Bekor</button>
            </div>
          </div>
        </div>
      )}

      {/* ── INCOME DETAIL MODAL ── */}
      {selectedIncome && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 28, width: 600, maxHeight: '85vh', overflowY: 'auto', boxShadow: 'var(--shadow-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18, fontFamily: 'var(--mono)', color: 'var(--accent)' }}>{selectedIncome.income_number}</div>
                <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>📅 {selectedIncome.date} · 👤 {selectedIncome.warehouse_user?.username}</div>
              </div>
              <button onClick={() => setSelectedIncome(null)} style={{ background: 'none', fontSize: 22, cursor: 'pointer', border: 'none', color: 'var(--text2)' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius)', padding: '12px 14px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Kontragent</div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>🏢 {selectedIncome.kontragent?.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{selectedIncome.kontragent?.phone}</div>
              </div>
              <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius)', padding: '12px 14px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Holat</div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  {selectedIncome.items?.some(i => !i.batch)
                    ? <span style={{ color: 'var(--warning)' }}>⏳ Narx kutilmoqda</span>
                    : <span style={{ color: 'var(--accent)' }}>✓ To'liq</span>}
                </div>
              </div>



              {isAdmin && (
                <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius)', padding: '12px 14px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>To'lov</div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    {selectedIncome.payment?.is_paid
                      ? <span style={{ color: 'var(--accent)' }}>✓ To'langan</span>
                      : <span style={{ color: 'var(--danger)' }}>Qarz: {fmt(selectedIncome.payment?.debt_amount)} so'm</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{selectedIncome.payment?.payment_type}</div>
                </div>
              )}
            </div>

            {/* Izoh */}
            {selectedIncome.note && (
              <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 14px', marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>📝 Izoh</div>
                <div style={{ fontSize: 13 }}>{selectedIncome.note}</div>
              </div>
            )}
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 10 }}>📦 Mahsulotlar</div>
            <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 16 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {(isAdmin
                      ? ['№', 'Mahsulot', 'Soni', 'Dollar narxi', 'Kurs', 'Ustama', 'Sotuv narxi', 'Holat']
                      : ['№', 'Mahsulot', 'Soni', 'Holat']
                    ).map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text2)', borderBottom: '1px solid var(--border)', background: 'var(--surface)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedIncome.items?.map((item, idx) => (


                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '9px 12px', fontSize: 12, color: 'var(--text2)' }}>{idx + 1}</td>
                      <td style={{ padding: '9px 12px', fontSize: 13 }}>
                        <div style={{ fontWeight: 600 }}>{item.batch?.product?.name || `Mahsulot ID: ${item.product_id}`}</div>
                        {item.batch?.brand && <div style={{ fontSize: 11, color: 'var(--text2)' }}>{item.batch.brand.name}</div>}
                      </td>
                      <td style={{ padding: '9px 12px', fontFamily: 'var(--mono)', fontWeight: 700 }}>{item.quantity ?? item.batch?.quantity ?? '—'}</td>
                      {isAdmin && (
                        <>
                          <td style={{ padding: '9px 12px', fontFamily: 'var(--mono)', fontSize: 12 }}>
                            {item.batch?.price_usd ? `$${item.batch.price_usd}` : <span style={{ color: 'var(--warning)' }}>—</span>}
                          </td>
                          <td style={{ padding: '9px 12px', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text2)' }}>{item.batch?.exchange_rate ? fmt(item.batch.exchange_rate) : '—'}</td>
                          <td style={{ padding: '9px 12px', fontSize: 12, color: 'var(--text2)' }}>{item.batch?.markup_percent ? `${item.batch.markup_percent}%` : '—'}</td>
                          <td style={{ padding: '9px 12px', fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--accent)' }}>
                            {item.batch?.sale_price ? fmt(item.batch.sale_price) : <span style={{ color: 'var(--warning)', fontSize: 11 }}>Narx yo'q</span>}
                          </td>
                        </>
                      )}
                      <td style={{ padding: '9px 12px' }}>
                        {item.batch
                          ? <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: 'var(--accent-light)', color: 'var(--accent)' }}>✓ Tayyor</span>
                          : <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: 'var(--warning-light)', color: 'var(--warning)' }}>⏳ Narx kerak</span>}
                      </td>
                    </tr>



                  ))}
                </tbody>
              </table>
            </div>


            {isAdmin && selectedIncome.payment && (
              <div style={{ padding: '14px 16px', background: 'var(--surface2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: 16 }}>

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
            <button onClick={() => setSelectedIncome(null)} style={{ ...C.btnGray, width: '100%', padding: '10px' }}>Yopish</button>
          </div>
        </div>
      )}

      {msg && <Toast msg={msg} />}
    </div>
  )
}




// ── Transfer tarixi ─────────────────────────────────────
function TransferPage() {
  const [transfers, setTransfers] = useState([])
  const [selected, setSelected] = useState(null)
  const [msg, setMsg] = useState(null)
  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 2500) }

  const load = () => transferApi.list().then(r => setTransfers(r.data || [])).catch(() => {})
  useEffect(() => { load() }, [])

  const statusMap = {
    yuborildi: { bg: 'var(--warning-light)', c: 'var(--warning)', l: '⏳ Kutilmoqda' },
    qabul: { bg: 'var(--accent-light)', c: 'var(--accent)', l: '✓ Qabul qilindi' },
    rad: { bg: 'var(--danger-light)', c: 'var(--danger)', l: '✕ Bekor qilingan' },
  }

  const handleReject = async (id) => {
    if (!window.confirm('Bu transfer bekor qilinadimi? Mahsulotlar omborga qaytadi.')) return
    try {
      await transferApi.reject(id)
      flash('✅ Bekor qilindi, mahsulotlar omborga qaytdi')
      setSelected(null)
      load()
    } catch (e) { flash(e.response?.data?.detail || 'Xato!', 'error') }
  }

  return (
    <div style={{ padding: 24 }}>

      <PageHeader title="📋 Transfer tarixi" onRefresh={load} />
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>{['Raqam', 'Sana / vaqt', 'Kassirga', 'Mahsulotlar', 'Holat'].map(h => <th key={h} style={C.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {transfers.map(tr => {
              const st = statusMap[tr.status] || {}
              return (
                <tr key={tr.id} onClick={() => setSelected(tr)}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={C.td}><strong style={{ fontFamily: 'var(--mono)' }}>#{tr.id}</strong></td>
                  <td style={{ ...C.td, fontSize: 12, color: 'var(--text2)' }}>{(tr.created_at || '').slice(0, 16).replace('T', ' ')}</td>
                  <td style={C.td}>{tr.kassir?.profile?.full_name || tr.kassir?.username || '—'}</td>
                  <td style={{ ...C.td, fontSize: 12 }}>{tr.items?.length || 0} tur mahsulot</td>
                  <td style={C.td}><span style={{ padding: '2px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600, background: st.bg, color: st.c }}>{st.l}</span></td>
                </tr>
              )
            })}
            {transfers.length === 0 && (
              <tr><td colSpan={5} style={{ ...C.td, textAlign: 'center', color: 'var(--text2)', padding: 32 }}>Transfer yo'q</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* DETAIL MODAL */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 24, width: 560, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18, fontFamily: 'var(--mono)', color: 'var(--accent)' }}>#{selected.id}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>📅 {(selected.created_at || '').slice(0, 16).replace('T', ' ')}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', fontSize: 22, cursor: 'pointer', border: 'none', color: 'var(--text2)' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius)', padding: '10px 12px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--text2)' }}>Kassirga</div>
                <div style={{ fontWeight: 700 }}>{selected.kassir?.profile?.full_name || selected.kassir?.username || '—'}</div>
              </div>
              <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius)', padding: '10px 12px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--text2)' }}>Holat</div>
                <div style={{ fontWeight: 700, color: statusMap[selected.status]?.c }}>{statusMap[selected.status]?.l}</div>
              </div>
            </div>

            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>📦 Yuborilgan mahsulotlar</div>
            <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 16 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>{['Mahsulot', 'Yuborilgan', 'Qabul'].map(h => <th key={h} style={{ ...C.th, background: 'var(--surface)' }}>{h}</th>)}</tr>
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
            </div>

            {/* Amallar — faqat "yuborildi" holatida bekor qilish mumkin */}
            {selected.status === 'yuborildi' ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => handleReject(selected.id)} style={{ ...C.btnRed, flex: 1, padding: 10 }}>✕ Bekor qilish (omborga qaytarish)</button>
                <button onClick={() => setSelected(null)} style={{ ...C.btnGray, flex: 1, padding: 10 }}>Yopish</button>
              </div>
            ) : (
              <button onClick={() => setSelected(null)} style={{ ...C.btnGray, width: '100%', padding: 10 }}>Yopish</button>
            )}
          </div>
        </div>
      )}
      {msg && <Toast msg={msg} />}
    </div>
  )
}





// ── Kassa uchun stock (savat + yuborish) ───────────────
function KassaStockPage() {
  const [rows, setRows] = useState([])
  const [kassirlar, setKassirlar] = useState([])
  const [query, setQuery] = useState('')
  const [kassirId, setKassirId] = useState('')


  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kassa_stock_cart')) || [] } catch { return [] }
  })
  const [topPercent, setTopPercent] = useState(() => {
    const v = Number(localStorage.getItem('kassa_stock_top'))
    return v >= 20 && v <= 80 ? v : 45   // tepa (mahsulotlar) foizi
  })

  // Surgich — sichqoncha bilan cho'zish
  const startDrag = e => {
    e.preventDefault()
    const container = e.currentTarget.parentElement
    const onMove = ev => {
      const rect = container.getBoundingClientRect()
      let pct = ((ev.clientY - rect.top) / rect.height) * 100
      pct = Math.max(20, Math.min(80, pct))
      setTopPercent(pct)
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      localStorage.setItem('kassa_stock_top', String(Math.round(topPercent)))
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }


  const [msg, setMsg] = useState(null)
  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 2500) }

  const load = () => {
    batchApi.kassaStockView().then(r => setRows(r.data || [])).catch(() => {})
    userApi.kassirlar().then(r => setKassirlar(r.data || [])).catch(() => {})
  }
  useEffect(() => { load() }, [])

  // Savatni localStorage ga saqlash (F5 dan keyin yo'qolmasin)
  useEffect(() => {
    localStorage.setItem('kassa_stock_cart', JSON.stringify(cart))
  }, [cart])

  const filtered = query.trim()
    ? rows.filter(s => (s.product_name || '').toLowerCase().includes(query.toLowerCase()) || (s.product_barcode || '').includes(query))
    : rows

  // ── savat ──
  const addToCart = s => {
    if (s.ombor_soni <= 0) return
    setCart(prev => {
      const found = prev.find(i => i.batch_id === s.batch_id)
      if (found) return prev.map(i => i.batch_id === s.batch_id ? { ...i, qty: Math.min(i.qty + 1, s.ombor_soni) } : i)
      return [...prev, { batch_id: s.batch_id, name: s.product_name, barcode: s.product_barcode, ombor: s.ombor_soni, qty: 1 }]
    })
  }
  const setQty = (bid, q) => setCart(prev => prev.map(i => i.batch_id === bid ? { ...i, qty: q } : i))
  const removeItem = bid => setCart(prev => prev.filter(i => i.batch_id !== bid))

  const handleSend = async () => {
    if (cart.length === 0) return flash('Savat bo\'sh!', 'error')
    if (!kassirId) return flash('Kassirni tanlang!', 'error')
    try {
      await transferApi.create({
        kassir_id: parseInt(kassirId),
        items: cart.map(i => ({ batch_id: i.batch_id, sent_quantity: i.qty })),
      })

      flash('✅ Kassaga yuborildi!')
      setCart([])
      localStorage.removeItem('kassa_stock_cart')
      setKassirId('')
      load()

    } catch (e) { flash(e.response?.data?.detail || 'Xato!', 'error') }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Sarlavha + kassir */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>

        <PageHeader title="🏪 Kassa uchun stock" onRefresh={load} />
        <input value={query} onChange={e => setQuery(e.target.value)}
          placeholder="🔍 Mahsulot nomi yoki barcode..." style={{ ...C.input, maxWidth: 280 }} />
        <select value={kassirId} onChange={e => setKassirId(e.target.value)}
          style={{ ...C.input, maxWidth: 200, borderColor: !kassirId && cart.length > 0 ? 'var(--danger)' : 'var(--border)' }}>
          <option value="">Kassir tanlang...</option>
          {kassirlar.map(k => <option key={k.id} value={k.id}>{k.full_name || k.username}</option>)}
        </select>
      </div>







      {/* TEPA — mahsulotlar (cho'ziladi) */}
      <div style={{ height: `${topPercent}%`, minHeight: 0, overflowY: 'auto', padding: 16 }}>

        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 10 }}>📦 Mahsulotlar (bosib savatga qo'shing)</div>



        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['Mahsulot', 'Barcode', 'Holat', 'Omborda', 'Kassada', 'Sotuv narxi', ''].map(h => <th key={h} style={C.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={7} style={{ ...C.td, textAlign: 'center', color: 'var(--text2)', padding: 24 }}>Mahsulot yo'q</td></tr>
                : filtered.map(s => (
                  <tr key={s.batch_id} onClick={() => addToCart(s)}
                    style={{ cursor: s.ombor_soni > 0 ? 'pointer' : 'default', opacity: s.ombor_soni > 0 ? 1 : 0.4 }}
                    onMouseEnter={e => s.ombor_soni > 0 && (e.currentTarget.style.background = 'var(--accent-light)')}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={C.td}><strong>{s.product_name}</strong></td>
                    <td style={{ ...C.td, fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text2)' }}>{s.product_barcode}</td>
                    <td style={{ ...C.td, textAlign: 'center' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 4, fontWeight: 700, fontSize: 11,
                        background: s.is_current ? 'var(--accent-light)' : 'var(--warning-light)',
                        color: s.is_current ? 'var(--accent)' : 'var(--warning)'
                      }}>
                        {s.is_current ? '✓ Aktiv' : '⏳ Navbatda'}
                      </span>
                    </td>
                    <td style={{ ...C.td, textAlign: 'center' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 4, background: s.ombor_soni > 0 ? 'var(--accent-light)' : 'var(--danger-light)', color: s.ombor_soni > 0 ? 'var(--accent)' : 'var(--danger)', fontWeight: 700, fontFamily: 'var(--mono)' }}>{s.ombor_soni}</span>
                    </td>
                    <td style={{ ...C.td, textAlign: 'center', fontFamily: 'var(--mono)', color: 'var(--blue)' }}>{s.kassa_soni}</td>
                    <td style={{ ...C.td, fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--accent)' }}>{fmt(s.sotuv_narx)}</td>
                    <td style={{ ...C.td, textAlign: 'center', color: 'var(--accent)', fontWeight: 700 }}>{s.ombor_soni > 0 ? '+ ' : ''}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>



      {/* SURGICH — mahsulotlar va savat orasida */}
      <div onMouseDown={startDrag}
        style={{ height: 10, cursor: 'ns-resize', background: 'var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        title="Surib cho'zing">
        <div style={{ width: 44, height: 3, borderRadius: 2, background: 'var(--text2)' }} />
      </div>



      {/* PAST — savat (qolgan joy) */}
      <div style={{ flex: 1, background: 'var(--surface)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>

        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
          <strong style={{ fontSize: 14 }}>🛒 Savat ({cart.length} mahsulot)</strong>
          {cart.length > 0 && <button onClick={() => setCart([])} style={{ ...C.btnRed, marginLeft: 12 }}>Tozalash</button>}
          <button onClick={handleSend} disabled={cart.length === 0 || !kassirId}
            style={{ ...C.btnGreen, marginLeft: 'auto', padding: '9px 20px', opacity: (cart.length > 0 && kassirId) ? 1 : 0.5 }}>
            ➡️ Kassaga yuborish
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
          {cart.length === 0
            ? <div style={{ textAlign: 'center', color: 'var(--text2)', padding: 24, fontSize: 13 }}>Savat bo'sh — yuqoridan mahsulot tanlang</div>
            : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>{['Mahsulot', 'Omborda', 'Yuboriladigan soni', ''].map(h => <th key={h} style={C.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {cart.map(i => (
                    <tr key={i.batch_id}>
                      <td style={C.td}><strong>{i.name}</strong><div style={{ fontSize: 11, color: 'var(--text2)' }}>{i.barcode}</div></td>
                      <td style={{ ...C.td, fontFamily: 'var(--mono)', color: 'var(--text2)' }}>{i.ombor} ta</td>
                      <td style={C.td}>
                        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 6, width: 'fit-content' }}>


                          <button onClick={() => setQty(i.batch_id, Math.max(1, (Number(i.qty) || 0) - 1))} style={{ width: 30, height: 32, border: 'none', background: 'none', cursor: 'pointer', fontSize: 16 }}>−</button>
                          <input value={i.qty}
                            onChange={e => {
                              const v = e.target.value
                              if (v === '') return setQty(i.batch_id, '')
                              const n = Math.min(Number(v) || 0, i.ombor)
                              setQty(i.batch_id, n)
                            }}
                            onBlur={e => { if (!e.target.value || Number(e.target.value) < 1) setQty(i.batch_id, 1) }}
                            style={{ width: 60, textAlign: 'center', border: 'none', borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', height: 32 }} />
                          <button onClick={() => setQty(i.batch_id, Math.min((Number(i.qty) || 0) + 1, i.ombor))} style={{ width: 30, height: 32, border: 'none', background: 'none', cursor: 'pointer', fontSize: 16 }}>+</button>

                        </div>
                      </td>
                      <td style={C.td}><button onClick={() => removeItem(i.batch_id)} style={C.btnRed}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>
      </div>
      {msg && <Toast msg={msg} />}
    </div>
  )
}







export default function WarehousePage() {
  return (
    <Layout>

      <Routes>
        <Route path="/" element={<StockPage />} />
        <Route path="/kassa-stock" element={<KassaStockPage />} />
        <Route path="/incomes" element={<IncomesPage />} />
        <Route path="/transfer" element={<TransferPage />} />
      </Routes>


    </Layout>
  )
}



