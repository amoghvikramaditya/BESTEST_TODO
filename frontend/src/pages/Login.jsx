import { useEffect, useRef, useState } from 'react'

import { gsap } from 'gsap'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth.js'

export default function Login() {
  const { signIn, isAuthenticated, initializing, authError } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const containerRef = useRef(null)

  const [form, setForm] = useState({
    email: searchParams.get('email') ?? '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (containerRef.current) {
      const ctx = gsap.context(() => {
        gsap.fromTo(
          '.login-card',
          {
            opacity: 0,
            y: 32,
          },
          {
            opacity: 1,
            y: 0,
            duration: 0.5,
            ease: 'power2.out',
            stagger: 0.08,
          },
        )
      }, containerRef)

      return () => ctx.revert()
    }
  }, [])

  useEffect(() => {
    if (!initializing && isAuthenticated) {
      navigate('/', { replace: true })
    }
  }, [isAuthenticated, initializing, navigate])

  useEffect(() => {
    if (authError) {
      setError(authError.message ?? 'Something went wrong')
    }
  }, [authError])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      await signIn({ username: form.email.trim().toLowerCase(), password: form.password })
      navigate('/', { replace: true })
    } catch (err) {
      console.error('signIn failed', err)
      setError(err.message ?? 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-200 px-4 py-12"
    >
      <div className="mx-auto w-full max-w-5xl">
        <div className="grid gap-8 overflow-hidden rounded-3xl bg-white/90 shadow-2xl backdrop-blur md:grid-cols-[1.1fr,0.9fr]">
          <div className="login-card hidden flex-col justify-between bg-gradient-to-br from-brand to-brand-dark p-10 text-white md:flex">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-white/70">BEST TODO</p>
              <h2 className="mt-4 text-3xl font-semibold">Focus on what matters</h2>
              <p className="mt-3 text-sm text-white/80">
                Stay on top of every list with real-time sync, reminders, and smart filters across all your devices.
              </p>
            </div>
            <ul className="mt-10 space-y-3 text-sm text-white/85">
              <li className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-xs font-semibold text-white">
                  01
                </span>
                Drag-and-drop task ordering
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-xs font-semibold text-white">
                  02
                </span>
                Flexible folders and filters
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-xs font-semibold text-white">
                  03
                </span>
                Secure Cognito-backed sign in
              </li>
            </ul>
          </div>

          <div className="login-card p-8 sm:p-10">
            <div className="mb-8 rounded-2xl bg-gradient-to-br from-brand/15 to-brand/5 p-6 text-center text-sm text-slate-600 md:hidden">
              <h2 className="text-lg font-semibold text-slate-900">Focus on what matters</h2>
              <p className="mt-2 text-sm">Stay on top of every list with real-time sync wherever you sign in.</p>
            </div>

            <header className="mb-8 text-center sm:text-left">
              <h1 className="text-3xl font-semibold text-slate-900">Welcome back</h1>
              <p className="mt-2 text-sm text-slate-500">
                Sign in with your Cognito credentials to access your tasks.
              </p>
            </header>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-6">
                <div>
                  <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-600">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-600">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={form.password}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                </div>
              </div>

              {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

              <button type="submit" className="btn w-full" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <div className="login-card mt-8 space-y-2 text-center text-sm text-slate-500">
              <p>
                Forgot your password?{' '}
                <Link to="/forgot-password" className="font-medium text-brand hover:text-brand-dark">
                  Reset it
                </Link>
              </p>
              <p>
                New here?{' '}
                <Link to="/signup" className="font-medium text-brand hover:text-brand-dark">
                  Create an account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

