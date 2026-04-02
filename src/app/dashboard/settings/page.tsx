'use client'

import { useState, useEffect } from 'react'
import { Save, CheckCircle } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({ name: '', slug: '', phone: '', email: '', address: '', currency: 'MXN' })
  const [tenantId, setTenantId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
      if (!profile) return
      setTenantId(profile.tenant_id)
      const { data: tenant } = await supabase.from('tenants').select('*').eq('id', profile.tenant_id).single()
      if (tenant) {
        setForm({
          name: tenant.name || '',
          slug: tenant.slug || '',
          phone: tenant.phone || '',
          email: tenant.email || '',
          address: tenant.address || '',
          currency: tenant.currency || 'MXN',
        })
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenantId) return
    setSaving(true)
    setSaved(false)
    const { error } = await supabase.from('tenants').update({
      name: form.name,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      currency: form.currency,
    }).eq('id', tenantId)
    if (error) alert('Error: ' + error.message)
    else { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    setSaving(false)
  }

  if (loading) return (
    <div className="space-y-4 max-w-xl">
      {[1,2,3].map(i => <div key={i} className="h-14 bg-white animate-pulse rounded-xl border border-border" />)}
    </div>
  )

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configuración</h1>
        <p className="text-muted text-sm mt-1">Datos de tu empresa. Aparecen en los documentos PDF generados.</p>
      </div>

      <form onSubmit={handleSave} className="card p-6 space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-border">
          <div className="h-12 w-12 rounded-xl bg-brand flex items-center justify-center text-white font-bold text-xl">
            {form.name?.[0]?.toUpperCase() || 'R'}
          </div>
          <div>
            <p className="font-semibold text-foreground">{form.name || 'Tu Empresa'}</p>
            <p className="text-xs text-muted">slug: {form.slug}</p>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted uppercase block mb-1.5">Nombre de Empresa *</label>
          <input required className="w-full rounded-xl px-4 py-2.5 text-sm" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted uppercase block mb-1.5">Teléfono</label>
            <input type="tel" className="w-full rounded-xl px-4 py-2.5 text-sm" placeholder="+52 555 000 0000" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted uppercase block mb-1.5">Email</label>
            <input type="email" className="w-full rounded-xl px-4 py-2.5 text-sm" placeholder="info@empresa.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted uppercase block mb-1.5">Dirección</label>
          <input className="w-full rounded-xl px-4 py-2.5 text-sm" placeholder="Calle, Ciudad, Estado" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
        </div>

        <div>
          <label className="text-xs font-semibold text-muted uppercase block mb-1.5">Moneda</label>
          <select className="w-full rounded-xl px-4 py-2.5 text-sm" value={form.currency} onChange={e => setForm({...form, currency: e.target.value})}>
            <option value="MXN">MXN — Peso Mexicano</option>
            <option value="USD">USD — Dólar Americano</option>
            <option value="EUR">EUR — Euro</option>
            <option value="COP">COP — Peso Colombiano</option>
            <option value="ARS">ARS — Peso Argentino</option>
            <option value="CLP">CLP — Peso Chileno</option>
          </select>
        </div>

        <button
          disabled={saving}
          className="w-full bg-brand hover:bg-brand-light text-white rounded-xl py-2.5 font-semibold text-sm disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {saved ? <><CheckCircle size={16} /> Guardado</> : saving ? 'Guardando...' : <><Save size={16} /> Guardar Cambios</>}
        </button>
      </form>
    </div>
  )
}
