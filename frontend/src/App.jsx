import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore, useThemeStore } from './store'
import LoginPage from './pages/LoginPage'
import KassaPage from './pages/KassaPage'
import AdminPage from './pages/AdminPage'
import WarehousePage from './pages/WarehousePage'
import OperatorPage from './pages/OperatorPage'
import KontragentPage from './pages/KontragentPage'
import BuxgalterPage from './pages/BuxgalterPage'



function ProtectedRoute({ children, roles }) {
  const user = useAuthStore(s => s.user)
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/login" replace />
  return children
}

function HomeRedirect() {
  const user = useAuthStore(s => s.user)

  if (!user) return <Navigate to="/login" replace />

  switch (user.role) {
    case 'superadmin':
    case 'admin':
      return <Navigate to="/admin" replace />
    case 'kassir':
      return <Navigate to="/kassa" replace />
    case 'skladchi':
      return <Navigate to="/warehouse" replace />
    case 'operator':
      return <Navigate to="/operator" replace />
    case 'kontragent':
      return <Navigate to="/kontragent" replace />
    case 'buxgalter':
      return <Navigate to="/buxgalter" replace />
    default:
      return <Navigate to="/kassa" replace />

  }
}

export default function App() {
  const dark = useThemeStore(s => s.dark)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  }, [dark])

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/kassa" element={
        <ProtectedRoute roles={['superadmin', 'admin', 'kassir']}>
          <KassaPage />
        </ProtectedRoute>
      } />
      <Route path="/admin/*" element={
        <ProtectedRoute roles={['superadmin', 'admin']}>
          <AdminPage />
        </ProtectedRoute>
      } />
      <Route path="/warehouse/*" element={
        <ProtectedRoute roles={['superadmin', 'admin', 'skladchi']}>
          <WarehousePage />
        </ProtectedRoute>
      } />
      <Route path="/operator/*" element={
        <ProtectedRoute roles={['superadmin', 'admin', 'operator']}>
          <OperatorPage />
        </ProtectedRoute>
      } />

      <Route path="/kontragent/*" element={
        <ProtectedRoute roles={['kontragent']}>
          <KontragentPage />
        </ProtectedRoute>
      } />


      <Route path="/buxgalter/*" element={
        <ProtectedRoute roles={['superadmin', 'admin', 'buxgalter']}>
          <BuxgalterPage />
        </ProtectedRoute>
      } />


      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>

  )
}
