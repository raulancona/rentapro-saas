'use client'

import { useState, useEffect } from 'react'
import {
  Briefcase, Plus, Calendar, Trash2, X, ChevronDown, ChevronUp,
  MapPin, DollarSign, Users, Package, Save, Edit3, CheckCircle2,
  Pause, AlertCircle, BarChart2, Clock
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

const STATUS_OPTIONS = [
  { value: 'active',    label: 'Activo',     cls: 'badge-success', Icon: CheckCircle2 },
  { value: 'on_hold',   label: 'En Pausa',   cls: 'badge-warn',    Icon: Pause },
  { value: 'completed', label: 'Completado', cls: 'badge-info',    Icon: CheckCircle2 },
]

const BOOKING_STATUS: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'Pendiente',  cls: 'badge-warn' },
  confirmed: { label: 'Confirmada', cls: 'badge-info' },
  active:    { label: 'En Curso',   cls: 'badge-success' },
  completed: { label: 'Completada', cls: 'badge-neutral' },
  cancelled: { label: 'Cancelada',  cls: 'badge-danger' },
  late:      { label: 'Retrasada',  cls: 'badge-danger' },
}

const COLOR_PRESETS = [
  '#2563eb', '#7c3aed', '#db2777', '#dc2626',
  '#d97706', '#16a34a', '#0891b2', '#475569',
]

const defaultForm = { name: '', client_id: '', start_date: '', end_date: '', description: '', location: '', budget: '', color: '#2563eb', status: 'active' }

export default function ProjectsPage() {
  const [projects, setProjects]     = useState<any[]>([])
  const [clients, setClients]       = useState<any[]>([])
  const [bookings, setBookings]     = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [showModal, setShowModal]   = useState(false)
  const [editId, setEditId]         = useState<string | null>(null)
  const [form, setForm]             = useState(defaultForm)
  const [saving, setSaving]         = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const supabase = createClient()

  const fetchAll = async () => {
    setLoading(true)
    const [p, c, b] = await Promise.all([
      supabase.from('projects').select('*, clients(name)').order('created_at', { ascending: false }),
      supabase.from('clients').select('id, name'),
      supabase.from('bookings').select('id, project_id, status, total_price, document_number, start_date, end_date, client:clients!bookings_client_id_fkey(name), booking_items(equipment(name))').neq('status', 'cancelled'),
    ])
    setProjects(p.data || [])
    setClients(c.data || [])
    setBookings(b.data || [])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  const openNew = () => {
    setEditId(null)
    setForm(defaultForm)
    setShowModal(true)
  }

  const openEdit = (project: any) => {
    setEditId(project.id)
    setForm({
      name:        project.name        || '',
      client_id:   project.client_id   || '',
      start_date:  project.start_date  || '',
      end_date:    project.end_date    || '',
      description: project.description || '',
      location:    project.location    || '',
      budget:      project.budget?.toString() || '',
      color:       project.color       || '#2563eb',
      status:      project.status      || 'active',
    })
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const payload = {
      name:        form.name,
      client_id:   form.client_id   || null,
      start_date:  form.start_date  || null,
      end_date:    form.end_date    || null,
      status:      form.status,
      description: form.description || null,
      location:    form.location    || null,
      budget:      parseFloat(form.budget) || 0,
      color:       form.color,
    }
    if (editId) {
      const { error } = await supabase.from('projects').update(payload).eq('id', editId)
      if (error) { alert('Error: ' + error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from('projects').insert([payload])
      if (error) { alert('Error: ' + error.message); setSaving(false); return }
    }
    setShowModal(false)
    setEditId(null)
    setForm(defaultForm)
    fetchAll()
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este proyecto? Las rentas asociadas perderán la referencia.')) return
    await supabase.from('projects').delete().eq('id', id)
    fetchAll()
  }

  const handleQuickStatusChange = async (id: string, newStatus: string) => {
    await supabase.from('projects').update({ status: newStatus }).eq('id', id)
    setProjects(ps => ps.map(p => p.id === id ? { ...p, status: newStatus } : p))
  }

  // Computed per-project metrics
  const getProjectMetrics = (projectId: string) => {
    const related = bookings.filter(b => b.project_id === projectId)
    const total = related.length
    const completed = related.filter(b => b.status === 'completed').length
    const active = related.filter(b => ['active', 'confirmed'].includes(b.status)).length
    const revenue = related.reduce((s, b) => s + Number(b.total_price || 0), 0)
    return { total, completed, active, revenue, bookings: related }
  }

  const filtered = projects.filter(p => filterStatus === 'all' || p.status === filterStatus)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Proyectos</h1>
          <p className="text-muted text-sm mt-1">Obras, eventos o campañas que agrupan múltiples rentas.</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-brand hover:bg-brand-light text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors">
          <Plus size={18} /> Nuevo Proyecto
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {[{ value:'all', label:'Todos' }, ...STATUS_OPTIONS].map(opt => (
          <button
            key={opt.value}
            onClick={() => setFilterStatus(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filterStatus === opt.value ? 'bg-brand text-white' : 'bg-surface-alt text-muted hover:text-foreground'}`}
          >
            {opt.label}
            {opt.value !== 'all' && (
              <span className="ml-1 opacity-70">
                ({projects.filter(p => p.status === opt.value).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {loading && <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-28 bg-white animate-pulse rounded-xl border border-border" />)}</div>}

      {!loading && filtered.length === 0 && (
        <div className="card p-12 text-center">
          <Briefcase size={40} className="mx-auto text-muted/30 mb-3" />
          <p className="text-muted text-sm">
            {filterStatus === 'all' ? 'Sin proyectos. Crea uno para agrupar rentas.' : 'Sin proyectos en este estado.'}
          </p>
          {filterStatus === 'all' && (
            <button onClick={openNew} className="text-brand font-semibold text-sm mt-2 hover:underline">Crear proyecto →</button>
          )}
        </div>
      )}

      {/* Project cards */}
      <div className="space-y-3">
        {filtered.map(project => {
          const metrics   = getProjectMetrics(project.id)
          const statusOpt = STATUS_OPTIONS.find(s => s.value === project.status) || STATUS_OPTIONS[0]
          const isExpanded = expandedId === project.id
          const progress   = metrics.total > 0 ? Math.round((metrics.completed / metrics.total) * 100) : 0
          const budgetUsed = project.budget > 0 ? Math.min(100, Math.round((metrics.revenue / project.budget) * 100)) : 0

          return (
            <div key={project.id} className="card overflow-hidden">
              {/* Color accent bar */}
              <div className="h-1 w-full" style={{ backgroundColor: project.color || '#2563eb' }} />

              <div className="p-5">
                {/* Top row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    {/* Color icon */}
                    <div
                      className="h-11 w-11 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                      style={{ backgroundColor: project.color || '#2563eb' }}
                    >
                      <Briefcase size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-foreground text-base">{project.name}</h3>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusOpt.cls}`}>
                          {statusOpt.label}
                        </span>
                      </div>
                      {project.clients?.name && (
                        <div className="flex items-center gap-1 text-sm text-muted mt-0.5">
                          <Users size={13} className="text-brand" />
                          {project.clients.name}
                        </div>
                      )}
                      {project.location && (
                        <div className="flex items-center gap-1 text-xs text-muted mt-0.5">
                          <MapPin size={12} className="text-brand" />
                          {project.location}
                        </div>
                      )}
                      {project.description && (
                        <p className="text-xs text-muted mt-1 line-clamp-2">{project.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Right: actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Quick status */}
                    <select
                      value={project.status}
                      onChange={e => handleQuickStatusChange(project.id, e.target.value)}
                      className="text-xs rounded-lg px-2 py-1.5 border border-border text-muted"
                      onClick={e => e.stopPropagation()}
                    >
                      {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <button onClick={() => openEdit(project)} className="p-2 rounded-lg text-muted hover:text-brand hover:bg-blue-50 transition-colors"><Edit3 size={16} /></button>
                    <button onClick={() => handleDelete(project.id)} className="p-2 rounded-lg text-muted hover:text-danger hover:bg-red-50 transition-colors"><Trash2 size={16} /></button>
                  </div>
                </div>

                {/* Metrics row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  <MetricChip icon={BarChart2} label="Rentas" value={String(metrics.total)} sub={`${metrics.completed} completadas`} />
                  <MetricChip icon={Clock}     label="Activas" value={String(metrics.active)} sub="en curso o confirmadas" />
                  <MetricChip icon={DollarSign} label="Facturado" value={`$${metrics.revenue.toLocaleString()}`} sub={project.budget > 0 ? `de $${Number(project.budget).toLocaleString()}` : 'sin presupuesto'} />
                  <MetricChip icon={Calendar}  label="Período" value={project.start_date ? new Date(project.start_date + 'T12:00:00').toLocaleDateString('es-MX', { day:'numeric', month:'short' }) : '—'} sub={project.end_date ? `→ ${new Date(project.end_date + 'T12:00:00').toLocaleDateString('es-MX', { day:'numeric', month:'short' })}` : 'Sin fecha fin'} />
                </div>

                {/* Progress bars */}
                {metrics.total > 0 && (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted">Rentas completadas</span>
                        <span className="text-xs font-bold text-foreground">{progress}%</span>
                      </div>
                      <div className="h-2 bg-surface-alt rounded-full overflow-hidden">
                        <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                    {project.budget > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted">Presupuesto usado</span>
                          <span className={`text-xs font-bold ${budgetUsed >= 100 ? 'text-danger' : 'text-foreground'}`}>{budgetUsed}%</span>
                        </div>
                        <div className="h-2 bg-surface-alt rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-500 ${budgetUsed >= 100 ? 'bg-danger' : budgetUsed >= 80 ? 'bg-warning' : 'bg-brand'}`} style={{ width: `${budgetUsed}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Expand toggle */}
                {metrics.total > 0 && (
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : project.id)}
                    className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium text-muted hover:text-brand hover:bg-surface-alt transition-colors border border-border"
                  >
                    {isExpanded ? <><ChevronUp size={15} /> Ocultar rentas</> : <><ChevronDown size={15} /> Ver {metrics.total} renta{metrics.total !== 1 ? 's' : ''}</>}
                  </button>
                )}

                {metrics.total === 0 && (
                  <p className="mt-3 text-xs text-muted/60 text-center">Sin rentas asignadas aún — asigna este proyecto al crear una renta.</p>
                )}
              </div>

              {/* Expanded bookings */}
              {isExpanded && (
                <div className="border-t border-border bg-surface/50 px-5 py-4 space-y-2">
                  <h4 className="text-xs font-semibold text-muted uppercase mb-3">Rentas del proyecto</h4>
                  {metrics.bookings.map(b => {
                    const bst = BOOKING_STATUS[b.status] || BOOKING_STATUS.pending
                    const itemNames = (b.booking_items || []).map((bi: any) => bi.equipment?.name).filter(Boolean).join(', ')
                    return (
                      <div key={b.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-border">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center text-brand flex-shrink-0">
                            <Package size={14} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {b.client?.name || 'Sin cliente'}
                              {b.document_number && <span className="font-normal text-muted"> · {b.document_number}</span>}
                            </p>
                            {itemNames && <p className="text-xs text-muted truncate">{itemNames}</p>}
                            {b.start_date && (
                              <p className="text-xs text-muted">
                                {new Date(b.start_date + 'T12:00:00').toLocaleDateString('es-MX', { day:'numeric', month:'short' })}
                                {b.end_date && ` → ${new Date(b.end_date + 'T12:00:00').toLocaleDateString('es-MX', { day:'numeric', month:'short' })}`}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {b.total_price > 0 && <span className="text-sm font-bold text-foreground">${Number(b.total_price).toLocaleString()}</span>}
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${bst.cls}`}>{bst.label}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ══ Modal ══ */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-overlay">
          <div className="card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-foreground">{editId ? 'Editar Proyecto' : 'Nuevo Proyecto'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-surface-alt rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">

              {/* Color picker */}
              <div>
                <label className="text-xs font-semibold text-muted uppercase block mb-2">Color del proyecto</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {COLOR_PRESETS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm({ ...form, color: c })}
                      className={`w-7 h-7 rounded-full transition-all ${form.color === c ? 'ring-2 ring-offset-2 ring-foreground/30 scale-110' : ''}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={form.color}
                    onChange={e => setForm({ ...form, color: e.target.value })}
                    className="w-7 h-7 rounded-full cursor-pointer border border-border"
                    title="Color personalizado"
                  />
                </div>
              </div>

              <input required placeholder="Nombre del Proyecto *" className="w-full rounded-xl px-4 py-2.5 text-sm" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />

              <div className="grid grid-cols-2 gap-3">
                <select className="w-full rounded-xl px-4 py-2.5 text-sm" value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}>
                  <option value="">Sin cliente</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select className="w-full rounded-xl px-4 py-2.5 text-sm" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <textarea
                placeholder="Descripción del proyecto (obra, evento, campaña...)"
                rows={2}
                className="w-full rounded-xl px-4 py-2.5 text-sm resize-none"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />

              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                <input placeholder="Ubicación / Dirección / Coordenadas" className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
              </div>

              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                <input type="number" step="0.01" min="0" placeholder="Presupuesto total del proyecto" className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted font-medium block mb-1">Fecha inicio</label>
                  <input type="date" className="w-full rounded-xl px-4 py-2.5 text-sm" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted font-medium block mb-1">Fecha fin</label>
                  <input type="date" className="w-full rounded-xl px-4 py-2.5 text-sm" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
                </div>
              </div>

              <button disabled={saving} className="w-full bg-brand hover:bg-brand-light text-white rounded-xl py-2.5 font-semibold text-sm disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                {saving ? 'Guardando...' : <><Save size={16} /> {editId ? 'Actualizar Proyecto' : 'Crear Proyecto'}</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function MetricChip({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub: string }) {
  return (
    <div className="bg-surface-alt rounded-xl p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted mb-1">
        <Icon size={12} className="text-brand" />
        {label}
      </div>
      <p className="text-sm font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted mt-0.5">{sub}</p>
    </div>
  )
}
