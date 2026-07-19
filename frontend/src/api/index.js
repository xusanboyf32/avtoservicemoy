import axios from 'axios'



const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000',
  timeout: 10000,
})


api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)


export const authApi = {
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
}




export const productApi = {
  list: p => api.get('/products/', { params: p }),
  create: d => api.post('/products/', d),
  update: (id, d) => api.put(`/products/${id}`, d),
  delete: id => api.delete(`/products/${id}`),
}



export const batchApi = {
  allStock: () => api.get('/batches/stock'),
  warehouseStock: () => api.get('/batches/warehouse-stock'),
  kassaStockView: () => api.get('/batches/kassa-stock-view'),
  current: (productId) => api.get(`/batches/${productId}/current`),
  stock: (productId) => api.get(`/batches/${productId}/stock`),
  history: (productId) => api.get(`/batches/${productId}/history`),
}




export const saleApi = {
  list: p => api.get('/sales/', { params: p }),
  detail: id => api.get(`/sales/${id}`),
  create: d => api.post('/sales/', d),
  returnItem: (sId, iId, opts = {}) => api.delete(`/sales/${sId}/items/${iId}`, { params: opts }),
  returns: p => api.get('/sales/returns/list', { params: p }),
  search: q => api.get('/sales/search/query', { params: { q } }),
}



export const clientApi = {
  list: p => api.get('/clients/', { params: p }),
  detail: id => api.get(`/clients/${id}`),
  byCar: car => api.get(`/clients/car/${encodeURIComponent(car)}`),
  create: d => api.post('/clients/', d),
  update: (id, d) => api.put(`/clients/${id}`, d),
  delete: id => api.delete(`/clients/${id}`),
}



export const cameraApi = {
  status: () => api.get('/camera/status'),
  plates: () => api.get('/camera/plates'),
  start: (camId = 'cam1') => api.post(`/camera/${camId}/start`),
  stop: (camId = 'cam1') => api.post(`/camera/${camId}/stop`),
  showWindow: () => api.post('/camera/window/show'),
  hideWindow: () => api.post('/camera/window/hide'),
}


export const printerApi = {
  receipt: id => api.post(`/print/receipt/${id}`),
  test: () => api.post('/print/test'),
  status: () => api.get('/print/status'),
}
export const incomeApi = {
  list: p => api.get('/incomes/', { params: p }),
  create: d => api.post('/incomes/', d),
  setPrices: (id, d) => api.patch(`/incomes/${id}/set-prices`, d),
  delete: id => api.delete(`/incomes/${id}`),
}



export const transferApi = {
  list: p => api.get('/transfers/', { params: p }),
  create: d => api.post('/transfers/', d),
  confirm: id => api.patch(`/transfers/${id}/confirm`),
  reject: id => api.patch(`/transfers/${id}/reject`),
}



export const oilRecordApi = {
  list: (cId, p) => api.get(`/oil-records/client/${cId}`, { params: p }),
  last: cId => api.get(`/oil-records/client/${cId}/last`),
  create: d => api.post('/oil-records/', d),
  update: (id, d) => api.put(`/oil-records/${id}`, d),
  delete: id => api.delete(`/oil-records/${id}`),
  tasks: (filterType = 'yaqin') => api.get('/oil-records/operator/tasks', { params: { filter_type: filterType } }),
  call: (id, d) => api.patch(`/oil-records/operator/call/${id}`, d),
}







export const statsApi = {
  today: () => api.get('/stats/today'),
  monthly: () => api.get('/stats/monthly'),
}

export const kassaPageApi = {
  list: () => api.get('/kassa-pages/'),
  detail: n => api.get(`/kassa-pages/${n}`),
  update: (n, d) => api.patch(`/kassa-pages/${n}`, d),
  clear: n => api.delete(`/kassa-pages/${n}/clear`),
}



export const kontragentApi = {
  list: () => api.get('/kontragents/'),
  detail: (id) => api.get(`/kontragents/${id}`),
  create: d => api.post('/kontragents/', d),
  update: (id, d) => api.put(`/kontragents/${id}`, d),
  delete: id => api.delete(`/kontragents/${id}`),
  pay: (id, data) => api.post(`/kontragents/${id}/pay`, data),
  payments: (id) => api.get(`/kontragents/${id}/payments`),
  // Kontragent o'zi uchun:
  myDebts: () => api.get('/kontragents/me/debts'),
  myIncomes: () => api.get('/kontragents/me/incomes'),
  myPayments: () => api.get('/kontragents/me/payments'),
}



export const categoryApi = {
  list: () => api.get('/categories/'),
  create: d => api.post('/categories/', d),
  update: (id, d) => api.put(`/categories/${id}`, d),
  delete: id => api.delete(`/categories/${id}`),
}


export const brandApi = {
  list: () => api.get('/brands/'),
  create: d => api.post('/brands/', d),
  update: (id, d) => api.put(`/brands/${id}`, d),
  delete: id => api.delete(`/brands/${id}`),
}


export const unitApi = {
  list: () => api.get('/units/'),
  create: d => api.post('/units/', d),
  update: (id, d) => api.put(`/units/${id}`, d),
  delete: id => api.delete(`/units/${id}`),
}



export const userApi = {
  list: () => api.get('/users/'),
  kassirlar: () => api.get('/users/kassirlar/list'),
  create: d => api.post('/users/', d),
  update: (id, d) => api.put(`/users/${id}`, d),
  delete: id => api.delete(`/users/${id}`),
  permission: (id, d) => api.patch(`/users/${id}/permission`, d),
}



export const clientDebtApi = {
  list: () => api.get('/client-debts/'),
  detail: (clientId) => api.get(`/client-debts/client/${clientId}`),
  pay: (id, d) => api.patch(`/client-debts/${id}/pay`, d),
  payTotal: (clientId, d) => api.post(`/client-debts/client/${clientId}/pay`, d),
}


export const paymentApi = {
  debts: () => api.get('/payments/debts'),
  pay: (id, d) => api.patch(`/payments/${id}`, d),
}

export const labelApi = {
  print: d => api.post('/label/print', d),
  batchPrint: d => api.post('/label/batch-print', d),
}

export const safeApi = {
  balance: () => api.get('/safe/balance'),
  list: p => api.get('/safe/', { params: p }),
  create: d => api.post('/safe/', d),
  workersSummary: () => api.get('/safe/workers-summary'),
}

export const kontragentReturnApi = {
  list: p => api.get('/kontragent-returns/', { params: p }),
  create: d => api.post('/kontragent-returns/', d),
  pay: (kontragentId, d) => api.post(`/kontragent-returns/${kontragentId}/pay`, d),
}




export const cashRegisterApi = {
  status: () => api.get('/cash-register/'),
  collect: d => api.post('/cash-register/collect', d),
}

export const advancedStatsApi = {
  overview: p => api.get('/advanced-stats/overview', { params: p }),
  dailyTrend: p => api.get('/advanced-stats/daily-trend', { params: p }),
  topProducts: p => api.get('/advanced-stats/top-products', { params: p }),
  cashiers: p => api.get('/advanced-stats/cashiers', { params: p }),
  kontragents: () => api.get('/advanced-stats/kontragents'),
  expenses: p => api.get('/advanced-stats/expenses', { params: p }),
}





//export const CAMERA_STREAM = 'http://127.0.0.1:9001/stream/cam1'
export const CAMERA_STREAM = import.meta.env.VITE_CAMERA_URL || 'http://127.0.0.1:9001/stream/cam1'

export default api

