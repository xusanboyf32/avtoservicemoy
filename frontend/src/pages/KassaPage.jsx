import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore, useThemeStore } from '../store'


import {
  productApi, saleApi, clientApi, cameraApi,
  printerApi, transferApi, statsApi, batchApi,
  kassaPageApi, labelApi, oilRecordApi, clientDebtApi, CAMERA_STREAM
} from '../api'


const fmt = n => Math.round(n || 0).toLocaleString('uz-UZ')

const S = {
  input: { width: '100%', padding: '8px 10px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 13 },
  btnGreen: { padding: '8px 14px', borderRadius: 'var(--radius)', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', whiteSpace: 'nowrap' },
  btnGray: { padding: '7px 11px', borderRadius: 'var(--radius)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 13, border: '1px solid var(--border)', cursor: 'pointer' },
  btnRed: { padding: '5px 10px', borderRadius: 'var(--radius)', background: 'var(--danger-light)', color: 'var(--danger)', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer' },
  th: { padding: '7px 10px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text2)', borderBottom: '1px solid var(--border)', background: 'var(--surface2)', whiteSpace: 'nowrap' },
  td: { padding: '7px 10px', fontSize: 13, verticalAlign: 'middle', borderBottom: '1px solid var(--border)' },
  calc: { padding: '9px 3px', borderRadius: 5, border: '1px solid var(--border)', cursor: 'pointer', background: 'var(--surface2)', color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600 },

}

export default function KassaPage() {
  const { i18n } = useTranslation()
  const { user, logout, can } = useAuthStore()
  const { dark, toggle } = useThemeStore()

  const [activePage, setActivePage] = useState(1)
  const [pages, setPages] = useState([])
  const [stock, setStock] = useState([])
  const [cart, setCart] = useState([])
  const [client, setClientState] = useState(null)

  // To'lov
  const [payType, setPayType] = useState('naqd')
  const [naqdAmt, setNaqdAmt] = useState('')
  const [kartaAmt, setKartaAmt] = useState('')
  const [activeInput, setActiveInput] = useState('naqd')
  const [gDiscPct, setGDiscPct] = useState(0)
  const [gDiscAmt, setGDiscAmt] = useState(0)
  const [note, setNote] = useState('')

  // Tab
  const [tab, setTab] = useState('cart')
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [hoveredProduct, setHoveredProduct] = useState(null)

  // Chegirma modal
  const [showDiscModal, setShowDiscModal] = useState(false)
  const [discTarget, setDiscTarget] = useState('global') // 'global' | batch_id
  const [discMode, setDiscMode] = useState('percent')
  const [discVal, setDiscVal] = useState('')


  // Cheklar
  const [checks, setChecks] = useState([])
  const [checksPage, setChecksPage] = useState(1)
  const [checksTotal, setChecksTotal] = useState(0)
  const [selectedCheck, setSelectedCheck] = useState(null)
  const [checkReturns, setCheckReturns] = useState([])

  const openCheckDetail = (s) => {
    setSelectedCheck(s)
    setCheckReturns([])
    saleApi.returns({ sale_id: s.id, page_size: 100 })
      .then(r => setCheckReturns(r.data.items || []))
      .catch(() => {})
  }

  // Bitta sale_item uchun jami qaytarilgan miqdorni topish
  const returnedQtyFor = (saleItemId) =>
    checkReturns
      .filter(r => r.sale_item_id === saleItemId)
      .reduce((s, r) => s + (r.quantity || 0), 0)


  // Mijozlar
  const [clientSearch, setClientSearch] = useState('')
  const [clientsList, setClientsList] = useState([])
  const [showClientForm, setShowClientForm] = useState(false)
  const [newClient, setNewClient] = useState({ full_name: '', phone: '', car_number: '', car_model: '' })

  const [selectedClientDetail, setSelectedClientDetail] = useState(null)
  const [clientOilRecords, setClientOilRecords] = useState([])



  // Mijoz qarzlari (to'lov qabul qilish uchun) — endi UMUMIY qarz sifatida boshqariladi
  const [clientDebts, setClientDebts] = useState([])       // tarix uchun — barcha (to'langan + to'lanmagan)
  const [payDebtModal, setPayDebtModal] = useState(false)
  const [showDebtHistory, setShowDebtHistory] = useState(false)
  const [debtPayAmount, setDebtPayAmount] = useState('')
  const [debtPayType, setDebtPayType] = useState('naqd')
  const [debtPayNaqd, setDebtPayNaqd] = useState('')
  const [debtPayKarta, setDebtPayKarta] = useState('')

  const loadClientDebts = (clientId) => {
    clientDebtApi.detail(clientId).then(r => {
      setClientDebts(r.data.qarzlar || [])   // to'liq tarix (to'langan ham, to'lanmagan ham)
    }).catch(() => {})
  }

  const openPayDebtModal = () => {
    setPayDebtModal(true)
    setDebtPayAmount(String(selectedClientDetail.jami_qarz))
    setDebtPayType('naqd')
    setDebtPayNaqd('')
    setDebtPayKarta('')
  }

  const handlePayDebt = async () => {
    const amount = parseFloat(debtPayAmount) || 0
    if (amount <= 0) return flash('Summani kiriting!', 'error')
    if (amount > selectedClientDetail.jami_qarz) return flash('Summa qarzdan ko\'p bo\'lishi mumkin emas!', 'error')

    const body = { amount, payment_type: debtPayType }
    if (debtPayType === 'aralash') {
      body.naqd_amount = parseFloat(debtPayNaqd) || 0
      body.karta_amount = parseFloat(debtPayKarta) || 0
      if (body.naqd_amount + body.karta_amount !== amount) {
        return flash('Naqd + Karta yig\'indisi summaga teng bo\'lishi kerak!', 'error')
      }
    }

    try {
      await clientDebtApi.payTotal(selectedClientDetail.id, body)
      flash('✅ To\'lov qabul qilindi!')
      setPayDebtModal(false)
      loadClientDebts(selectedClientDetail.id)
      // mijoz jami_qarz yangilanishi uchun ro'yxatni ham yangilaymiz
      clientApi.list({ page_size: 50 }).then(res => {
        setClientsList(res.data.items || [])
        const updated = (res.data.items || []).find(c => c.id === selectedClientDetail.id)
        if (updated) setSelectedClientDetail(updated)
      }).catch(() => {})
    } catch (e) {
      const d = e.response?.data?.detail
      flash(typeof d === 'string' ? d : 'Xato yuz berdi!', 'error')
    }
  }


  // Boshqa
  const [camOk, setCamOk] = useState(false)
  const [camOn, setCamOn] = useState(false)
  const [camRunning, setCamRunning] = useState(false)   // ⬅️ YANGI — kamera ishlab turibdimi

  const [transfers, setTransfers] = useState([])
  const [stats, setStats] = useState(null)
  const [msg, setMsg] = useState(null)
  const [loading, setLoading] = useState(false)
  const [now, setNow] = useState(new Date())
  const [showLogout, setShowLogout] = useState(false)

// qoshimcha
  const [showEditClient, setShowEditClient] = useState(false)
  const [editClient, setEditClient] = useState(null)
  const [showOilForm, setShowOilForm] = useState(false)
  const [newOilRecord, setNewOilRecord] = useState({})

  const [allProducts, setAllProducts] = useState([])

  const [selectedTransfer, setSelectedTransfer] = useState(null)

  const searchRef = useRef()

  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(iv)
  }, [])

  // Hisoblash
  const total = cart.reduce((s, item) => {
    const t = item.sale_price * item.quantity
    const d = item.discount_percent > 0 ? t * item.discount_percent / 100 : (item.discount_amount || 0)
    return s + t - d
  }, 0)
  const gDiscount = gDiscPct > 0 ? total * gDiscPct / 100 : gDiscAmt
  const final = Math.max(0, total - gDiscount)
  const naqd = parseFloat(naqdAmt) || 0
  const karta = parseFloat(kartaAmt) || 0
  const totalPaid = payType === 'naqd' ? naqd : payType === 'karta' ? karta : payType === 'aralash' ? naqd + karta : 0
  const debt = payType === 'qarz' ? final : Math.max(0, final - totalPaid)
  const change = payType === 'naqd' && naqd > final ? naqd - final : 0

  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 2500) }

  const loadPages = () => kassaPageApi.list().then(r => setPages(r.data || [])).catch(() => {})

  const loadStock = () => batchApi.kassaStockView().then(r => setStock(r.data || [])).catch(() => {})

  // Bitta mahsulotning bir nechta partiyasi bo'lsa (aktiv + navbatda),
  // sotib bo'ladigan (kassada tovari bor) partiyani ustun qo'yamiz.
  const pickStock = (productId) => {
    const rows = stock.filter(x => x.product_id === productId)
    if (rows.length === 0) return null
    return rows.find(x => x.kassa_soni > 0) || rows.find(x => x.is_current) || rows[0]
  }



  const loadPageData = (n) => {
    kassaPageApi.detail(n).then(r => {
      setCart(r.data.items || [])
      setClientState(r.data.client || null)
    }).catch(() => { setCart([]); setClientState(null) })
  }

  const saveCart = (newCart, newClient) => {
    kassaPageApi.update(activePage, {
      client_id: newClient?.id || null,
      items: newCart.map(item => ({
        batch_id: item.batch_id,
        product_name: item.product_name,
        quantity: item.quantity,
        original_price: item.original_price,
        sale_price: item.sale_price,
        discount_percent: item.discount_percent || 0,
        discount_amount: item.discount_amount || 0,
        total: (item.sale_price * item.quantity) -
          (item.discount_percent > 0
            ? item.sale_price * item.quantity * item.discount_percent / 100
            : (item.discount_amount || 0))
      }))
    }).then(() => loadPages()).catch(() => {})
  }

  const handlePageChange = (n) => {
    setActivePage(n)
    setSearch(''); setResults([])
    setNaqdAmt(''); setKartaAmt('')
    setGDiscPct(0); setGDiscAmt(0)
    setNote(''); setPayType('naqd')
    setTab('cart')
    loadPageData(n)
  }

  const loadChecks = (page = 1) => {
    saleApi.list({ page, page_size: 20 }).then(r => {
      setChecks(r.data.items || [])
      setChecksTotal(r.data.total || 0)
      setChecksPage(page)
    }).catch(() => {})
  }





  const refreshAll = () => {
    loadPages()
    loadStock()
    statsApi.today().then(r => setStats(r.data)).catch(() => {})
    productApi.list({ page_size: 200 }).then(r => setAllProducts(r.data.items || [])).catch(() => {})
    if (can('ombor_tasdiqlash')) {
      transferApi.list({ status: 'yuborildi' }).then(r => setTransfers(r.data || [])).catch(() => {})
    }
    if (tab === 'checks') loadChecks(checksPage)
    flash('🔄 Yangilandi')
  }

  useEffect(() => {
    loadPages(); loadPageData(1); loadStock()
    statsApi.today().then(r => setStats(r.data)).catch(() => {})
    productApi.list({ page_size: 200 }).then(r => setAllProducts(r.data.items || [])).catch(() => {})
    if (can('ombor_tasdiqlash')) {
      transferApi.list({ status: 'yuborildi' }).then(r => setTransfers(r.data || [])).catch(() => {})
    }
  }, [])





  useEffect(() => {

    const check = () => cameraApi.status().then(r => {
      setCamOk(r.data?.cam1?.connected || false)
      setCamRunning(r.data?.cam1?.running || false)
    }).catch(() => { setCamOk(false); setCamRunning(false) })

    check()
    const iv = setInterval(check, 5000)
    return () => clearInterval(iv)
  }, [])






  useEffect(() => {
    const iv = setInterval(async () => {
      try {
        const r = await cameraApi.plates()
        if (r.data?.length > 0) {
          const p = r.data[0]
          if (p.client) { setClientState(p.client); saveCart(cart, p.client); flash(`🚗 ${p.plate} — ${p.client.full_name}`) }
          else { setNewClient(x => ({ ...x, car_number: p.plate })); setShowClientForm(true) }
        }
      } catch {}
    }, 3000)
    return () => clearInterval(iv)
  }, [activePage, cart])

  useEffect(() => {
    if (!search.trim()) { setResults([]); return }
    const timer = setTimeout(async () => {
      try {
        const r = await productApi.list({ search: search.trim(), page_size: 20 })
        setResults(r.data.items || [])
      } catch {}
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Enter' && !search && cart.length > 0 && tab === 'cart') handleSale()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [search, cart, naqd, karta, payType, client, tab])

  const addToCart = (product, batch) => {
    const newCart = [...cart]
    const idx = newCart.findIndex(x => x.batch_id === batch.id)
    if (idx >= 0) {
      newCart[idx] = { ...newCart[idx], quantity: newCart[idx].quantity + 1 }
    } else {
      newCart.push({
        batch_id: batch.id, product_name: product.name,
        original_price: batch.sale_price, sale_price: batch.sale_price,
        quantity: 1, discount_percent: 0, discount_amount: 0,
      })
    }
    setCart(newCart)
    saveCart(newCart, client)
    setTab('cart')
    setSearch(''); setResults([])
  }

  const updateQty = (batchId, qty) => {
    if (qty <= 0) { removeFromCart(batchId); return }
    const newCart = cart.map(i => i.batch_id === batchId ? { ...i, quantity: qty } : i)
    setCart(newCart); saveCart(newCart, client)
  }

  const updatePrice = (batchId, price) => {
    const newCart = cart.map(i => i.batch_id === batchId ? { ...i, sale_price: price } : i)
    setCart(newCart); saveCart(newCart, client)
  }

  const applyDiscount = () => {
    const pct = discMode === 'percent' ? parseFloat(discVal) || 0 : 0
    const amt = discMode === 'amount' ? parseFloat(discVal) || 0 : 0
    if (discTarget === 'global') {
      setGDiscPct(pct); setGDiscAmt(amt)
    } else {
      const newCart = cart.map(i => i.batch_id === discTarget ? { ...i, discount_percent: pct, discount_amount: amt } : i)
      setCart(newCart); saveCart(newCart, client)
    }
    setShowDiscModal(false); setDiscVal('')
  }

  const removeFromCart = (batchId) => {
    const newCart = cart.filter(i => i.batch_id !== batchId)
    setCart(newCart); saveCart(newCart, client)
  }

  const clearCart = () => {
    kassaPageApi.clear(activePage).then(() => {
      setCart([]); setClientState(null)
      setNaqdAmt(''); setKartaAmt('')
      setGDiscPct(0); setGDiscAmt(0); setNote('')
      loadPages()
    }).catch(() => {})
  }

  const setClient = (c) => { setClientState(c); saveCart(cart, c) }









  // ═══════════════════════════════════════════════════════════
// QAYTARISH — STATE (komponent ichiga, boshqa useState'lar yoniga qo'shing)
// Eski returnSaleId va returnSale state'larini shu bilan almashtiring
// ═══════════════════════════════════════════════════════════





// ═══════════════════════════════════════════════════════════
// QAYTARISH — STATE (komponent ichiga, useState'lar yoniga)
// Eski qaytarish state'lariga QO'SHIMCHA 3 ta yangi state
// ═══════════════════════════════════════════════════════════

  // Qaytarish
  const [returnSearch, setReturnSearch] = useState('')
  const [returnResults, setReturnResults] = useState([])
  const [returnSale, setReturnSale] = useState(null)
  const [returnQty, setReturnQty] = useState({})
  const [returnLoading, setReturnLoading] = useState(false)
  const [returnType, setReturnType] = useState('naqd')     // YANGI — naqd/karta/aralash/qarz
  const [returnNaqd, setReturnNaqd] = useState('')          // YANGI — aralash: naqd summa
  const [returnKarta, setReturnKarta] = useState('')        // YANGI — aralash: karta summa


// ═══════════════════════════════════════════════════════════
// QAYTARISH — FUNKSIYALAR (komponent ichiga, return( dan oldin)
// ═══════════════════════════════════════════════════════════

  // Qidirish
  const doReturnSearch = () => {
    if (!returnSearch.trim()) return
    setReturnSale(null)
    saleApi.search(returnSearch.trim())
      .then(r => setReturnResults(r.data.items || []))
      .catch(() => { setReturnResults([]); flash('Qidiruvda xato', 'error') })
  }

  // Chekni ochish
  const openReturnSale = (sale) => {
    saleApi.detail(sale.id)
      .then(r => { setReturnSale(r.data); setReturnQty({}); setReturnType('naqd') })
      .catch(() => setReturnSale(sale))
  }

  // Tozalash
  const clearReturn = () => {
    setReturnSearch('')
    setReturnResults([])
    setReturnSale(null)
    setReturnQty({})
    setReturnType('naqd')
    setReturnNaqd('')
    setReturnKarta('')
  }



  // Qayta yuklash
  const reloadReturnSale = (saleId) => {
    saleApi.detail(saleId).then(r => setReturnSale(r.data)).catch(() => {})
  }

  // Bitta mahsulot uchun qaytariladigan summani hisoblash (umumiy chegirma proporsional hisobga olinadi)
  const calcItemReturn = (item, qtyOverride) => {
    if (!returnSale || !item.quantity) return 0
    const q = qtyOverride != null ? qtyOverride : item.quantity
    if (!q || q <= 0) return 0
    const unitPrice = item.total / item.quantity
    const lineGross = unitPrice * q
    const ratio = returnSale.total_amount ? (returnSale.discount_amount || 0) / returnSale.total_amount : 0
    const discountPortion = Math.round((lineGross * ratio) / 1000) * 1000
    return Math.max(0, Math.round((lineGross - discountPortion) / 1000) * 1000)
  }

  // Hozir miqdor kiritilgan barcha qatorlar bo'yicha kutilayotgan jami qaytarish summasi
  const returnExpectedTotal = returnSale
    ? (returnSale.items || [])
        .filter(i => i.is_active)
        .reduce((sum, i) => {
          const raw = returnQty[i.id]
          const q = raw ? parseFloat(raw) : 0
          return q > 0 ? sum + calcItemReturn(i, q) : sum
        }, 0)
    : 0





  // Qaytarish parametrlarini yig'ish (usul bo'yicha)
  const buildReturnParams = (qty) => {
    const p = { return_type: returnType }
    if (qty) p.quantity = qty
    if (returnType === 'aralash') {
      p.naqd_amount = parseFloat(returnNaqd) || 0
      p.karta_amount = parseFloat(returnKarta) || 0
    }
    return p
  }

  // Bitta mahsulotni qaytarish
  const returnOneItem = (itemId) => {
    const raw = returnQty[itemId]
    const qty = raw ? parseFloat(raw) : null
    saleApi.returnItem(returnSale.id, itemId, buildReturnParams(qty))
      .then(() => {
        flash('✅ Qaytarildi!')
        setReturnQty(p => { const n = { ...p }; delete n[itemId]; return n })
        setReturnNaqd(''); setReturnKarta('')
        reloadReturnSale(returnSale.id)
        loadStock()
        statsApi.today().then(r => setStats(r.data)).catch(() => {})
      })
      .catch(e => {
        const d = e.response?.data?.detail
        flash(typeof d === 'string' ? d : 'Xato yuz berdi!', 'error')
      })
  }



  // Butun chekni qaytarish
  const returnWholeSale = async () => {
    if (!returnSale) return
    setReturnLoading(true)
    const activeItems = returnSale.items.filter(i => i.is_active)

    // Aralash bo'lsa — kassir kiritgan naqd summasini itemlarga taqsimlaymiz
    let naqdQoldi = returnType === 'aralash' ? (parseFloat(returnNaqd) || 0) : 0

    try {
      for (const item of activeItems) {
        const params = { return_type: returnType }

        if (returnType === 'aralash') {
          // Shu item qancha qaytadi (chegirmali)
          const itemQaytarish = Math.round((item.total || 0) / 1000) * 1000
          // Qolgan naqddan shu item uchun ajratamiz
          const itemNaqd = Math.min(naqdQoldi, itemQaytarish)
          params.naqd_amount = itemNaqd
          naqdQoldi -= itemNaqd
        }

        await saleApi.returnItem(returnSale.id, item.id, params)
      }




      flash('✅ Butun chek qaytarildi!')
      setReturnNaqd(''); setReturnKarta('')
      reloadReturnSale(returnSale.id)
      loadStock()
      statsApi.today().then(r => setStats(r.data)).catch(() => {})
    } catch (e) {
      const d = e.response?.data?.detail
      flash(typeof d === 'string' ? d : 'Xato yuz berdi!', 'error')
    }
    setReturnLoading(false)
  }










  const handleSale = async () => {
    if (!cart.length) return flash('Savatcha bo\'sh!', 'error')
    if (payType === 'naqd' && !naqdAmt) return flash('Naqd summani kiriting!', 'error')
    if (payType === 'karta' && !kartaAmt) return flash('Karta summani kiriting!', 'error')
    if (payType === 'aralash' && !naqdAmt && !kartaAmt) return flash('Summa kiriting!', 'error')
    if ((payType === 'qarz' || debt > 0) && !client) return flash('Qarz uchun mijoz tanlang!', 'error')
    setLoading(true)
    try {
      const paid_amount = payType === 'naqd' ? naqd : payType === 'karta' ? karta : payType === 'aralash' ? naqd + karta : 0

      const res = await saleApi.create({
        page_number: activePage, client_id: client?.id || null,
        items: cart.map(i => ({
          batch_id: i.batch_id, quantity: i.quantity,
          original_price: i.original_price, sale_price: i.sale_price,
          discount_percent: i.discount_percent || 0, discount_amount: i.discount_amount || 0,
        })),
        discount_percent: gDiscPct, discount_amount: gDiscAmt,
        paid_amount,
        naqd_amount: (payType === 'naqd' || payType === 'aralash') ? naqd : 0,   // ⬅️ YANGI
        karta_amount: (payType === 'karta' || payType === 'aralash') ? karta : 0, // ⬅️ YANG
        payment_type: payType, note: note || null,
      })
      try { await printerApi.receipt(res.data.id) } catch {}
      flash(`✅ Chek #${res.data.id} — ${fmt(final)} so'm`)
      await kassaPageApi.clear(activePage)
      setCart([]); setClientState(null)
      setNaqdAmt(''); setKartaAmt('')
      setGDiscPct(0); setGDiscAmt(0); setNote(''); setPayType('naqd')
      loadPages(); loadStock()
      statsApi.today().then(r => setStats(r.data)).catch(() => {})
    } catch (e) {
      const d = e.response?.data?.detail
      flash(typeof d === 'string' ? d : 'Xato yuz berdi!', 'error')
    }
    setLoading(false)
  }

  const handleCalcBtn = (btn) => {
    const setAmt = activeInput === 'naqd' ? setNaqdAmt : setKartaAmt
    if (btn === 'OK') { handleSale(); return }
    if (btn === '+10K') { setAmt(p => String((parseFloat(p) || 0) + 10000)); return }
    if (btn === '+50K') { setAmt(p => String((parseFloat(p) || 0) + 50000)); return }
    if (btn === '⌫') { setAmt(p => p.slice(0, -1)); return }
    setAmt(p => (p || '') + btn)
  }

  const tabStyle = (key) => ({
    padding: '7px 12px', border: 'none', cursor: 'pointer',
    borderBottom: tab === key ? '2px solid var(--accent)' : '2px solid transparent',
    background: 'none', color: tab === key ? 'var(--accent)' : 'var(--text2)',
    fontSize: 12, fontWeight: tab === key ? 700 : 500, whiteSpace: 'nowrap'
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>

      {/* HEADER */}
      <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 12px', height: 46, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--accent)', minWidth: 70 }}>KASSA</div>
        <div style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--mono)' }}>
          # <span style={{ color: 'var(--blue)', fontWeight: 700 }}>{String(activePage).padStart(6, '0')}</span>
        </div>
        <div style={{ flex: 1, position: 'relative', maxWidth: 460 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text2)', fontSize: 13 }}>🔍</span>
          <input ref={searchRef} type="text"
            placeholder="Mahsulot nomi, barcode, ID..."
            value={search}
            onChange={e => { setSearch(e.target.value); if (e.target.value) setTab('search') }}
            style={{ ...S.input, paddingLeft: 32, height: 32, fontSize: 13 }} />
          {search && (
            <button onClick={() => { setSearch(''); setResults([]) }}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', fontSize: 14, cursor: 'pointer', border: 'none', color: 'var(--text2)' }}>✕</button>
          )}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: camOk ? 'var(--accent-light)' : 'var(--surface2)', fontSize: 11, fontWeight: 700, color: camOk ? 'var(--accent)' : 'var(--text2)' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: camOk ? 'var(--accent)' : 'var(--text2)', display: 'inline-block', animation: camOk ? 'pulse 2s infinite' : 'none' }} />
          {camOk ? 'ONLINE' : 'OFFLINE'}
        </div>


        {/* Kamera yoqish/o'chirish */}
        <button
          onClick={() => {
            if (camRunning) {
              cameraApi.stop().then(() => { setCamRunning(false); setCamOn(false); flash('📴 Kamera o\'chirildi') }).catch(() => flash('Xato!', 'error'))
            } else {
              cameraApi.start().then(() => { setCamRunning(true); flash('📷 Kamera yoqildi') }).catch(() => flash('Xato!', 'error'))
            }
          }}
          style={{ ...S.btnGray, padding: '4px 8px', fontSize: 11, fontWeight: 700, color: camRunning ? 'var(--accent)' : 'var(--text2)' }}>
          {camRunning ? '📷 Kamera ON' : '📴 Kamera OFF'}
        </button>

        {/* Oynani ko'rsatish/yashirish — faqat kamera ishlab tursa */}
        {camRunning && (
          <button
            onClick={() => setCamOn(x => !x)}
            style={{ ...S.btnGray, padding: '4px 8px', fontSize: 13, color: camOn ? 'var(--accent)' : 'var(--text2)' }}>
            {camOn ? '🙈 Yashirish' : '📹 Ko\'rish'}
          </button>
        )}


        <span style={{ fontSize: 12, color: 'var(--text2)' }}>👤 <b>{user?.username}</b></span>

        <button onClick={toggle} style={{ ...S.btnGray, padding: '4px 8px', fontSize: 14 }}>{dark ? '☀️' : '🌙'}</button>
        <button onClick={refreshAll} title="Ma'lumotlarni yangilash" style={{ ...S.btnGray, padding: '4px 8px', fontSize: 14 }}>🔄</button>


        <button onClick={() => setShowLogout(true)} style={{ ...S.btnRed, padding: '5px 10px' }}>↩ Chiqish</button>
      </header>

      {/* KONTENT */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* CHAP 55% */}
        <div style={{ width: '55%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--surface)', borderRight: '1px solid var(--border)' }}>

          {/* TABLAR */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0, overflowX: 'auto' }}>
            <button style={tabStyle('cart')} onClick={() => setTab('cart')}>
              🛒 Savatcha
              {cart.length > 0 && <span style={{ marginLeft: 4, background: 'var(--accent)', color: '#fff', borderRadius: 10, padding: '0 5px', fontSize: 10 }}>{cart.length}</span>}
            </button>
            <button style={tabStyle('search')} onClick={() => { setTab('search'); setTimeout(() => searchRef.current?.focus(), 50) }}>🔍 Mahsulotlar</button>
            {can('qaytarish') && <button style={tabStyle('return')} onClick={() => setTab('return')}>↩ Qaytarish</button>}
            {can('check_royxati') && <button style={tabStyle('checks')} onClick={() => { setTab('checks'); loadChecks(1) }}>🧾 Cheklar</button>}
            {can('mijoz_royxati') && <button style={tabStyle('clients')} onClick={() => { setTab('clients'); clientApi.list({ page_size: 50 }).then(r => setClientsList(r.data.items || [])).catch(() => {}) }}>👤 Mijozlar</button>}
            {can('narx_yorligi') && <button style={tabStyle('label')} onClick={() => setTab('label')}>🏷️ Narx yorlig'i</button>}
          </div>

          <div style={{ flex: 1, overflow: 'auto' }}>

            {/* SAVATCHA */}
            {tab === 'cart' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ padding: '5px 12px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface2)', flexShrink: 0 }}>
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>
                    Jami: <b style={{ color: 'var(--text)', fontFamily: 'var(--mono)' }}>{cart.reduce((s, i) => s + i.quantity, 0)}</b> ta
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {cart.length > 0 && can('savatchani_tozalash') && (
                      <button onClick={clearCart} style={{ ...S.btnRed, padding: '3px 10px', fontSize: 12 }}>🗑 Tozalash</button>
                    )}
                  </div>
                </div>

                {cart.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)' }}>
                    <div style={{ fontSize: 44, marginBottom: 10 }}>🛒</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>Savatcha bo'sh</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>Barcode skanerlang yoki mahsulot qidiring</div>
                  </div>
                ) : (
                  <div style={{ flex: 1, overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={S.th}>№</th>
                          <th style={S.th}>Mahsulot nomi</th>
                          <th style={{ ...S.th, textAlign: 'right' }}>Narx</th>
                          <th style={{ ...S.th, textAlign: 'center' }}>Soni</th>
                          <th style={{ ...S.th, textAlign: 'center' }}>Kassada</th>
                          <th style={{ ...S.th, textAlign: 'right' }}>To'lanadigan</th>
                          <th style={{ ...S.th, textAlign: 'right' }}>Jami</th>
                          <th style={S.th}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {cart.map((item, idx) => {

                          const s = stock.find(x => x.batch_id === item.batch_id)
                          const kassaQty = s?.kassa_soni || 0

                          const lineTotal = item.sale_price * item.quantity
                          const lineDisc = item.discount_percent > 0
                            ? lineTotal * item.discount_percent / 100
                            : (item.discount_amount || 0)
                          return (
                            <tr key={item.batch_id} style={{ background: idx % 2 === 0 ? 'var(--surface)' : 'var(--surface2)' }}>
                              <td style={S.td}>{idx + 1}</td>
                              <td style={S.td}>
                                <div style={{ fontWeight: 500 }}>{item.product_name}</div>
                                {lineDisc > 0 && <div style={{ fontSize: 10, color: 'var(--accent)' }}>-{fmt(lineDisc)} chegirma</div>}
                              </td>
                              <td style={{ ...S.td, textAlign: 'right' }}>
                                {can('narx_ozgartirish') ? (
                                  <input type="number" value={item.sale_price}
                                    onChange={e => updatePrice(item.batch_id, parseFloat(e.target.value) || 0)}
                                    style={{ width: 85, textAlign: 'right', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 5px', background: 'var(--surface2)', color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 12 }} />
                                ) : (
                                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{fmt(item.sale_price)}</span>
                                )}
                              </td>
                              <td style={{ ...S.td, textAlign: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                  <button onClick={() => updateQty(item.batch_id, item.quantity - 1)}
                                    style={{ width: 24, height: 24, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--danger-light)', color: 'var(--danger)', fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                                  <span style={{ minWidth: 28, textAlign: 'center', fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 13 }}>{item.quantity}</span>
                                  <button onClick={() => updateQty(item.batch_id, item.quantity + 1)}
                                    style={{ width: 24, height: 24, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--accent-light)', color: 'var(--accent)', fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                                </div>
                              </td>
                              <td style={{ ...S.td, textAlign: 'center' }}>
                                <span style={{ padding: '2px 8px', borderRadius: 4, background: kassaQty > 5 ? 'var(--accent-light)' : kassaQty > 0 ? 'var(--warning-light)' : 'var(--danger-light)', color: kassaQty > 5 ? 'var(--accent)' : kassaQty > 0 ? 'var(--warning)' : 'var(--danger)', fontWeight: 700, fontSize: 12, fontFamily: 'var(--mono)' }}>
                                  {kassaQty}
                                </span>



                              </td>

                              {/* To'lanadigan (chegirmadan keyin) */}
                              <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 800, color: 'var(--accent)', fontSize: 16, padding: '10px 12px' }}>
                                {fmt(lineTotal - lineDisc)}
                              </td>

                              {/* Jami (chegirmasiz) */}
                              <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--text2)' }}>
                                {fmt(lineTotal)}
                              </td>

                              {/* O'chirish */}
                              <td style={{ ...S.td, textAlign: 'center' }}>
                                {can('savatdan_ochirish') && (
                                  <button onClick={() => removeFromCart(item.batch_id)}
                                    style={{ background: 'none', color: 'var(--danger)', fontSize: 16, cursor: 'pointer', border: 'none' }}>✕</button>
                                )}
                              </td>

                            </tr>


                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                <div style={{ padding: '5px 12px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
                  <input type="text" placeholder="Izoh (ixtiyoriy)..." value={note}
                    onChange={e => setNote(e.target.value)} style={{ ...S.input, fontSize: 12 }} />
                </div>
              </div>
            )}

            {/* MAHSULOTLAR */}
            {tab === 'search' && (
              <div>
                {results.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={S.th}>ID</th>
                        <th style={S.th}>Mahsulot nomi</th>
                        <th style={S.th}>Barcode</th>
                        <th style={{ ...S.th, textAlign: 'right' }}>Narx (so'm)</th>
                        <th style={{ ...S.th, textAlign: 'center' }}>Kassada</th>
                        <th style={S.th}></th>
                      </tr>
                    </thead>
                    <tbody>

                      {results.map((p, idx) => {

                        const s = pickStock(p.id)
                        const qty = s?.kassa_soni || 0

                        const price = s?.sotuv_narx || 0
                        const batchId = s?.batch_id
                        const isHovered = hoveredProduct === p.id


                        return (

                          <tr key={p.id}
                              onMouseEnter={() => setHoveredProduct(p.id)}
                              onMouseLeave={() => setHoveredProduct(null)}
                              onClick={() => {
                                if (!qty) return flash('Kassada mahsulot yo\'q!', 'error')
                                if (!batchId) return flash('Stock topilmadi!', 'error')
                                addToCart(p, { id: batchId, sale_price: price })
                                flash(`✅ ${p.name}`)
                              }}
                              style={{ cursor: 'pointer', background: isHovered ? 'var(--accent-light)' : idx % 2 === 0 ? 'var(--surface)' : 'var(--surface2)' }}>

                            <td style={{ ...S.td, color: 'var(--text2)', fontSize: 12 }}>{p.id}</td>
                            <td style={S.td}>
                              <div style={{ fontWeight: 500 }}>{p.name}</div>
                            </td>
                            <td style={{ ...S.td, fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text2)' }}>{p.barcode}</td>
                            <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 600 }}>
                              {price > 0 ? fmt(price) : <span style={{ color: 'var(--warning)' }}>—</span>}
                            </td>
                            <td style={{ ...S.td, textAlign: 'center' }}>
                              <span style={{ padding: '2px 8px', borderRadius: 4, background: qty > 0 ? 'var(--accent-light)' : 'var(--danger-light)', color: qty > 0 ? 'var(--accent)' : 'var(--danger)', fontWeight: 700, fontSize: 12 }}>
                                {qty}
                              </span>
                            </td>
                            <td style={{ ...S.td, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                              {isHovered && (
                                <button
                                  onClick={() => {
                                    if (!qty) return flash('Kassada mahsulot yo\'q!', 'error')
                                    if (!batchId) return flash('Stock topilmadi!', 'error')
                                    addToCart(p, { id: batchId, sale_price: price })
                                    flash(`✅ ${p.name}`)
                                  }}
                                  style={{ ...S.btnGreen, padding: '4px 12px', fontSize: 12 }}>
                                  + Savatga
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                ) : search ? (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--text2)' }}>Topilmadi</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={S.th}>ID</th>
                        <th style={S.th}>Mahsulot nomi</th>
                        <th style={S.th}>Barcode</th>
                        <th style={S.th}>Kategoriya</th>
                        <th style={{ ...S.th, textAlign: 'right' }}>Narx (so'm)</th>
                        <th style={{ ...S.th, textAlign: 'center' }}>Kassada</th>
                        <th style={S.th}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {allProducts.map((p, idx) => {

                        const s = pickStock(p.id)
                        const qty = s?.kassa_soni || 0
                        const price = s?.sotuv_narx || 0
                        const batchId = s?.batch_id
                        const isHov = hoveredProduct === p.id

                        return (
                          <tr key={p.id}
                            onMouseEnter={() => setHoveredProduct(p.id)}
                            onMouseLeave={() => setHoveredProduct(null)}
                            onClick={() => {
                              if (!qty) return flash('Kassada mahsulot yo\'q!', 'error')
                              if (!batchId) return flash('Stock topilmadi!', 'error')
                              addToCart(p, { id: batchId, sale_price: price })
                              flash(`✅ ${p.name}`)
                            }}
                            style={{ cursor: 'pointer', background: isHov ? 'var(--accent-light)' : idx % 2 === 0 ? 'var(--surface)' : 'var(--surface2)' }}>
                            <td style={{ ...S.td, color: 'var(--text2)', fontSize: 12 }}>{p.id}</td>
                            <td style={S.td}><div style={{ fontWeight: 500 }}>{p.name}</div></td>
                            <td style={{ ...S.td, fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text2)' }}>{p.barcode}</td>
                            <td style={{ ...S.td, fontSize: 12, color: 'var(--text2)' }}>{p.category?.name || '—'}</td>
                            <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 600 }}>
                              {price > 0 ? fmt(price) : <span style={{ color: 'var(--warning)' }}>—</span>}
                            </td>
                            <td style={{ ...S.td, textAlign: 'center' }}>
                              <span style={{ padding: '2px 8px', borderRadius: 4, background: qty > 0 ? 'var(--accent-light)' : 'var(--danger-light)', color: qty > 0 ? 'var(--accent)' : 'var(--danger)', fontWeight: 700, fontSize: 12 }}>
                                {qty}
                              </span>
                            </td>
                            <td style={{ ...S.td, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                              {isHov && (
                                <button onClick={() => {
                                  if (!qty) return flash('Kassada mahsulot yo\'q!', 'error')
                                  if (!batchId) return flash('Stock topilmadi!', 'error')
                                  addToCart(p, { id: batchId, sale_price: price })
                                  flash(`✅ ${p.name}`)
                                }} style={{ ...S.btnGreen, padding: '4px 12px', fontSize: 12 }}>+ Savatga</button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}






            {/* ═══════════ QAYTARISH TAB ═══════════ */}
            {tab === 'return' && can('qaytarish') && (
              <div style={{ padding: 14 }}>

                {/* Qidiruv qatori */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text2)', fontSize: 14 }}>🔍</span>
                    <input
                      type="text"
                      placeholder="Chek ID, mijoz ismi yoki mashina raqami..."
                      value={returnSearch}
                      onChange={e => setReturnSearch(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') doReturnSearch() }}
                      style={{ ...S.input, paddingLeft: 34 }}
                    />
                  </div>
                  <button onClick={doReturnSearch} style={S.btnGreen}>Qidirish</button>
                  {(returnResults.length > 0 || returnSale) && (
                    <button onClick={clearReturn} style={{ ...S.btnGray, whiteSpace: 'nowrap' }}>✕ Tozalash</button>
                  )}
                </div>

                {/* Chek tanlanmagan — qidiruv natijalari ro'yxati */}
                {!returnSale && (
                  returnResults.length > 0 ? (
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>
                        {returnResults.length} ta chek topildi — birini tanlang:
                      </div>
                      {returnResults.map(s => (
                        <div key={s.id}
                          onClick={() => openReturnSale(s)}
                          style={{
                            padding: '11px 14px', marginBottom: 6, borderRadius: 'var(--radius)', cursor: 'pointer',
                            border: '1px solid var(--border)', background: 'var(--surface2)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-light)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'var(--surface2)'}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>Chek #{s.id}</div>
                            <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>
                              {new Date(s.created_at).toLocaleString('uz-UZ')}
                              {s.client && ` · 👤 ${s.client.full_name}`}
                              {s.client?.car_number && ` · 🚗 ${s.client.car_number}`}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--accent)', fontSize: 14 }}>{fmt(s.final_amount)}</div>
                            <div style={{ fontSize: 10, color: 'var(--text2)' }}>
                              {s.payment_type === 'naqd' ? '💵 Naqd' : s.payment_type === 'karta' ? '💳 Karta' : s.payment_type === 'aralash' ? '💵+💳' : '📋 Qarz'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    returnSearch && (
                      <div style={{ padding: 30, textAlign: 'center', color: 'var(--text2)' }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                        Chek topilmadi. ID, ism yoki mashina raqamini tekshiring.
                      </div>
                    )
                  )
                )}

                {/* Chek tanlangan — jadval + usul tugmalari + qaytarish */}
                {returnSale && (
                  <div>
                    {/* Chek sarlavhasi */}
                    <div style={{ padding: '10px 14px', background: 'var(--surface2)', borderRadius: 'var(--radius)', marginBottom: 12, border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>Chek #{returnSale.id}</span>
                        <span style={{ fontSize: 12, color: 'var(--text2)', marginLeft: 10 }}>
                          {new Date(returnSale.created_at).toLocaleString('uz-UZ')}
                        </span>
                        {returnSale.client && (
                          <span style={{ fontSize: 12, color: 'var(--text2)', marginLeft: 8 }}>· 👤 {returnSale.client.full_name}</span>
                        )}
                      </div>
                      <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--accent)', fontSize: 15 }}>
                        {fmt(returnSale.final_amount)} so'm
                      </div>
                    </div>

                    {/* Mahsulotlar jadvali */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14 }}>
                      <thead>
                        <tr style={{ background: 'var(--surface2)' }}>
                          <th style={{ ...S.th, textAlign: 'left' }}>Mahsulot</th>
                          <th style={{ ...S.th, textAlign: 'center' }}>Soni</th>
                          <th style={{ ...S.th, textAlign: 'right' }}>Narx</th>
                          <th style={{ ...S.th, textAlign: 'right' }}>Jami</th>
                          <th style={{ ...S.th, textAlign: 'center' }}>Qaytarish</th>
                          <th style={{ ...S.th, textAlign: 'center' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {returnSale.items?.map((item, idx) => {
                          const unitPrice = item.quantity ? item.total / item.quantity : 0
                          const qty = returnQty[item.id] ?? ''
                          return (
                            <tr key={item.id} style={{ background: item.is_active ? (idx % 2 === 0 ? 'var(--surface)' : 'var(--surface2)') : 'var(--danger-light)', opacity: item.is_active ? 1 : 0.55 }}>
                              <td style={{ ...S.td, fontWeight: 500 }}>{item.batch?.product?.name}</td>
                              <td style={{ ...S.td, textAlign: 'center', fontFamily: 'var(--mono)' }}>{item.quantity}</td>
                              <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12 }}>{fmt(unitPrice)}</td>
                              <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--accent)' }}>{fmt(item.total)}</td>


                              <td style={{ ...S.td, textAlign: 'center' }}>
                                {item.is_active ? (
                                  <div>
                                    <input
                                      type="number" min="1" max={item.quantity}
                                      placeholder={String(item.quantity)}
                                      value={qty}
                                      onChange={e => setReturnQty(p => ({ ...p, [item.id]: e.target.value }))}
                                      style={{ width: 64, textAlign: 'center', border: '1px solid var(--border)', borderRadius: 4, padding: '4px', background: 'var(--surface2)', color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 13 }}
                                    />
                                    <div style={{ fontSize: 10, color: 'var(--accent)', marginTop: 3, fontFamily: 'var(--mono)' }}>
                                      ≈ {fmt(calcItemReturn(item, qty ? parseFloat(qty) : item.quantity))}
                                    </div>
                                  </div>
                                ) : (
                                  <span style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 600 }}>✕ Qaytarilgan</span>
                                )}
                              </td>



                              <td style={{ ...S.td, textAlign: 'center' }}>
                                {item.is_active && (
                                  <button
                                    onClick={() => returnOneItem(item.id)}
                                    style={{ ...S.btnRed, padding: '5px 12px' }}>
                                    Qaytarish
                                  </button>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>

                    {/* Aktiv mahsulot bo'lsa — usul tugmalari + butun chek */}
                    {returnSale.items?.some(i => i.is_active) && (
                      <div style={{ padding: '12px 14px', background: 'var(--surface2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>

                        {/* Usul tanlash — qator tugmalar */}
                        <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>Qaytarish usuli:</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
                          {[
                            { v: 'naqd',    l: '💵 Naqd',    c: 'var(--accent)' },
                            { v: 'karta',   l: '💳 Karta',   c: 'var(--blue)' },
                            { v: 'aralash', l: '💵+💳 Aralash', c: 'var(--warning)' },
                            { v: 'qarz',    l: '📋 Qarzga',  c: 'var(--danger)' },
                          ].map(o => (
                            <button key={o.v} onClick={() => setReturnType(o.v)}
                              style={{
                                padding: '10px', borderRadius: 'var(--radius)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                                border: `1.5px solid ${returnType === o.v ? o.c : 'var(--border)'}`,
                                background: returnType === o.v ? 'var(--accent-light)' : 'var(--surface)',
                                color: returnType === o.v ? o.c : 'var(--text)',
                              }}>{o.l}</button>
                          ))}
                        </div>



                        {/* Kutilayotgan jami qaytarish summasi — miqdor kiritilgan qatorlar bo'yicha */}
                        {returnExpectedTotal > 0 && (
                          <div style={{ padding: '8px 12px', background: 'var(--accent-light)', borderRadius: 6, marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 12, color: 'var(--accent)' }}>Kutilayotgan qaytarish summasi:</span>
                            <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--accent)', fontSize: 14 }}>{fmt(returnExpectedTotal)} so'm</span>
                          </div>
                        )}

                        {/* Aralash bo'lsa — naqd kiritiladi, karta avtomatik hisoblanadi */}
                        {returnType === 'aralash' && (
                          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>💵 Naqd:</div>
                              <input type="number" value={returnNaqd} onChange={e => setReturnNaqd(e.target.value)}
                                placeholder="0" style={{ ...S.input, fontFamily: 'var(--mono)' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>💳 Karta (avtomatik):</div>
                              <input type="number" readOnly
                                value={Math.max(0, returnExpectedTotal - (parseFloat(returnNaqd) || 0))}
                                style={{ ...S.input, fontFamily: 'var(--mono)', opacity: 0.7, cursor: 'not-allowed' }} />
                            </div>
                          </div>
                        )}



                        {/* Butun chekni qaytarish */}
                        <button
                          onClick={returnWholeSale}
                          disabled={returnLoading}
                          style={{
                            width: '100%', padding: '12px', borderRadius: 'var(--radius)',
                            background: 'var(--danger-light)', color: 'var(--danger)', fontSize: 14, fontWeight: 700,
                            border: '1.5px solid var(--danger)', cursor: returnLoading ? 'not-allowed' : 'pointer',
                            opacity: returnLoading ? 0.6 : 1,
                          }}>
                          ↩ Butun chekni qaytarish ({
                            returnType === 'naqd' ? 'Naqd' : returnType === 'karta' ? 'Karta' : returnType === 'aralash' ? 'Aralash' : 'Qarzga'
                          })
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}







            {/* CHEKLAR */}
            {tab === 'checks' && can('check_royxati') && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {checks.map(s => (
                    <div key={s.id}

                      onClick={() => selectedCheck?.id === s.id ? setSelectedCheck(null) : openCheckDetail(s)}

                      style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: selectedCheck?.id === s.id ? 'var(--surface2)' : 'transparent' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                      onMouseLeave={e => e.currentTarget.style.background = selectedCheck?.id === s.id ? 'var(--surface2)' : 'transparent'}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>Chek #{s.id}</div>
                          <div style={{ fontSize: 11, color: 'var(--text2)' }}>
                            {new Date(s.created_at).toLocaleString('uz-UZ')}
                            {s.client && ` · 👤 ${s.client.full_name}`}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--accent)', fontSize: 14 }}>{fmt(s.final_amount)}</div>
                          <div style={{ fontSize: 10 }}>
                            {s.payment_type === 'naqd' ? '💵 Naqd' : s.payment_type === 'karta' ? '💳 Karta' : s.payment_type === 'aralash' ? '💵+💳' : '📋 Qarz'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {checks.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: 'var(--text2)' }}>Cheklar yo'q</div>}
                </div>

                {/* Pagination */}
                <div style={{ padding: '6px 12px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>Jami: {checksTotal} ta</span>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <button onClick={() => loadChecks(checksPage - 1)} disabled={checksPage === 1}
                      style={{ ...S.btnGray, padding: '4px 10px', fontSize: 12, opacity: checksPage === 1 ? 0.4 : 1 }}>←</button>
                    <span style={{ fontSize: 12, color: 'var(--text2)', padding: '0 8px' }}>{checksPage}</span>
                    <button onClick={() => loadChecks(checksPage + 1)} disabled={checksPage * 20 >= checksTotal}
                      style={{ ...S.btnGray, padding: '4px 10px', fontSize: 12, opacity: checksPage * 20 >= checksTotal ? 0.4 : 1 }}>→</button>
                  </div>
                </div>
              </div>
            )}

            {/* MIJOZLAR */}
            {tab === 'clients' && can('mijoz_royxati') && (
              <div style={{ display: 'flex', height: '100%' }}>

                {/* A qism — chap ro'yxat */}

                <div style={{ width: '26%', minWidth: 220, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>

                  <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <input type="text" placeholder="Ism, tel, mashina..."
                      value={clientSearch}
                      onChange={e => {
                        setClientSearch(e.target.value)
                        clientApi.list({ search: e.target.value, page_size: 50 }).then(r => setClientsList(r.data.items || [])).catch(() => {})
                      }}
                      style={{ ...S.input, height: 32 }} />
                    <button onClick={() => setShowClientForm(true)} style={{ ...S.btnGreen, width: '100%', padding: '6px', fontSize: 12 }}>
                      + Yangi mijoz
                    </button>
                  </div>

                  <div style={{ flex: 1, overflowY: 'auto' }}>
                    {clientsList.map(c => {
                      const lastOil = c.last_oil_record
                      return (
                        <div key={c.id}


                          onClick={() => {
                            setSelectedClientDetail(c)
                            setClient(c)
                            oilRecordApi.list(c.id, { page_size: 50 }).then(r => setClientOilRecords(r.data.items || [])).catch(() => {})
                            loadClientDebts(c.id)
                          }}


                          style={{
                            padding: '10px 12px', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                            background: selectedClientDetail?.id === c.id ? 'var(--accent-light)' : 'transparent'
                          }}
                          onMouseEnter={e => { if (selectedClientDetail?.id !== c.id) e.currentTarget.style.background = 'var(--surface2)' }}
                          onMouseLeave={e => { if (selectedClientDetail?.id !== c.id) e.currentTarget.style.background = 'transparent' }}>

                          {/* Ism */}
                          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{c.full_name}</div>

                          {/* Telefon */}
                          {c.phone && <div style={{ fontSize: 11, color: 'var(--text2)' }}>📞 {c.phone}</div>}

                          {/* Mashina */}
                          {c.car_number && <div style={{ fontSize: 11, color: 'var(--text2)' }}>🚗 {c.car_number} {c.car_model && `(${c.car_model})`}</div>}

                          {/* Qarz */}
                          {c.jami_qarz > 0 && (
                            <div style={{ fontSize: 11, color: 'var(--danger)', fontFamily: 'var(--mono)', fontWeight: 600 }}>
                              -{fmt(c.jami_qarz)} so'm
                            </div>
                          )}



                          {/* Probeg sanalari */}
                          {c.last_oil_date && (
                            <div style={{ marginTop: 4, display: 'flex', gap: 6 }}>
                              <span style={{ fontSize: 10, padding: '1px 6px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text2)' }}>
                                🛢 {c.last_oil_date}
                              </span>
                              {c.next_oil_date && (
                                <span style={{ fontSize: 10, padding: '1px 6px', background: 'var(--warning-light)', border: '1px solid var(--warning)', borderRadius: 4, color: 'var(--warning)', fontWeight: 600 }}>
                                  📅 {c.next_oil_date}
                                </span>
                              )}
                            </div>
                          )}

                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* B qism — o'ng detail */}
                <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                  {selectedClientDetail ? (
                    <div>
                      {/* Mijoz header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                        <div style={{ fontWeight: 800, fontSize: 18 }}>👤 {selectedClientDetail.full_name}</div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => { setClient(selectedClientDetail); flash(`👤 ${selectedClientDetail.full_name} tanlandi`) }}
                            style={{ ...S.btnGreen, padding: '5px 12px', fontSize: 12 }}>
                            ✓ Tanlash
                          </button>
                          <button
                            onClick={() => {
                              setEditClient({ ...selectedClientDetail })
                              setShowEditClient(true)
                            }}
                            style={{ ...S.btnGray, padding: '5px 12px', fontSize: 12 }}>
                            ✏️ Tahrirlash
                          </button>
                        </div>
                      </div>



                      {/* Umumiy qarz — bitta qator, to'lov va tarix tugmalari */}
                      {selectedClientDetail.jami_qarz > 0 && (
                        <div style={{ border: '1px solid var(--danger)', borderRadius: 8, marginBottom: 16, overflow: 'hidden' }}>
                          <div style={{ padding: '12px 16px', background: 'var(--danger-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--danger)', marginBottom: 3 }}>💳 Jami qarz</div>
                              <div style={{ fontFamily: 'var(--mono)', fontWeight: 800, fontSize: 19, color: 'var(--danger)' }}>
                                {fmt(selectedClientDetail.jami_qarz)} so'm
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button onClick={() => setShowDebtHistory(true)} style={{ ...S.btnGray, padding: '8px 12px', fontSize: 12 }}>📜 Tarix</button>
                              <button onClick={openPayDebtModal} style={{ ...S.btnGreen, padding: '8px 14px', fontSize: 12 }}>💰 To'lov qilish</button>
                            </div>
                          </div>
                        </div>
                      )}




                      {/* Excel jadval */}
                      <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflowX: 'auto' }}>

                        <table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse' }}>
                          <tbody>
                            {[
                              { label: 'Ism familiya', value: selectedClientDetail.full_name, bold: true },
                              { label: 'Telefon', value: selectedClientDetail.phone || '—' },
                              { label: 'Mashina raqami', value: selectedClientDetail.car_number || '—' },
                              { label: 'Mashina rusumi', value: selectedClientDetail.car_model || '—' },
                              {
                                label: 'Qarz',
                                value: `${fmt(selectedClientDetail.jami_qarz)} so'm`,
                                color: selectedClientDetail.jami_qarz > 0 ? 'var(--danger)' : 'var(--accent)',
                                bold: true
                              },
                              ...(selectedClientDetail.note ? [{ label: 'Izoh', value: selectedClientDetail.note }] : []),
                            ].map(({ label, value, bold, color }, idx) => (
                              <tr key={label} style={{ background: idx % 2 === 0 ? 'var(--surface)' : 'var(--surface2)' }}>
                                <td style={{
                                  padding: '10px 14px',
                                  fontSize: 12,
                                  color: 'var(--text2)',
                                  fontWeight: 600,
                                  borderBottom: '1px solid var(--border)',
                                  borderRight: '1px solid var(--border)',
                                  width: '35%',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {label}
                                </td>
                                <td style={{
                                  padding: '10px 14px',
                                  fontSize: 13,
                                  fontWeight: bold ? 700 : 400,
                                  color: color || 'var(--text)',
                                  borderBottom: '1px solid var(--border)',
                                }}>
                                  {value}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Probeg daftarchasi */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>🛢️ Probeg daftarchasi</div>
                        <button
                          onClick={() => {
                            setNewOilRecord({
                              client_id: selectedClientDetail.id,
                              date: new Date().toISOString().split('T')[0],
                              oil_brand: '', oil_type: '', mileage: '',
                              transmission: 'AKPP', next_date: '',
                              oil_filter: false, air_filter: false,
                              salon_filter: false, spark_plug: false,
                              fuel_filter: false, pampers: false,
                              master_name: '', master_phone: '', note: ''
                            })
                            setShowOilForm(true)
                          }}
                          style={{ ...S.btnGreen, padding: '5px 12px', fontSize: 12 }}>
                          + Yangi yozuv
                        </button>
                      </div>

                      {clientOilRecords.length === 0 ? (
                        <div style={{ color: 'var(--text2)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>
                          Probeg yozuvi yo'q
                        </div>
                      ) : (
                        <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ background: 'var(--surface2)' }}>
                                {['Sana', 'Moy', 'Probeg', 'Karobka', 'Keyingi kelish', 'Almashtirilganlar', 'Usta', 'Izoh', ''].map(h => (
                                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text2)', borderBottom: '2px solid var(--border)', borderRight: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {clientOilRecords.map((r, idx) => (
                                <tr key={r.id} style={{ background: idx % 2 === 0 ? 'var(--surface)' : 'var(--surface2)' }}>
                                  <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', fontSize: 12, whiteSpace: 'nowrap' }}>
                                    📅 {r.date}
                                  </td>
                                  <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', fontSize: 12, whiteSpace: 'nowrap' }}>
                                    <div style={{ fontWeight: 600 }}>{r.oil_brand}</div>
                                    <div style={{ color: 'var(--text2)', fontSize: 11 }}>{r.oil_type}</div>
                                  </td>
                                  <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', fontFamily: 'var(--mono)', fontSize: 12, whiteSpace: 'nowrap' }}>
                                    {r.mileage ? `${fmt(r.mileage)} km` : '—'}
                                  </td>
                                  <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', fontSize: 12 }}>
                                    {r.transmission || '—'}
                                  </td>
                                  <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', fontSize: 12, whiteSpace: 'nowrap' }}>
                                    {r.next_date ? <span style={{ color: 'var(--warning)', fontWeight: 600 }}>🔔 {r.next_date}</span> : '—'}
                                  </td>
                                  <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                      {[
                                        r.oil_filter && 'Moy filtri',
                                        r.air_filter && 'Havo filtri',
                                        r.salon_filter && 'Salon filtri',
                                        r.spark_plug && 'Shamlar',
                                        r.fuel_filter && 'Yoqilg\'i filtri',
                                        r.pampers && 'Pampers'
                                      ].filter(Boolean).map(f => (
                                        <span key={f} style={{ padding: '1px 5px', background: 'var(--accent-light)', color: 'var(--accent)', borderRadius: 3, fontSize: 10, fontWeight: 600 }}>✓ {f}</span>
                                      ))}
                                      {![r.oil_filter, r.air_filter, r.salon_filter, r.spark_plug, r.fuel_filter, r.pampers].some(Boolean) && <span style={{ color: 'var(--text2)', fontSize: 11 }}>—</span>}
                                    </div>
                                  </td>
                                  <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', fontSize: 12 }}>
                                    {r.master_name ? <div>{r.master_name}<div style={{ fontSize: 10, color: 'var(--text2)' }}>{r.master_phone}</div></div> : '—'}
                                  </td>
                                  <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', fontSize: 12, color: 'var(--text2)', fontStyle: 'italic' }}>
                                    {r.note || '—'}
                                  </td>
                                  <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                                    <button onClick={() => {
                                      if (window.confirm('O\'chirasizmi?')) {
                                        oilRecordApi.delete(r.id)
                                          .then(() => { setClientOilRecords(p => p.filter(x => x.id !== r.id)); flash('✅ O\'chirildi!') })
                                          .catch(() => flash('Xato!', 'error'))
                                      }
                                    }} style={{ background: 'none', color: 'var(--text2)', fontSize: 14, cursor: 'pointer', border: 'none' }}>✕</button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text2)', fontSize: 14 }}>
                      👈 Chap tarafdan mijozni tanlang
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* NARX YORLIG'I */}
            {tab === 'label' && can('narx_yorligi') && (
              <div style={{ padding: 14 }}>
                {cart.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--text2)' }}>
                    Savatcha bo'sh — yorliq chiqarish uchun mahsulot qo'shing
                  </div>
                ) : (
                  <>
                    <div style={{ marginBottom: 14, fontSize: 13, color: 'var(--text2)' }}>
                      Qaysi mahsulot uchun yorliq chiqarasiz?
                    </div>

                    {cart.map(item => (
                      <div key={item.batch_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 8, marginBottom: 8, border: '1px solid var(--border)', background: 'var(--surface2)' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{item.product_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>
                            {fmt(item.sale_price)} so'm · {item.quantity} ta
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            labelApi.print({ batch_id: item.batch_id, quantity: item.quantity })
                              .then(() => flash(`🏷️ ${item.product_name} yorlig'i chiqarildi!`))
                              .catch(() => flash('Printer ulanmagan!', 'error'))
                          }}
                          style={{ ...S.btnGreen, padding: '6px 14px', fontSize: 12 }}>
                          🖨️ Chiqar
                        </button>
                      </div>
                    ))}

                    {/* Hammasi uchun */}
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 4 }}>
                      <button
                        onClick={() => {
                          Promise.all(
                            cart.map(item => labelApi.print({ batch_id: item.batch_id, quantity: item.quantity }))
                          )
                            .then(() => flash('🏷️ Barcha yorliqlar chiqarildi!'))
                            .catch(() => flash('Printer xatosi!', 'error'))
                        }}
                        style={{ ...S.btnGreen, width: '100%', padding: '10px', fontSize: 13 }}>
                        🏷️ Hammasi uchun chiqarish
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

          </div>
        </div>

        {/* O'NG 45% */}
        <div style={{ width: '45%', display: 'flex', flexDirection: 'column', background: 'var(--surface)', flexShrink: 0 }}>

          {/* Mijoz qidiruv */}
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', background: client ? 'var(--accent-light)' : 'var(--surface2)', flexShrink: 0 }}>
            {client ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>👤 {client.full_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text2)' }}>{client.phone} {client.car_number && `· 🚗 ${client.car_number}`}</div>
                  {client.jami_qarz > 0 && <div style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 600 }}>Qarz: {fmt(client.jami_qarz)} so'm</div>}
                </div>
                <button onClick={() => { setClientState(null); saveCart(cart, null) }}
                  style={{ background: 'none', color: 'var(--text2)', fontSize: 17, cursor: 'pointer', border: 'none' }}>✕</button>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input type="text" placeholder="👤 Mijoz qidirish..."
                    value={clientSearch}
                    onChange={e => { setClientSearch(e.target.value); clientApi.list({ search: e.target.value, page_size: 8 }).then(r => setClientsList(r.data.items || [])).catch(() => {}) }}
                    style={{ ...S.input, height: 30, fontSize: 12, flex: 1 }} />
                  <button onClick={() => setShowClientForm(true)} style={{ ...S.btnGray, padding: '4px 8px', fontSize: 12 }}>+</button>
                </div>
                {clientSearch && clientsList.length > 0 && (
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, marginTop: 4, maxHeight: 130, overflowY: 'auto', boxShadow: 'var(--shadow-md)' }}>
                    {clientsList.map(c => (
                      <div key={c.id} onClick={() => { setClient(c); setClientSearch(''); setClientsList([]); flash(`👤 ${c.full_name}`) }}
                        style={{ padding: '6px 10px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: 12 }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-light)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <b>{c.full_name}</b> <span style={{ color: 'var(--text2)', marginLeft: 6 }}>{c.phone}</span>
                        {c.car_number && <span style={{ color: 'var(--text2)', marginLeft: 4 }}>🚗 {c.car_number}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Hisob */}
          <div style={{ padding: '10px 14px', flex: 1, overflowY: 'auto' }}>
            <SumRow label="Mahsulotlar soni:" value={cart.reduce((s, i) => s + i.quantity, 0)} />
            <SumRow label="Umumiy summa:" value={`${fmt(total)} so'm`} bold />
            {(gDiscPct > 0 || gDiscAmt > 0) && <SumRow label="Chegirma:" value={`-${fmt(gDiscount)} so'm`} color="var(--accent)" />}
            <SumRow label="To'lanadigan:" value={`${fmt(final)} so'm`} bold large color="var(--accent)" />

            <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />

            {/* To'lov turi */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 4, marginBottom: 10 }}>
              {['naqd', 'karta', 'aralash', 'qarz'].map(type => (
                <button key={type} onClick={() => { setPayType(type); setNaqdAmt(''); setKartaAmt(''); setActiveInput('naqd') }}
                  style={{ padding: '7px 3px', borderRadius: 6, border: `1.5px solid ${payType === type ? 'var(--accent)' : 'var(--border)'}`, background: payType === type ? 'var(--accent)' : 'var(--surface2)', color: payType === type ? '#fff' : 'var(--text)', fontSize: 11, fontWeight: payType === type ? 700 : 500, cursor: 'pointer' }}>
                  {type === 'naqd' ? '💵 Naqd' : type === 'karta' ? '💳 Karta' : type === 'aralash' ? '💵+💳' : '📋 Qarz'}
                </button>
              ))}
            </div>

            {/* Naqd input */}
            {(payType === 'naqd' || payType === 'aralash') && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>💵 Naqd:</span>
                  {payType === 'aralash' && <button onClick={() => setActiveInput('naqd')} style={{ fontSize: 10, background: 'none', border: 'none', cursor: 'pointer', color: activeInput === 'naqd' ? 'var(--accent)' : 'var(--text2)', fontWeight: activeInput === 'naqd' ? 700 : 400 }}>{activeInput === 'naqd' ? '● aktiv' : 'tanlash'}</button>}
                </div>
                <input type="number" value={naqdAmt} onChange={e => setNaqdAmt(e.target.value)} onFocus={() => setActiveInput('naqd')}
                  placeholder={fmt(final)}
                  style={{ ...S.input, fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 16, textAlign: 'right', color: 'var(--accent)', border: activeInput === 'naqd' ? '2px solid var(--accent)' : '1.5px solid var(--border)' }} />
              </div>
            )}

            {/* Karta input */}
            {(payType === 'karta' || payType === 'aralash') && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>💳 Karta:</span>
                  {payType === 'aralash' && <button onClick={() => setActiveInput('karta')} style={{ fontSize: 10, background: 'none', border: 'none', cursor: 'pointer', color: activeInput === 'karta' ? 'var(--blue)' : 'var(--text2)', fontWeight: activeInput === 'karta' ? 700 : 400 }}>{activeInput === 'karta' ? '● aktiv' : 'tanlash'}</button>}
                </div>
                <input type="number" value={kartaAmt} onChange={e => setKartaAmt(e.target.value)} onFocus={() => setActiveInput('karta')}
                  placeholder="0"
                  style={{ ...S.input, fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 16, textAlign: 'right', color: 'var(--blue)', border: activeInput === 'karta' ? '2px solid var(--blue)' : '1.5px solid var(--border)' }} />
              </div>
            )}



            {/* Kalkulyator */}
                {payType !== 'qarz' && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gridTemplateRows: 'repeat(4, 1fr)',
                    gap: 4, marginBottom: 8
                  }}>
                    {/* 1-qator */}
                    <button onClick={() => handleCalcBtn('1')} style={S.calc}>1</button>
                    <button onClick={() => handleCalcBtn('2')} style={S.calc}>2</button>
                    <button onClick={() => handleCalcBtn('3')} style={S.calc}>3</button>
                    <button onClick={() => handleCalcBtn('⌫')} style={S.calc}>⌫</button>

                    {/* 2-qator */}
                    <button onClick={() => handleCalcBtn('4')} style={S.calc}>4</button>
                    <button onClick={() => handleCalcBtn('5')} style={S.calc}>5</button>
                    <button onClick={() => handleCalcBtn('6')} style={S.calc}>6</button>

                    {/* CHEGIRMA — o'ng ustun, 2 qatorni egallaydi (+10K va +50K o'rni) */}
                    <button
                      disabled={!cart.length}
                      onClick={() => { setDiscTarget('global'); setDiscMode('percent'); setDiscVal(''); setShowDiscModal(true) }}
                      style={{
                        gridColumn: '4', gridRow: '2 / 4',
                        borderRadius: 5, cursor: cart.length ? 'pointer' : 'not-allowed',
                        border: `1.5px solid ${(gDiscPct > 0 || gDiscAmt > 0) ? 'var(--accent)' : 'var(--border)'}`,
                        background: (gDiscPct > 0 || gDiscAmt > 0) ? 'var(--accent-light)' : 'var(--surface2)',
                        color: (gDiscPct > 0 || gDiscAmt > 0) ? 'var(--accent)' : 'var(--text)',
                        fontSize: 13, fontWeight: 700, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: 4, lineHeight: 1.2,
                        opacity: cart.length ? 1 : 0.5
                      }}>
                      <span style={{ fontSize: 18 }}>%</span>
                      <span>{(gDiscPct > 0 || gDiscAmt > 0)
                        ? (gDiscPct > 0 ? gDiscPct + '%' : fmt(gDiscAmt))
                        : 'CHEGIRMA'}</span>
                    </button>

                    {/* 3-qator (chegirma o'ngda tursin, shuning uchun faqat 3 ta) */}
                    <button onClick={() => handleCalcBtn('7')} style={S.calc}>7</button>
                    <button onClick={() => handleCalcBtn('8')} style={S.calc}>8</button>
                    <button onClick={() => handleCalcBtn('9')} style={S.calc}>9</button>

                    {/* 4-qator */}
                    <button onClick={() => handleCalcBtn('0')} style={S.calc}>0</button>
                    <button onClick={() => handleCalcBtn('000')} style={S.calc}>000</button>
                    <button onClick={() => handleCalcBtn('.')} style={S.calc}>.</button>
                    <button onClick={() => handleCalcBtn('OK')} style={{ ...S.calc, background: 'var(--accent)', color: '#fff' }}>OK</button>
                  </div>
                )}



            {/* Natija */}
            {payType === 'naqd' && naqd > 0 && naqd > final && <SumRow label="Qaytim:" value={`${fmt(change)} so'm`} color="var(--blue)" bold />}
            {payType === 'naqd' && naqd > 0 && naqd < final && <SumRow label="Qarz:" value={`${fmt(debt)} so'm`} color="var(--danger)" bold />}
            {payType === 'aralash' && (naqd + karta) > 0 && debt > 0 && <SumRow label="Qarz:" value={`${fmt(debt)} so'm`} color="var(--danger)" bold />}
            {payType === 'aralash' && (naqd + karta) >= final && final > 0 && <SumRow label="✅ To'liq:" value={`${fmt(naqd + karta)} so'm`} color="var(--accent)" bold />}
            {payType === 'qarz' && (
              <div style={{ padding: 10, background: 'var(--danger-light)', borderRadius: 'var(--radius)' }}>
                <SumRow label="Qarz:" value={`${fmt(final)} so'm`} color="var(--danger)" bold />
                {!client && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4, fontWeight: 600 }}>⚠️ Mijoz tanlang!</div>}
              </div>
            )}
          </div>



          {/* Chegirma tugmasi + Yakunlash */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>

          {/* KATTA CHEGIRMA TUGMASI */}
          {(can('mahsulot_chegirma') || can('umumiy_chegirma')) && cart.length > 0 && (
            <button
              onClick={() => { setDiscTarget('global'); setDiscMode('percent'); setDiscVal(''); setShowDiscModal(true) }}
              style={{
                width: '100%', padding: '11px', borderRadius: 'var(--radius)',
                background: (gDiscPct > 0 || gDiscAmt > 0) ? 'var(--accent-light)' : 'var(--surface2)',
                color: (gDiscPct > 0 || gDiscAmt > 0) ? 'var(--accent)' : 'var(--text)',
                fontSize: 14, fontWeight: 700,
                border: `1.5px solid ${(gDiscPct > 0 || gDiscAmt > 0) ? 'var(--accent)' : 'var(--border)'}`,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
              }}>
              %
              {(gDiscPct > 0 || gDiscAmt > 0)
                ? `Chegirma: ${gDiscPct > 0 ? gDiscPct + '%' : fmt(gDiscAmt) + ' so\'m'} (-${fmt(gDiscount)} so'm)`
                : 'CHEGIRMA QO\'SHISH'}
            </button>
          )}

          {/* YAKUNLASH */}
          <button onClick={handleSale} disabled={loading || !cart.length} style={{
            width: '100%', padding: '14px', borderRadius: 'var(--radius)',
            background: 'var(--accent)', color: '#fff', fontSize: 15, fontWeight: 800,
            opacity: (loading || !cart.length) ? 0.6 : 1,
            cursor: (loading || !cart.length) ? 'not-allowed' : 'pointer', border: 'none'
          }}>
            🛒 SOTUVNI YAKUNLASH (Enter)
          </button>
        </div>
      </div>
    </div>


      {/* 17 PAGE */}
      <div style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 3, padding: '5px 14px', flexShrink: 0, overflowX: 'auto' }}>
        {Array.from({ length: 17 }, (_, i) => i + 1).map(n => {
          const pd = pages.find(p => p.page_number === n)
          const busy = pd?.status === 'band'
          const active = n === activePage
          return (
            <button key={n} onClick={() => handlePageChange(n)} style={{ minWidth: 40, height: 30, borderRadius: 5, cursor: 'pointer', border: active ? '2px solid var(--accent)' : '1.5px solid var(--border)', background: active ? 'var(--accent)' : busy ? 'var(--accent-light)' : 'var(--surface2)', color: active ? '#fff' : busy ? 'var(--accent)' : 'var(--text2)', fontSize: 12, fontWeight: active ? 700 : 500, position: 'relative' }}>
              {n}
              {busy && !active && <span style={{ position: 'absolute', top: -3, right: -3, width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', border: '1px solid var(--surface)' }} />}
            </button>
          )
        })}



        {transfers.length > 0 && can('ombor_tasdiqlash') && (
          <div style={{ marginLeft: 8, display: 'flex', gap: 4, flexShrink: 0 }}>
            {transfers.map(tr => (
              <div key={tr.id} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px', background: 'var(--warning-light)', border: '1px solid var(--warning)', borderRadius: 6, fontSize: 11 }}>
                <span
                  onClick={() => setSelectedTransfer(tr)}
                  style={{ cursor: 'pointer', textDecoration: 'underline', color: 'var(--warning)' }}>

                  📦 Transfer #{tr.id} — {tr.items?.length || 0} ta mahsulot
                </span>
                <button onClick={() => transferApi.confirm(tr.id).then(() => { setTransfers(p => p.filter(x => x.id !== tr.id)); loadStock(); flash('✅ Qabul!') })} style={{ ...S.btnGreen, padding: '2px 7px', fontSize: 11 }}>✓</button>
                <button onClick={() => transferApi.reject(tr.id).then(() => setTransfers(p => p.filter(x => x.id !== tr.id)))} style={{ ...S.btnRed, padding: '2px 5px' }}>✕</button>
              </div>
            ))}
          </div>
        )}


        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--mono)' }}>
          {now.toLocaleDateString('uz-UZ')} {now.toLocaleTimeString('uz-UZ')}
        </div>
      </div>

      {/* STATISTIKA */}
      {stats && (
        <div style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '4px 14px', display: 'flex', gap: 24, fontSize: 11, flexShrink: 0 }}>
          {[
            { l: 'Bugungi savdo', v: stats.total_sales, c: 'var(--accent)' },
            { l: 'Naqd', v: stats.cash_amount, c: 'var(--blue)' },
            { l: 'Karta', v: stats.card_amount, c: 'var(--blue)' },

            { l: 'Qarzga', v: stats.debt_amount, c: 'var(--danger)' },
            { l: 'Qaytarilgan', v: stats.return_amount, c: 'var(--warning)' },
          ].map(({ l, v, c }) => (
            <div key={l}>
              <div style={{ color: 'var(--text2)' }}>{l}</div>
              <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: c, fontSize: 13 }}>{fmt(v)} so'm</div>
            </div>
          ))}
        </div>
      )}



      {/* CHEGIRMA MODAL */}
      {showDiscModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}>
            <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 28, width: 440, boxShadow: 'var(--shadow-md)' }}>

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ fontWeight: 800, fontSize: 18 }}>% Chegirma</div>
                <button onClick={() => setShowDiscModal(false)} style={{ background: 'none', fontSize: 20, cursor: 'pointer', border: 'none', color: 'var(--text2)' }}>✕</button>
              </div>

              {/* Tur tanlash */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                <button
                  onClick={() => { setDiscTarget('global'); setDiscVal('') }}
                  style={{
                    padding: '14px', borderRadius: 'var(--radius)', cursor: 'pointer',
                    border: `2px solid ${discTarget === 'global' ? 'var(--accent)' : 'var(--border)'}`,
                    background: discTarget === 'global' ? 'var(--accent-light)' : 'var(--surface2)',
                    color: discTarget === 'global' ? 'var(--accent)' : 'var(--text)',
                    fontWeight: discTarget === 'global' ? 700 : 500, fontSize: 13,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6
                  }}>
                  <span style={{ fontSize: 22 }}>📊</span>
                  Umumiy summaga
                  <span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--mono)' }}>{fmt(total)} so'm</span>
                </button>
                <button
                  onClick={() => { setDiscTarget(cart[0]?.batch_id || null); setDiscVal('') }}
                  style={{
                    padding: '14px', borderRadius: 'var(--radius)', cursor: 'pointer',
                    border: `2px solid ${discTarget !== 'global' ? 'var(--accent)' : 'var(--border)'}`,
                    background: discTarget !== 'global' ? 'var(--accent-light)' : 'var(--surface2)',
                    color: discTarget !== 'global' ? 'var(--accent)' : 'var(--text)',
                    fontWeight: discTarget !== 'global' ? 700 : 500, fontSize: 13,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6
                  }}>
                  <span style={{ fontSize: 22 }}>🛢️</span>
                  Mahsulotga
                  <span style={{ fontSize: 11, color: 'var(--text2)' }}>{cart.length} ta mahsulot</span>
                </button>
              </div>

              {/* Mahsulot tanlash */}
              {discTarget !== 'global' && cart.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>Qaysi mahsulotga:</div>
                  {cart.map(item => (
                    <div key={item.batch_id}
                      onClick={() => setDiscTarget(item.batch_id)}
                      style={{
                        padding: '9px 12px', borderRadius: 6, marginBottom: 5, cursor: 'pointer',
                        border: `1.5px solid ${discTarget === item.batch_id ? 'var(--accent)' : 'var(--border)'}`,
                        background: discTarget === item.batch_id ? 'var(--accent-light)' : 'var(--surface2)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{item.product_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text2)' }}>
                          {item.quantity} ta · {fmt(item.sale_price)} so'm
                        </div>
                      </div>
                      {(item.discount_percent > 0 || item.discount_amount > 0) && (
                        <span style={{ padding: '2px 8px', background: 'var(--accent-light)', color: 'var(--accent)', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                          {item.discount_percent > 0 ? `-${item.discount_percent}%` : `-${fmt(item.discount_amount)}`}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Foiz / Summa */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                <button onClick={() => setDiscMode('percent')} style={{
                  padding: '10px', borderRadius: 'var(--radius)', cursor: 'pointer',
                  border: `1.5px solid ${discMode === 'percent' ? 'var(--accent)' : 'var(--border)'}`,
                  background: discMode === 'percent' ? 'var(--accent)' : 'var(--surface2)',
                  color: discMode === 'percent' ? '#fff' : 'var(--text)',
                  fontWeight: 600, fontSize: 13
                }}>% Foizda</button>
                <button onClick={() => setDiscMode('amount')} style={{
                  padding: '10px', borderRadius: 'var(--radius)', cursor: 'pointer',
                  border: `1.5px solid ${discMode === 'amount' ? 'var(--accent)' : 'var(--border)'}`,
                  background: discMode === 'amount' ? 'var(--accent)' : 'var(--surface2)',
                  color: discMode === 'amount' ? '#fff' : 'var(--text)',
                  fontWeight: 600, fontSize: 13
                }}>= Summada</button>
              </div>

              {/* Input */}
              <input type="number"
                placeholder={discMode === 'percent' ? 'Foiz kiriting (masalan: 10)' : 'Summa kiriting (masalan: 5000)'}
                value={discVal}
                onChange={e => setDiscVal(e.target.value)}
                autoFocus
                style={{ ...S.input, fontSize: 20, fontFamily: 'var(--mono)', textAlign: 'right', marginBottom: 10, fontWeight: 700 }} />

              {/* Preview */}
              {discVal && parseFloat(discVal) > 0 && (
                <div style={{ padding: '10px 14px', background: 'var(--accent-light)', borderRadius: 6, marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--accent)' }}>Chegirma:</span>
                  <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--accent)', fontSize: 15 }}>
                    -{fmt((() => {
                      const v = parseFloat(discVal) || 0
                      if (discTarget === 'global') {
                        return discMode === 'percent' ? total * v / 100 : v
                      } else {
                        const item = cart.find(i => i.batch_id === discTarget)
                        if (!item) return 0
                        const t = item.sale_price * item.quantity
                        return discMode === 'percent' ? t * v / 100 : v
                      }
                    })())} so'm
                  </span>
                </div>
              )}

              {/* Tugmalar */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={applyDiscount} style={{ ...S.btnGreen, flex: 1, padding: '12px', fontSize: 14 }}>✓ Qo'llash</button>
                <button onClick={() => {
                  if (discTarget === 'global') { setGDiscPct(0); setGDiscAmt(0) }
                  else if (discTarget) {
                    const newCart = cart.map(i => i.batch_id === discTarget ? { ...i, discount_percent: 0, discount_amount: 0 } : i)
                    setCart(newCart); saveCart(newCart, client)
                  }
                  setShowDiscModal(false)
                }} style={{ ...S.btnRed, padding: '12px', fontSize: 13 }}>Bekor qilish</button>
              </div>
            </div>
          </div>
        )}





      {/* CHECK DETAIL MODAL */}
      {selectedCheck && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}>

          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 28, width: 702, maxHeight: '85vh', overflowY: 'auto', boxShadow: 'var(--shadow-md)' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 14, borderBottom: '2px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 20, fontFamily: 'var(--mono)', color: 'var(--accent)' }}>
                  Chek #{selectedCheck.id}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 3 }}>
                  📅 {new Date(selectedCheck.created_at).toLocaleString('uz-UZ')} · 👤 {selectedCheck.kassir?.username}
                </div>
              </div>
              <button onClick={() => setSelectedCheck(null)} style={{ background: 'none', fontSize: 22, cursor: 'pointer', border: 'none', color: 'var(--text2)' }}>✕</button>
            </div>

            {/* Mijoz */}
            {selectedCheck.client && (
              <div style={{ padding: '10px 14px', background: 'var(--accent-light)', borderRadius: 8, marginBottom: 16, display: 'flex', gap: 20 }}>
                <div><div style={{ fontSize: 10, color: 'var(--text2)' }}>Mijoz</div><div style={{ fontWeight: 700 }}>👤 {selectedCheck.client.full_name}</div></div>
                {selectedCheck.client.phone && <div><div style={{ fontSize: 10, color: 'var(--text2)' }}>Telefon</div><div style={{ fontWeight: 600 }}>{selectedCheck.client.phone}</div></div>}
                {selectedCheck.client.car_number && <div><div style={{ fontSize: 10, color: 'var(--text2)' }}>Mashina</div><div style={{ fontWeight: 600 }}>🚗 {selectedCheck.client.car_number}</div></div>}
              </div>
            )}




            {/* Mahsulotlar — Excel ko'rinish */}
            {/* Mahsulotlar — Excel ko'rinish */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16, tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '7%' }} />
                <col style={{ width: '38%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '17%' }} />
                <col style={{ width: '10%' }} />
              </colgroup>
              <thead>
                <tr style={{ background: 'var(--surface2)' }}>
                  {[
                    { label: '№', align: 'center' },
                    { label: 'Mahsulot nomi', align: 'left' },
                    { label: 'Narx', align: 'right' },
                    { label: 'Soni', align: 'center' },
                    { label: 'Jami', align: 'right' },
                    { label: 'Holat', align: 'center' },
                  ].map(({ label, align }) => (
                    <th key={label} style={{
                      padding: '8px 10px', textAlign: align,
                      fontSize: 11, fontWeight: 700, color: 'var(--text2)',
                      borderBottom: '2px solid var(--border)', borderRight: '1px solid var(--border)',
                      whiteSpace: 'nowrap'
                    }}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>




                {selectedCheck.items?.map((item, idx) => {
                  const returnedQty = returnedQtyFor(item.id)
                  return (
                  <tr key={item.id} style={{ background: item.is_active ? (idx % 2 === 0 ? 'var(--surface)' : 'var(--surface2)') : 'var(--danger-light)', opacity: item.is_active ? 1 : 0.6 }}>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontSize: 12, color: 'var(--text2)', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>
                      {idx + 1}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'left', fontSize: 13, fontWeight: 500, borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.batch?.product?.name}>
                      {item.batch?.product?.name}
                      {returnedQty > 0 && (
                        <div style={{ fontSize: 10, color: 'var(--warning)', fontWeight: 600, marginTop: 2 }}>
                          ↩ {returnedQty} ta qaytarilgan
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12, borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>
                      {fmt(item.sale_price)}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 12, borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>
                      {item.quantity}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--accent)', fontSize: 13, borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>
                      {fmt(item.total)}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
                      {item.is_active
                        ? (returnedQty > 0
                            ? <span style={{ color: 'var(--warning)', fontSize: 11, fontWeight: 600 }}>◐ Qisman</span>
                            : <span style={{ color: 'var(--accent)', fontSize: 11, fontWeight: 600 }}>✓ Sotildi</span>)
                        : <span style={{ color: 'var(--danger)', fontSize: 11, fontWeight: 600 }}>✕ Qaytarildi</span>}
                    </td>
                  </tr>
                  )
                })}



              </tbody>
            </table>




            {/* To'lov tafsilotlari */}
            <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: 16, border: '1px solid var(--border)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text2)' }}>Umumiy summa</div>
                  <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 15 }}>{fmt(selectedCheck.total_amount)} so'm</div>
                </div>
                {selectedCheck.discount_amount > 0 && (
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text2)' }}>Chegirma</div>
                    <div style={{ fontFamily: 'var(--mono)', color: 'var(--accent)', fontWeight: 700 }}>-{fmt(selectedCheck.discount_amount)} so'm</div>
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text2)' }}>To'lanadigan</div>
                  <div style={{ fontFamily: 'var(--mono)', fontWeight: 800, fontSize: 18, color: 'var(--accent)' }}>{fmt(selectedCheck.final_amount)} so'm</div>
                </div>
              </div>

              <div style={{ height: 1, background: 'var(--border)', marginBottom: 10 }} />

              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {selectedCheck.payment_type === 'naqd' && (
                  <div style={{ padding: '8px 14px', background: 'var(--accent-light)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 16 }}>💵</span>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text2)' }}>Naqd</div>
                      <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--accent)' }}>{fmt(selectedCheck.paid_amount)}</div>
                    </div>
                  </div>
                )}
                {selectedCheck.payment_type === 'karta' && (
                  <div style={{ padding: '8px 14px', background: 'var(--blue-light)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 16 }}>💳</span>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text2)' }}>Karta</div>
                      <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--blue)' }}>{fmt(selectedCheck.paid_amount)}</div>
                    </div>
                  </div>
                )}

                {selectedCheck.payment_type === 'aralash' && (
                  <>
                    <div style={{ padding: '8px 14px', background: 'var(--accent-light)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 16 }}>💵</span>
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--text2)' }}>Naqd</div>
                        <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--accent)' }}>{fmt(selectedCheck.naqd_amount)}</div>
                      </div>
                    </div>
                    <div style={{ padding: '8px 14px', background: 'var(--blue-light)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 16 }}>💳</span>
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--text2)' }}>Karta</div>
                        <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--blue)' }}>{fmt(selectedCheck.karta_amount)}</div>
                      </div>
                    </div>
                  </>
                )}


                {selectedCheck.debt_amount > 0 && (
                  <div style={{ padding: '8px 14px', background: 'var(--danger-light)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 16 }}>📋</span>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text2)' }}>Qarz</div>
                      <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--danger)' }}>{fmt(selectedCheck.debt_amount)}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button onClick={() => setSelectedCheck(null)} style={{ ...S.btnGray, width: '100%', marginTop: 16, padding: '10px' }}>Yopish</button>
          </div>
        </div>
      )}

      {/* KAMERA */}
      {camOn && (
        <div style={{ position: 'fixed', top: 54, right: 16, zIndex: 200, background: 'var(--surface)', border: '2px solid var(--accent)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ padding: '5px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface2)' }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>📹 Kamera</span>
            <button onClick={() => setCamOn(false)} style={{ background: 'none', fontSize: 16, cursor: 'pointer', border: 'none', color: 'var(--text2)' }}>✕</button>
          </div>
          <img src={CAMERA_STREAM} alt="Kamera" style={{ width: 320, height: 240, display: 'block', objectFit: 'cover' }} />
        </div>
      )}

      {/* CHIQISH */}
      {showLogout && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 28, width: 300, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>👋</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Chiqmoqchimisiz?</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 18 }}>Savatcha saqlanib qoladi</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={logout} style={{ ...S.btnRed, flex: 1, padding: '10px' }}>Ha, chiqish</button>
              <button onClick={() => setShowLogout(false)} style={{ ...S.btnGreen, flex: 1, padding: '10px' }}>Yo'q</button>
            </div>
          </div>
        </div>
      )}


      {/* MIJOZ TAHRIRLASH */}
    {showEditClient && editClient && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}>
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 22, width: 380 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <strong style={{ fontSize: 15 }}>✏️ Mijozni tahrirlash</strong>
            <button onClick={() => setShowEditClient(false)} style={{ background: 'none', fontSize: 18, cursor: 'pointer', border: 'none', color: 'var(--text2)' }}>✕</button>
          </div>
          {[
            ['full_name', 'Ism familiya *'],
            ['phone', 'Telefon'],
            ['car_number', 'Mashina raqami'],
            ['car_model', 'Mashina modeli'],
            ['note', 'Izoh'],
          ].map(([k, l]) => (
            <div key={k} style={{ marginBottom: 9 }}>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 3 }}>{l}</label>
              <input type="text" value={editClient[k] || ''}
                onChange={e => setEditClient(p => ({ ...p, [k]: e.target.value }))}
                style={S.input} />
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={() => {
              clientApi.update(editClient.id, editClient)
                .then(r => {
                  setSelectedClientDetail(r.data)
                  setShowEditClient(false)
                  clientApi.list({ page_size: 50 }).then(res => setClientsList(res.data.items || [])).catch(() => {})
                  flash('✅ Mijoz yangilandi!')
                })
                .catch(e => {
                  const d = e.response?.data?.detail
                  flash(typeof d === 'string' ? d : 'Xato yuz berdi!', 'error')
                })
            }} style={{ ...S.btnGreen, flex: 1 }}>Saqlash</button>
            <button onClick={() => setShowEditClient(false)} style={{ ...S.btnGray, flex: 1 }}>Bekor</button>
          </div>
        </div>
      </div>
    )}





       {/* YANGI PROBEG YOZUVI */}
    {showOilForm && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}>
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 24, width: 520, maxHeight: '90vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <strong style={{ fontSize: 15 }}>🛢️ Yangi probeg yozuvi</strong>
            <button onClick={() => setShowOilForm(false)} style={{ background: 'none', fontSize: 18, cursor: 'pointer', border: 'none', color: 'var(--text2)' }}>✕</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            {[
              { key: 'date', label: 'Sana', type: 'date' },
              { key: 'transmission', label: 'Karobka', type: 'select', options: ['AKPP', 'MKPP', 'Variator'] },
              { key: 'oil_brand', label: 'Moy brendi', placeholder: 'Hyundai Xteer...' },
              { key: 'oil_type', label: 'Moy turi', placeholder: '5W-30...' },
              { key: 'mileage', label: 'Probeg (km)', type: 'number' },
              { key: 'next_date', label: 'Keyingi kelish', type: 'date' },
              { key: 'master_name', label: 'Usta ismi' },
              { key: 'master_phone', label: 'Usta telefoni' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 3 }}>{f.label}</label>
                {f.type === 'select' ? (
                  <select value={newOilRecord[f.key] || ''} onChange={e => setNewOilRecord(p => ({ ...p, [f.key]: e.target.value }))} style={S.input}>
                    {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input type={f.type || 'text'} placeholder={f.placeholder || ''}
                    value={newOilRecord[f.key] || ''}
                    onChange={e => setNewOilRecord(p => ({ ...p, [f.key]: e.target.value }))}
                    style={S.input} />
                )}
              </div>
            ))}
          </div>

          {/* Checkboxlar */}
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>Almashtirilganlar:</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 14 }}>
            {[
              { key: 'oil_filter', label: 'Moy filtri' },
              { key: 'air_filter', label: 'Havo filtri' },
              { key: 'salon_filter', label: 'Salon filtri' },
              { key: 'spark_plug', label: 'Shamlar' },
              { key: 'fuel_filter', label: 'Yoqilg\'i filtri' },
              { key: 'pampers', label: 'Pampers' },
            ].map(cb => (
              <label key={cb.key} style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '7px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12,
                border: `1.5px solid ${newOilRecord[cb.key] ? 'var(--accent)' : 'var(--border)'}`,
                background: newOilRecord[cb.key] ? 'var(--accent-light)' : 'var(--surface2)'
              }}>
                <input type="checkbox" checked={newOilRecord[cb.key] || false}
                  onChange={e => setNewOilRecord(p => ({ ...p, [cb.key]: e.target.checked }))}
                  style={{ accentColor: 'var(--accent)' }} />
                {cb.label}
              </label>
            ))}
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 3 }}>Izoh</label>
            <textarea value={newOilRecord.note || ''}
              onChange={e => setNewOilRecord(p => ({ ...p, note: e.target.value }))}
              rows={2} style={{ ...S.input, resize: 'vertical' }} />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => {
              oilRecordApi.create({
                ...newOilRecord,
                client_id: parseInt(newOilRecord.client_id),
                mileage: newOilRecord.mileage ? parseInt(newOilRecord.mileage) : null,
                date: newOilRecord.date || new Date().toISOString().split('T')[0],
                next_date: newOilRecord.next_date || null,
              })
                .then(r => {
                  setClientOilRecords(p => [r.data, ...p])
                  setShowOilForm(false)
                  flash('✅ Probeg yozuvi saqlandi!')
                  clientApi.list({ page_size: 50 }).then(res => setClientsList(res.data.items || [])).catch(() => {})
                })
                .catch(e => {
                  const d = e.response?.data?.detail
                  flash(typeof d === 'string' ? d : 'Xato yuz berdi!', 'error')
                })
            }} style={{ ...S.btnGreen, flex: 1 }}>✓ Saqlash</button>
            <button onClick={() => setShowOilForm(false)} style={{ ...S.btnGray, flex: 1 }}>Bekor</button>
          </div>
        </div>
      </div>
    )}






      {/* YANGI MIJOZ */}
      {showClientForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 22, width: 360 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <strong>Yangi mijoz</strong>
              <button onClick={() => setShowClientForm(false)} style={{ background: 'none', fontSize: 18, cursor: 'pointer', border: 'none', color: 'var(--text2)' }}>✕</button>
            </div>
            {[['full_name','Ism familiya *'],['phone','Telefon'],['car_number','Mashina raqami'],['car_model','Mashina modeli']].map(([k, l]) => (
              <div key={k} style={{ marginBottom: 9 }}>
                <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 3 }}>{l}</label>
                <input type="text" value={newClient[k]} onChange={e => setNewClient(p => ({ ...p, [k]: e.target.value }))} style={S.input} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={() => clientApi.create(newClient).then(r => { setClient(r.data); setShowClientForm(false); setNewClient({ full_name: '', phone: '', car_number: '', car_model: '' }); flash('✅ Mijoz qo\'shildi!') }).catch(e => {
                  const d = e.response?.data?.detail
                  flash(typeof d === 'string' ? d : 'Xato yuz berdi!', 'error')
                })}
                style={{ ...S.btnGreen, flex: 1 }}>Saqlash</button>
              <button onClick={() => setShowClientForm(false)} style={{ ...S.btnGray, flex: 1 }}>Bekor</button>
            </div>
          </div>
        </div>
      )}

      {/* TRANSFER DETAIL MODAL */}
{selectedTransfer && (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}>
    <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', width: '88vw', maxWidth: 960, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}>

      {/* Header */}
      <div style={{ padding: '22px 32px', borderBottom: '2px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface2)', position: 'sticky', top: 0, zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 50, height: 50, background: 'var(--warning-light)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>📦</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 22 }}>Transfer #{selectedTransfer.id}</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 3 }}>
              Yubordi: <b>{selectedTransfer.sender?.username}</b> · Status:
              <span style={{ marginLeft: 6, padding: '2px 10px', borderRadius: 4, fontSize: 12, fontWeight: 700,
                background: selectedTransfer.status === 'yuborildi' ? 'var(--warning-light)' : selectedTransfer.status === 'qabul' ? 'var(--accent-light)' : 'var(--danger-light)',
                color: selectedTransfer.status === 'yuborildi' ? 'var(--warning)' : selectedTransfer.status === 'qabul' ? 'var(--accent)' : 'var(--danger)'
              }}>
                {selectedTransfer.status === 'yuborildi' ? '⏳ Kutilmoqda' : selectedTransfer.status === 'qabul' ? '✓ Qabul qilindi' : '✕ Rad etildi'}
              </span>
            </div>
          </div>
        </div>
        <button onClick={() => setSelectedTransfer(null)} style={{ background: 'none', fontSize: 24, cursor: 'pointer', border: 'none', color: 'var(--text2)', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}>✕</button>
      </div>

      <div style={{ padding: '28px 32px' }}>

        {/* Info kartochkalar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>


          {[
            { icon: '📦', label: 'Mahsulotlar soni', value: `${selectedTransfer.items?.length || 0} ta`, bold: true },
            { icon: '🔢', label: 'Jami yuborilgan', value: `${(selectedTransfer.items || []).reduce((s, i) => s + i.sent_quantity, 0)} ta`, bold: true },
            { icon: '👤', label: 'Kassir', value: selectedTransfer.kassir?.username || '—' },
            { icon: '📅', label: 'Sana', value: new Date(selectedTransfer.created_at).toLocaleDateString('uz-UZ') },
          ].map(({ icon, label, value, bold }) => (

            <div key={label} style={{ background: 'var(--surface2)', borderRadius: 10, padding: '16px 18px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 20, marginBottom: 8 }}>{icon}</div>
              <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>{label}</div>
              <div style={{ fontWeight: bold ? 700 : 600, fontSize: bold ? 15 : 14, color: 'var(--text)' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Excel jadval */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>📊</span> Mahsulot tafsilotlari
          </div>

          <div style={{ border: '1.5px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface2)' }}>
                  {[

                  { label: 'Barcode', align: 'left' },
                  { label: 'Mahsulot nomi', align: 'left' },
                  { label: 'Brand', align: 'left' },
                  { label: 'Kategoriya', align: 'left' },
                  { label: 'O\'lchov', align: 'left' },
                  { label: 'Yuborilgan (ta)', align: 'center' },

                  ].map(({ label, align }) => (
                    <th key={label} style={{
                      padding: '12px 16px',
                      textAlign: align,
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--text2)',
                      borderBottom: '2px solid var(--border)',
                      borderRight: '1px solid var(--border)',
                      whiteSpace: 'nowrap',
                      background: 'var(--surface2)'
                    }}>{label}</th>
                  ))}
                </tr>
              </thead>


              <tbody>
                {(selectedTransfer.items || []).map((item, idx) => (
                  <tr key={item.id} style={{ background: idx % 2 === 0 ? 'var(--surface)' : 'var(--surface2)' }}>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text2)' }}>
                      {item.batch?.product?.barcode || '—'}
                    </td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', fontWeight: 700, fontSize: 14 }}>
                      {item.batch?.product?.name || '—'}
                    </td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', fontSize: 13 }}>
                      {item.batch?.brand?.name || '—'}
                    </td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', fontSize: 13 }}>
                      {item.batch?.product?.category?.name || '—'}
                    </td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', fontSize: 13 }}>
                      {item.batch?.product?.unit?.name || '—'}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ padding: '6px 20px', background: 'var(--warning-light)', color: 'var(--warning)', borderRadius: 6, fontWeight: 800, fontSize: 20, fontFamily: 'var(--mono)' }}>
                        {item.sent_quantity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>


            </table>
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          {/* Faqat Transfer ma'lumotlari */}
          <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '18px 20px', border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 14 }}>📋 Transfer ma'lumotlari</div>


            {[
              { l: 'Transfer ID:', v: `#${selectedTransfer.id}` },
              { l: 'Yubordi:', v: `👤 ${selectedTransfer.sender?.username || '—'}` },
              { l: 'Mahsulotlar turi:', v: `${selectedTransfer.items?.length || 0} ta`, bold: true, color: 'var(--warning)' },
              { l: 'Jami yuborilgan:', v: `${(selectedTransfer.items || []).reduce((s, i) => s + i.sent_quantity, 0)} ta`, bold: true, color: 'var(--warning)' },
              { l: 'Belgilangan kassir:', v: selectedTransfer.kassir?.username ? `👤 ${selectedTransfer.kassir.username}` : '—' },
              { l: 'Qabul qilgan:', v: selectedTransfer.confirmer?.username ? `👤 ${selectedTransfer.confirmer.username}` : '—' },
            ].map(({ l, v, bold, color }) => (


              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text2)' }}>{l}</span>
                <span style={{ fontWeight: bold ? 700 : 500, fontSize: bold ? 15 : 13, color: color || 'var(--text)' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>



        {/* Qabul / Rad tugmalari */}
        {selectedTransfer.status === 'yuborildi' && (
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => transferApi.confirm(selectedTransfer.id)
                .then(() => {
                  setTransfers(p => p.filter(x => x.id !== selectedTransfer.id))
                  setSelectedTransfer(null)
                  loadStock()
                  flash('✅ Transfer qabul qilindi!')
                })
                .catch(e => {
                  const d = e.response?.data?.detail
                  flash(typeof d === 'string' ? d : 'Xato yuz berdi!', 'error')
                })}
              style={{ flex: 1, padding: '14px', borderRadius: 'var(--radius)', background: 'var(--accent)', color: '#fff', fontSize: 15, fontWeight: 800, border: 'none', cursor: 'pointer' }}>
              ✓ Qabul qilish
            </button>
            <button
              onClick={() => transferApi.reject(selectedTransfer.id)
                .then(() => {
                  setTransfers(p => p.filter(x => x.id !== selectedTransfer.id))
                  setSelectedTransfer(null)
                  flash('Transfer rad etildi')
                })
                .catch(() => {})}
              style={{ flex: 1, padding: '14px', borderRadius: 'var(--radius)', background: 'var(--danger-light)', color: 'var(--danger)', fontSize: 15, fontWeight: 800, border: '1.5px solid var(--danger)', cursor: 'pointer' }}>
              ✕ Rad etish
            </button>
          </div>
        )}

        {selectedTransfer.status !== 'yuborildi' && (
          <button onClick={() => setSelectedTransfer(null)}
            style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 14, fontWeight: 600, border: '1px solid var(--border)', cursor: 'pointer' }}>
            Yopish
          </button>
        )}
      </div>
    </div>
  </div>
)}





      {/* QARZ TO'LOV MODAL */}
      {payDebtModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 600 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 24, width: 380 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <strong style={{ fontSize: 15 }}>💰 Qarz to'lash — {selectedClientDetail?.full_name}</strong>
              <button onClick={() => setPayDebtModal(false)} style={{ background: 'none', fontSize: 18, cursor: 'pointer', border: 'none', color: 'var(--text2)' }}>✕</button>
            </div>

            <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--text2)' }}>Jami qarz:</span>
                <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--danger)' }}>{fmt(selectedClientDetail?.jami_qarz)} so'm</span>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>To'lov summasi *</label>
              <input type="number" value={debtPayAmount} onChange={e => setDebtPayAmount(e.target.value)}
                max={selectedClientDetail?.jami_qarz} style={{ ...S.input, fontFamily: 'var(--mono)', fontWeight: 700 }} />
            </div>





            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 12 }}>
              {['naqd', 'karta', 'aralash'].map(tp => (
                <button key={tp} onClick={() => setDebtPayType(tp)}
                  style={{
                    padding: '9px 4px', borderRadius: 6, fontSize: 12, fontWeight: debtPayType === tp ? 700 : 500, cursor: 'pointer',
                    border: `1.5px solid ${debtPayType === tp ? 'var(--accent)' : 'var(--border)'}`,
                    background: debtPayType === tp ? 'var(--accent)' : 'var(--surface2)',
                    color: debtPayType === tp ? '#fff' : 'var(--text)',
                  }}>
                  {tp === 'naqd' ? '💵 Naqd' : tp === 'karta' ? '💳 Karta' : '💵+💳 Aralash'}
                </button>
              ))}
            </div>

            {debtPayType === 'aralash' && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: 'var(--text2)', display: 'block', marginBottom: 3 }}>💵 Naqd:</label>
                  <input type="number" value={debtPayNaqd} onChange={e => setDebtPayNaqd(e.target.value)}
                    placeholder="0" style={{ ...S.input, fontFamily: 'var(--mono)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: 'var(--text2)', display: 'block', marginBottom: 3 }}>💳 Karta:</label>
                  <input type="number" value={debtPayKarta} onChange={e => setDebtPayKarta(e.target.value)}
                    placeholder="0" style={{ ...S.input, fontFamily: 'var(--mono)' }} />
                </div>
              </div>
            )}




            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handlePayDebt} style={{ ...S.btnGreen, flex: 1, padding: '10px' }}>✓ To'lovni saqlash</button>
              <button onClick={() => setPayDebtModal(false)} style={{ ...S.btnGray, flex: 1, padding: '10px' }}>Bekor</button>
            </div>
          </div>
        </div>
      )}

      {/* QARZ TARIXI MODAL */}
      {showDebtHistory && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 600 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 24, width: 460, maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <strong style={{ fontSize: 15 }}>📜 Qarzlar tarixi — {selectedClientDetail?.full_name}</strong>
              <button onClick={() => setShowDebtHistory(false)} style={{ background: 'none', fontSize: 18, cursor: 'pointer', border: 'none', color: 'var(--text2)' }}>✕</button>
            </div>

            {clientDebts.length === 0 ? (
              <div style={{ color: 'var(--text2)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>Qarz tarixi yo'q</div>
            ) : (
              clientDebts.map(d => (
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
              ))
            )}

            <button onClick={() => setShowDebtHistory(false)} style={{ ...S.btnGray, width: '100%', marginTop: 16, padding: '10px' }}>Yopish</button>
          </div>
        </div>
      )}






      {/* XABAR */}
      {msg && (
        <div style={{ position: 'fixed', top: 54, left: '50%', transform: 'translateX(-50%)', padding: '9px 18px', borderRadius: 'var(--radius)', background: msg.type === 'error' ? 'var(--danger)' : msg.type === 'warning' ? 'var(--warning)' : 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600, zIndex: 1000, boxShadow: 'var(--shadow-md)', whiteSpace: 'nowrap' }}>
          {msg.text}
        </div>
      )}
    </div>
  )
}

function SumRow({ label, value, bold, large, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
      <span style={{ fontSize: 12, color: 'var(--text2)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--mono)', fontWeight: bold ? 700 : 400, fontSize: large ? 16 : bold ? 14 : 13, color: color || 'var(--text)' }}>{value}</span>
    </div>
  )
}

