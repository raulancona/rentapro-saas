'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Lock, Mail, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else {
        setSuccess('Cuenta creada. Inicia sesión.')
        setIsSignUp(false)
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError('Correo o contraseña incorrectos.')
      else router.push('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-surface">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 bg-brand text-white rounded-2xl flex items-center justify-center mb-4 font-bold text-xl">R</div>
          <h1 className="text-2xl font-bold text-foreground">RentaPro</h1>
          <p className="text-muted mt-1 text-sm">{isSignUp ? 'Crea tu cuenta de empresa' : 'Accede a tu panel'}</p>
        </div>

        <div className="card p-6">
          {error && <div className="p-3 mb-4 rounded-lg text-sm font-medium badge-danger">{error}</div>}
          {success && <div className="p-3 mb-4 rounded-lg text-sm font-medium badge-success">{success}</div>}

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-wide block mb-1.5">Correo</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                <input type="email" required className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-wide block mb-1.5">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                <input type="password" required minLength={6} className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            </div>
            <button disabled={loading} className="w-full bg-brand hover:bg-brand-light text-white rounded-xl py-2.5 font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
              {loading ? 'Cargando...' : isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>
        </div>

        <p className="text-center mt-4 text-sm text-muted">
          <button onClick={() => { setIsSignUp(!isSignUp); setError(null); setSuccess(null) }} className="text-brand font-semibold hover:underline">
            {isSignUp ? 'Ya tengo cuenta → Entrar' : '¿Sin cuenta? → Registrarse'}
          </button>
        </p>
      </div>
    </div>
  )
}
