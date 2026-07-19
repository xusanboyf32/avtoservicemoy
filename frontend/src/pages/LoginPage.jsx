import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore, useThemeStore } from '../store'
import { authApi } from '../api'

export default function LoginPage() {
  const { t, i18n } = useTranslation()
  const { dark, toggle } = useThemeStore()
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      // Backend JSON kutayapti: { username, password }
      const res = await authApi.login({
        username: form.username.trim(),
        password: form.password,
      })
      const token = res.data.access_token
      localStorage.setItem('token', token)


      // Foydalanuvchi ma'lumotlarini olish
      const me = await authApi.me()
      setAuth(me.data, token)
      navigate('/')


    } catch (err) {
      const msg = err.response?.data?.detail
      if (msg === 'Username yoki parol xato!') {
        setError(t('login.error'))
      } else {
        setError(t('login.error'))
      }
    } finally {
      setLoading(false)
    }
  }



  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 20
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 64, height: 64,
          background: 'var(--accent)',
          borderRadius: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 12px',
          fontSize: 30
        }}>🛢️</div>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 1 }}>MUROD OIL</div>
        <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>POS Tizimi</div>
      </div>

      {/* Forma */}
      <form onSubmit={handleLogin} style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '28px 32px',
        width: 360,
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        flexDirection: 'column',
        gap: 14
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, textAlign: 'center', marginBottom: 4 }}>
          {t('login.title')}
        </div>

        {/* Username */}
        <div>
          <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 5 }}>
            {t('login.username')}
          </label>
          <input
            type="text"
            value={form.username}
            onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
            required
            autoFocus
            autoComplete="username"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1.5px solid var(--border)',
              borderRadius: 'var(--radius)',
              background: 'var(--surface2)',
              color: 'var(--text)',
              fontSize: 14,
            }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>

        {/* Parol */}
        <div>
          <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 5 }}>
            {t('login.password')}
          </label>
          <input
            type="password"
            value={form.password}
            onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
            required
            autoComplete="current-password"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1.5px solid var(--border)',
              borderRadius: 'var(--radius)',
              background: 'var(--surface2)',
              color: 'var(--text)',
              fontSize: 14,
            }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>

        {/* Xato */}
        {error && (
          <div style={{
            background: 'var(--danger-light)',
            color: 'var(--danger)',
            padding: '8px 12px',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 500
          }}>{error}</div>
        )}

        {/* Kirish tugmasi */}
        <button
          type="submit"
          disabled={loading}
          style={{
            background: 'var(--accent)',
            color: '#fff',
            padding: '12px',
            borderRadius: 'var(--radius)',
            fontWeight: 700,
            fontSize: 15,
            marginTop: 4,
            opacity: loading ? 0.7 : 1,
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'opacity .15s'
          }}
        >
          {loading ? t('common.loading') : t('login.button')}
        </button>
      </form>




      {/* Tema */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={toggle} style={{
          padding: '7px 14px',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          fontSize: 15,
          cursor: 'pointer'
        }}>
          {dark ? '☀️' : '🌙'}
        </button>
      </div>





    </div>
  )
}
