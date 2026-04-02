'use client'

import { useState, useEffect } from 'react'
import { Briefcase, Plus, Calendar, CheckCircle2, ChevronRight, Pause, X, Trash2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', client_id: '', start_date: '', end_date: '' })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const fetch = async () => {
    setLoading(true)
    const [p, c] = await Promise.all([
      supabase.from('projects').select('*, clients(name)').order('created_at', { ascending: false }),
      supabase.from('clients').select('id, name')
    ])
    setProjects(p.data || [])
    setClients(c.data || [])
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('projects').insert([{ ...form, status: 'active' }])
    if (error) alert('Error: ' + error.message)
    else { setShowModal(false); setForm({ name: '', client_id: '', start_date: '', end_date: '' }); fetch() }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este proyecto?')) return
    await supabase.from('projects').delete().eq('id', id)
    fetch()
  }

  const statusMap: any = {
    active: { label: 'Activo', class: 'badge-success' },
    completed: { label: 'Completado', class: 'badge-info' },
    on_hold: { label: 'En Pausa', class: 'badge-warn' },
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Proyectos</h1>
          <p className="text-muted text-sm mt-1">Agrupa rentas por obra, evento o campaña.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-brand hover:bg-brand-light text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors">
          <Plus size={18} /> Nuevo Proyecto
        </button>
      </div>

      {loading && <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-20 bg-white animate-pulse rounded-xl border border-border" />)}</div>}

      {!loading && projects.length === 0 && (
        <div className="card p-12 text-center">
          <Briefcase size={40} className="mx-auto text-muted/30 mb-3" />
          <p className="text-muted text-sm">Sin proyectos. Crea uno para agrupar rentas.</p>
          <button onClick={() => setShowModal(true)} className="text-brand font-semibold text-sm mt-2 hover:underline">Crear proyecto →</button>
        </div>
      )}

      <div className="space-y-3">
        {projects.map((p) => (
          <div key={p.id} className="card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
            <div className="flex items-center gap-4">
              <div className="h-11 w-11 rounded-xl bg-blue-50 flex items-center justify-center text-brand"><Briefcase size={22} /></div>
              <div>
                <h3 className="font-semibold text-foreground">{p.name}</h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm text-muted">{p.clients?.name || 'Sin cliente'}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusMap[p.status]?.class || 'badge-neutral'}`}>
                    {statusMap[p.status]?.label || p.status}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted">
              {p.start_date && <span className="flex items-center gap-1"><Calendar size={14} className="text-brand" />{p.start_date}</span>}
              <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg hover:text-danger hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-overlay">
          <div className="card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-foreground">Nuevo Proyecto</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-surface-alt rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <input required placeholder="Nombre del Proyecto *" className="w-full rounded-xl px-4 py-2.5 text-sm" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              <select required className="w-full rounded-xl px-4 py-2.5 text-sm" value={form.client_id} onChange={e => setForm({...form, client_id: e.target.value})}>
                <option value="">Selecciona un cliente *</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted font-medium block mb-1">Fecha Inicio</label>
                  <input type="date" className="w-full rounded-xl px-4 py-2.5 text-sm" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs text-muted font-medium block mb-1">Fecha Fin</label>
                  <input type="date" className="w-full rounded-xl px-4 py-2.5 text-sm" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} />
                </div>
              </div>
              <button disabled={saving} className="w-full bg-brand hover:bg-brand-light text-white rounded-xl py-2.5 font-semibold text-sm disabled:opacity-50 transition-colors">
                {saving ? 'Guardando...' : 'Crear Proyecto'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
