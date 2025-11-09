import { useEffect, useRef, useState } from 'react'

import { gsap } from 'gsap'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth.js'
import { GLASS_PANEL_CLASS, GLASS_INPUT_CLASS } from '../styles/glass.js'

const AUTH_BACKGROUND_IMAGE = '/images/dashboard-background.webp'

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
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-16 sm:py-20"
    >
      <div
        className="absolute inset-0 -z-20 bg-cover bg-center bg-fixed"
        style={{ backgroundImage: `url(${AUTH_BACKGROUND_IMAGE})` }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-950/45 via-slate-900/25 to-slate-950/55 backdrop-blur-[4px]"
        aria-hidden="true"
      />
      <div className="relative mx-auto w-full max-w-6xl">
        <div className={`${GLASS_PANEL_CLASS} overflow-hidden text-white`}>
          <div className="grid md:grid-cols-[1.15fr,0.85fr]">
            <aside className="relative hidden md:flex">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${AUTH_BACKGROUND_IMAGE})` }}
                aria-hidden="true"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-slate-950/65 via-slate-950/40 to-slate-950/70" aria-hidden="true" />
              <div className="relative z-10 flex w-full flex-col justify-between p-10">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-white/70">BESTEST TODO</p>
                  <h2 className="mt-4 text-3xl font-semibold">Turn your to-dos into done.</h2>
                  <p className="mt-3 text-sm text-white/80">
                    Your day, perfectly organized. Focus on what matters. We'll track the rest.
                  </p>
                </div>
              </div>
            </aside>

            <div className="login-card relative flex flex-col justify-center border-t border-white/10 bg-slate-950/35 p-6 sm:p-10 backdrop-blur-xl md:border-l md:border-t-0">
              <div className="mb-8 rounded-2xl border border-white/15 bg-white/10 p-6 text-center text-sm text-white/85 md:hidden">
                <h2 className="text-lg font-semibold text-white">Turn your to-dos into done.</h2>
                <p className="mt-2 text-sm text-white/75">
                  Your day, perfectly organized. Focus on what matters. We'll track the rest.
                </p>
              </div>

              <header className="mb-8 text-center sm:text-left">
                <h1 className="text-3xl font-semibold">Welcome back</h1>
                <p className="mt-2 text-sm text-white/70">Sign in with Cognito to access your tasks.</p>
              </header>

              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-6">
                  <div>
                    <label htmlFor="email" className="mb-1 block text-sm font-medium text-white/75">
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
                      className={GLASS_INPUT_CLASS}
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="mb-1 block text-sm font-medium text-white/75">
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
                      className={GLASS_INPUT_CLASS}
                    />
                  </div>
                </div>

                {error && (
                  <p className="rounded-lg border border-red-300/40 bg-red-500/20 px-4 py-3 text-sm text-red-100">{error}</p>
                )}

                <button type="submit" className="btn w-full" disabled={loading}>
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>

              <div className="login-card mt-8 space-y-2 text-center text-sm text-white/70">
                <p>
                  Forgot your password?{' '}
                  <Link to="/forgot-password" className="font-medium text-white hover:text-white/80">
                    Reset it
                  </Link>
                </p>
                <p>
                  New here?{' '}
                  <Link to="/signup" className="font-medium text-white hover:text-white/80">
                    Create an account
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

