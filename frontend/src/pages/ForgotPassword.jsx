import { useEffect, useRef, useState } from 'react'

import { gsap } from 'gsap'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth.js'

export default function ForgotPassword() {
  const { forgotPassword, completeForgotPassword } = useAuth()
  const [step, setStep] = useState('request')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.forgot-card',
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out', stagger: 0.08 },
      )
    }, containerRef)

    return () => ctx.revert()
  }, [])

  const handleRequest = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      await forgotPassword({ email: email.trim().toLowerCase() })
      setStep('confirm')
    } catch (err) {
      setError(err.message ?? 'Failed to send reset code')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      await completeForgotPassword({ email: email.trim().toLowerCase(), code: code.trim(), password })
      navigate(`/login?email=${encodeURIComponent(email.trim().toLowerCase())}`, { replace: true })
    } catch (err) {
      setError(err.message ?? 'Could not reset password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-200 px-4 py-12">
      <div className="mx-auto w-full max-w-5xl">
        <div className="grid gap-8 overflow-hidden rounded-3xl bg-white/90 shadow-2xl backdrop-blur md:grid-cols-[1.05fr,0.95fr]">
          <div className="forgot-card hidden flex-col justify-between bg-gradient-to-br from-brand to-brand-dark p-10 text-white md:flex">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-white/70">BEST TODO</p>
              <h2 className="mt-4 text-3xl font-semibold">Recover access quickly</h2>
              <p className="mt-3 text-sm text-white/80">
                Securely reset your password and jump back into your organised workspace in just a couple of steps.
              </p>
            </div>
            <ul className="mt-10 space-y-3 text-sm text-white/85">
              <li className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-xs font-semibold text-white">01</span>
                Request a verification code
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-xs font-semibold text-white">02</span>
                Confirm your identity securely
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-xs font-semibold text-white">03</span>
                Set a fresh password instantly
              </li>
            </ul>
          </div>

          <div className="forgot-card p-8 sm:p-10">
            <div className="mb-8 rounded-2xl bg-gradient-to-br from-brand/15 to-brand/5 p-6 text-center text-sm text-slate-600 md:hidden">
              <h2 className="text-lg font-semibold text-slate-900">Recover access quickly</h2>
              <p className="mt-2 text-sm">Securely reset your password in two simple steps.</p>
            </div>

            <header className="mb-8 text-center sm:text-left">
              <h1 className="text-3xl font-semibold text-slate-900">Reset your password</h1>
              <p className="mt-2 text-sm text-slate-500">
                {step === 'request' ? 'We will email you a reset code.' : 'Enter the code and choose a new password.'}
              </p>
            </header>

            {step === 'request' ? (
              <form className="space-y-6" onSubmit={handleRequest}>
                <div>
                  <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-600">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                </div>

                {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

                <button type="submit" className="btn w-full" disabled={loading}>
                  {loading ? 'Sending reset code…' : 'Send reset code'}
                </button>
              </form>
            ) : (
              <form className="space-y-6" onSubmit={handleConfirm}>
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="code" className="mb-1 block text-sm font-medium text-slate-600">
                      Verification code
                    </label>
                    <input
                      id="code"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      required
                      value={code}
                      onChange={(event) => setCode(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    />
                  </div>
                  <div>
                    <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-600">
                      New password
                    </label>
                    <input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    />
                  </div>
                </div>

                {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

                <button type="submit" className="btn w-full" disabled={loading}>
                  {loading ? 'Resetting password…' : 'Reset password'}
                </button>
              </form>
            )}

            <p className="forgot-card mt-8 text-center text-sm text-slate-500">
              Remembered your password?{' '}
              <Link to="/login" className="font-medium text-brand hover:text-brand-dark">
                Back to login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

