import { create } from 'zustand'

const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null')
  } catch {
    return null
  }
}

export const useAuthStore = create((set, get) => ({
  user: getUser(),
  token: localStorage.getItem('token') || null,

  setAuth: (user, token) => {
    localStorage.setItem('user', JSON.stringify(user))
    localStorage.setItem('token', token)
    set({ user, token })
  },

  logout: () => {
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    set({ user: null, token: null })
    window.location.href = '/login'
  },

  can: (permission) => {
    const user = get().user
    if (!user) return false
    if (user.role === 'superadmin' || user.role === 'admin') return true
    return user.permission?.[permission] === true
  },

  isRole: (...roles) => {
    const user = get().user
    if (!user) return false
    return roles.includes(user.role)
  }
}))

export const useKassaStore = create((set, get) => ({
  activePage: 1,
  setActivePage: (n) => set({ activePage: n }),

  carts: {},
  getCart: () => (get().carts[get().activePage] || []),

  addToCart: (product, batch) => {
    const { carts, activePage } = get()
    const cart = [...(carts[activePage] || [])]
    const idx = cart.findIndex(x => x.batch_id === batch.id)
    if (idx >= 0) {
      cart[idx] = { ...cart[idx], quantity: cart[idx].quantity + 1 }
    } else {
      cart.push({
        batch_id: batch.id,
        product_name: product.name,
        original_price: batch.sale_price,
        sale_price: batch.sale_price,
        quantity: 1,
        discount_percent: 0,
        discount_amount: 0,
      })
    }
    set({ carts: { ...carts, [activePage]: cart } })
  },

  updateQuantity: (batchId, qty) => {
    const { carts, activePage } = get()
    set({
      carts: {
        ...carts,
        [activePage]: (carts[activePage] || []).map(i =>
          i.batch_id === batchId ? { ...i, quantity: Math.max(1, qty) } : i
        )
      }
    })
  },

  updatePrice: (batchId, price) => {
    const { carts, activePage } = get()
    set({
      carts: {
        ...carts,
        [activePage]: (carts[activePage] || []).map(i =>
          i.batch_id === batchId ? { ...i, sale_price: price } : i
        )
      }
    })
  },

  updateDiscount: (batchId, pct, amt) => {
    const { carts, activePage } = get()
    set({
      carts: {
        ...carts,
        [activePage]: (carts[activePage] || []).map(i =>
          i.batch_id === batchId ? { ...i, discount_percent: pct, discount_amount: amt } : i
        )
      }
    })
  },

  removeFromCart: (batchId) => {
    const { carts, activePage } = get()
    set({
      carts: {
        ...carts,
        [activePage]: (carts[activePage] || []).filter(i => i.batch_id !== batchId)
      }
    })
  },

  clearCart: () => {
    const { carts, activePage } = get()
    set({ carts: { ...carts, [activePage]: [] } })
  },

  clients: {},
  getClient: () => (get().clients[get().activePage] || null),

  setClient: (c) => {
    const { clients, activePage } = get()
    set({ clients: { ...clients, [activePage]: c } })
  },

  clearClient: () => {
    const { clients, activePage } = get()
    set({ clients: { ...clients, [activePage]: null } })
  },

  calcTotals: (gPct = 0, gAmt = 0) => {
    const cart = get().getCart()
    let total = 0
    cart.forEach(item => {
      const t = item.sale_price * item.quantity
      const d = item.discount_percent > 0
        ? t * item.discount_percent / 100
        : item.discount_amount
      total += t - d
    })
    const discount = gPct > 0 ? total * gPct / 100 : gAmt
    return { total, discount, final: total - discount }
  }
}))

export const useThemeStore = create((set) => ({
  dark: localStorage.getItem('theme') === 'dark',
  toggle: () => set(s => {
    const dark = !s.dark
    localStorage.setItem('theme', dark ? 'dark' : 'light')
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    return { dark }
  })
}))
