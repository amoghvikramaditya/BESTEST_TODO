import { useEffect, useRef, useState } from 'react'

import { gsap } from 'gsap'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth.js'

export default function Signup() {
  const { signUp, confirmSignUp, resendSignUpCode } = useAuth()
  const [step, setStep] = useState('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const containerRef = useRef(null)

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const [verification, setVerification] = useState({
    code: '',
  })

  useEffect(() => {
    if (containerRef.current) {
      const ctx = gsap.context(() => {
        gsap.fromTo(
          '.signup-card',
          { opacity: 0, y: 36 },
          { opacity: 1, y: 0, stagger: 0.1, duration: 0.5, ease: 'power2.out' },
        )
      }, containerRef)

      return () => ctx.revert()
    }
  }, [])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setError('')
    setLoading(true)

    try {
      await signUp({ email: form.email.trim().toLowerCase(), password: form.password, name: form.name.trim() })
      setStep('verify')
    } catch (err) {
      setError(err.message ?? 'Failed to sign up')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      await confirmSignUp({ email: form.email.trim().toLowerCase(), code: verification.code.trim() })
      navigate(`/login?email=${encodeURIComponent(form.email.trim().toLowerCase())}`, { replace: true })
    } catch (err) {
      setError(err.message ?? 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setError('')
    try {
      await resendSignUpCode({ email: form.email.trim().toLowerCase() })
    } catch (err) {
      setError(err.message ?? 'Could not resend code')
    }
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-200 px-4 py-12">
      <div className="mx-auto w-full max-w-5xl">
        <div className="grid gap-8 overflow-hidden rounded-3xl bg-white/90 shadow-2xl backdrop-blur md:grid-cols-[1.15fr,0.85fr]">
          <div className="signup-card hidden flex-col justify-between bg-gradient-to-br from-brand to-brand-dark p-10 text-white md:flex">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-white/70">BEST TODO</p>
              <h2 className="mt-4 text-3xl font-semibold">Create, schedule, succeed</h2>
              <p className="mt-3 text-sm text-white/80">
                Build powerful task workflows with reminders, smart folders, and real-time updates backed by AWS.
              </p>
            </div>
            <ul className="mt-10 space-y-3 text-sm text-white/85">
              <li className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-xs font-semibold text-white">01</span>
                Keep tasks synced everywhere
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-xs font-semibold text-white">02</span>
                Organise with unlimited folders
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-xs font-semibold text-white">03</span>
                Automate reminders and priority
              </li>
            </ul>
          </div>

          <div className="signup-card p-8 sm:p-10">
            <div className="mb-8 rounded-2xl bg-gradient-to-br from-brand/15 to-brand/5 p-6 text-center text-sm text-slate-600 md:hidden">
              <h2 className="text-lg font-semibold text-slate-900">Create, schedule, succeed</h2>
              <p className="mt-2 text-sm">Stay organised with lists, reminders, and collaborative-ready workflows.</p>
            </div>

            <header className="mb-8 text-center sm:text-left">
              <h1 className="text-3xl font-semibold text-slate-900">
                {step === 'form' ? 'Create your account' : 'Verify your email'}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                {step === 'form'
                  ? 'Sign up to manage tasks across devices. A verification code will be sent to your email.'
                  : 'Enter the 6-digit code from your inbox to finish setting up your account.'}
              </p>
            </header>

            {step === 'form' ? (
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-600">
                      Name
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={form.name}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    />
                  </div>
                  <div className="sm:col-span-2">
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
                      autoComplete="new-password"
                      value={form.password}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    />
                  </div>
                  <div>
                    <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-slate-600">
                      Confirm password
                    </label>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      required
                      autoComplete="new-password"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    />
                  </div>
                </div>

                {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

                <button type="submit" className="btn w-full" disabled={loading}>
                  {loading ? 'Creating account…' : 'Sign up'}
                </button>
              </form>
            ) : (
              <form className="space-y-5" onSubmit={handleVerify}>
                <p className="text-sm text-slate-600">
                  Enter the 6-digit code sent to <span className="font-medium text-slate-900">{form.email}</span> to verify your
                  account.
                </p>
                <div>
                  <label htmlFor="code" className="mb-1 block text-sm font-medium text-slate-600">
                    Verification code
                  </label>
                  <input
                    id="code"
                    name="code"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    value={verification.code}
                    onChange={(event) => setVerification({ code: event.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-center text-lg tracking-widest focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                </div>

                {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button type="submit" className="btn flex-1" disabled={loading}>
                    {loading ? 'Verifying…' : 'Verify email'}
                  </button>
                  <button type="button" className="btn-secondary flex-1" onClick={handleResend}>
                    Resend code
                  </button>
                </div>
              </form>
            )}

            <p className="signup-card mt-8 text-center text-sm text-slate-500">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-brand hover:text-brand-dark">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

