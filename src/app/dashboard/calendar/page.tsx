'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  CalendarIcon, Plus, Edit3, Trash2, CheckCircle2, Clock, X,
  AlertCircle, FileText, Package, ChevronLeft, ChevronRight, List, LayoutGrid
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { generateRentalPDF } from '@/utils/pdf'

const defaultForm = {
  client_id: '', project_id: '', start_date: '', end_date: '',
  status: 'pending', notes: '', deposit_amount: '', document_number: ''
}

function generateFolio() {
  const now = new Date()
  const y = now.getFullYear().toString().slice(-2)
  const m = (now.getMonth() + 1).toString().padStart(2, '0')
  const rand = Math.floor(Math.random() * 9000 + 1000)
  return `R${y}${m}-${rand}`
}

const STATUS_MAP: Record<string, { label: string; cls: string; bar: string; Icon: any }> = {
  pending:   { label: 'Pendiente',  cls: 'badge-warn',    bar: 'bg-amber-400',   Icon: Clock },
  confirmed: { label: 'Confirmada', cls: 'badge-info',    bar: 'bg-blue-500',    Icon: CheckCircle2 },
  active:    { label: 'En Curso',   cls: 'badge-success', bar: 'bg-emerald-500', Icon: CheckCircle2 },
  completed: { label: 'Completada', cls: 'badge-neutral', bar: 'bg-slate-400',   Icon: CheckCircle2 },
  cancelled: { label: 'Cancelada',  cls: 'badge-danger',  bar: 'bg-red-400',     Icon: AlertCircle },
  late:      { label: 'Retrasada',  cls: 'badge-danger',  bar: 'bg-red-600',     Icon: AlertCircle },
}

export default function BookingsPage() {
  const [bookings, setBookings]   = useState<any[]>([])
  const [clients, setClients]     = useState<any[]>([])
  const [projects, setProjects]   = useState<any[]>([])
  const [equipment, setEquipment] = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId]       = useState<string | null>(null)
  const [saving, setSaving]       = useState(false)
  const [form, setForm]           = useState(defaultForm)
  const [items, setItems]         = useState<any[]>([])
  const [view, setView]           = useState<'list' | 'calendar'>('calendar')
  const [calMonth, setCalMonth]   = useState(() => {
    const n = new Date()
    return new Date(n.getFullYear(), n.getMonth(), 1)
  })
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const supabase = createClient()

  const fetchAll = async () => {
    setLoading(true)
    const [bRes, cRes, pRes, eRes] = await Promise.all([
      supabase.from('bookings').select('*, booking_items(*, equipment(name, daily_rate)), client:clients!bookings_client_id_fkey(name), projects(name)').order('created_at', { ascending: false }),
      supabase.from('clients').select('id, name'),
      supabase.from('projects').select('id, name'),
      supabase.from('equipment').select('id, name, daily_rate, weekly_rate, monthly_rate'),
    ])
    setBookings(bRes.data || [])
    setClients(cRes.data || [])
    setProjects(pRes.data || [])
    setEquipment(eRes.data || [])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  /* ── Items helpers ── */
  const addItem    = () => setItems([...items, { equipment_id: '', quantity: 1, unit_price: 0 }])
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i))
  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    if (field === 'equipment_id') {
      const eq = equipment.find(e => e.id === value)
      if (eq) updated[index].unit_price = eq.daily_rate || 0
    }
    setItems(updated)
  }
  const totalPrice = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)

  /* ── Modal open ── */
  const openNew = (date?: string) => {
    setEditId(null)
    setForm({ ...defaultForm, document_number: generateFolio(), start_date: date || '', end_date: '' })
    setItems([{ equipment_id: '', quantity: 1, unit_price: 0 }])
    setShowModal(true)
  }

  const openEdit = (b: any) => {
    setEditId(b.id)
    setForm({
      client_id:       b.client_id       || '',
      project_id:      b.project_id      || '',
      start_date:      b.start_date?.split('T')[0]  || '',
      end_date:        b.end_date?.split('T')[0]    || '',
      status:          b.status          || 'pending',
      notes:           b.notes           || '',
      deposit_amount:  b.deposit_amount?.toString() || '',
      document_number: b.document_number || '',
    })
    setItems((b.booking_items || []).map((bi: any) => ({
      equipment_id: bi.equipment_id,
      quantity:     bi.quantity,
      unit_price:   bi.unit_price || 0,
    })))
    setShowModal(true)
  }

  /* ── Save ── */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const payload: any = {
      client_id:       form.client_id      || null,
      project_id:      form.project_id     || null,
      start_date:      form.start_date     || null,
      end_date:        form.end_date       || null,
      total_price:     totalPrice,
      deposit_amount:  parseFloat(form.deposit_amount) || 0,
      status:          form.status,
      notes:           form.notes          || null,
      document_number: form.document_number || null,
    }
    let bookingId = editId
    if (editId) {
      const { error } = await supabase.from('bookings').update(payload).eq('id', editId)
      if (error) { alert('Error al actualizar: ' + error.message); setSaving(false); return }
      await supabase.from('booking_items').delete().eq('booking_id', editId)
    } else {
      const { data, error } = await supabase.from('bookings').insert([payload]).select('id').single()
      if (error) { alert('Error al crear: ' + error.message); setSaving(false); return }
      bookingId = data.id
    }
    const validItems = items.filter(i => i.equipment_id)
    if (validItems.length > 0 && bookingId) {
      await supabase.from('booking_items').insert(
        validItems.map(i => ({
          booking_id:   bookingId,
          equipment_id: i.equipment_id,
          quantity:     i.quantity,
          unit_price:   i.unit_price,
          subtotal:     i.quantity * i.unit_price,
        }))
      )
    }
    setShowModal(false)
    fetchAll()
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta renta?')) return
    await supabase.from('booking_items').delete().eq('booking_id', id)
    await supabase.from('bookings').delete().eq('id', id)
    fetchAll()
  }

  /* ── Calendar helpers ── */
  const calDays = useMemo(() => {
    const year  = calMonth.getFullYear()
    const month = calMonth.getMonth()
    const firstDay = new Date(year, month, 1).getDay() // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: (Date | null)[] = Array(firstDay).fill(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [calMonth])

  const bookingsOnDay = (date: Date) => {
    const iso = date.toISOString().split('T')[0]
    return bookings.filter(b => {
      const s = b.start_date?.split('T')[0] || ''
      const e = b.end_date?.split('T')[0] || ''
      return s <= iso && (e >= iso || !e)
    })
  }

  const prevMonth = () => setCalMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  const nextMonth = () => setCalMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  const todayISO  = new Date().toISOString().split('T')[0]

  const DAYS_ES  = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

  /* ── Render ── */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Rentas</h1>
          <p className="text-muted text-sm mt-1">Crea, edita y visualiza en calendario.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center bg-surface-alt border border-border rounded-xl p-1 gap-1">
            <button
              onClick={() => setView('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${view === 'calendar' ? 'bg-white text-brand shadow-sm' : 'text-muted hover:text-foreground'}`}
            >
              <CalendarIcon size={15} /> Calendario
            </button>
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${view === 'list' ? 'bg-white text-brand shadow-sm' : 'text-muted hover:text-foreground'}`}
            >
              <List size={15} /> Lista
            </button>
          </div>
          <button onClick={() => openNew()} className="flex items-center gap-2 bg-brand hover:bg-brand-light text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors">
            <Plus size={18} /> Nueva Renta
          </button>
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white animate-pulse rounded-xl border border-border" />)}
        </div>
      )}

      {/* ══ CALENDAR VIEW ══ */}
      {!loading && view === 'calendar' && (
        <div className="card overflow-hidden">
          {/* Month nav */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-surface-alt transition-colors text-muted hover:text-foreground">
              <ChevronLeft size={18} />
            </button>
            <h2 className="font-bold text-foreground text-lg">
              {MONTHS_ES[calMonth.getMonth()]} {calMonth.getFullYear()}
            </h2>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-surface-alt transition-colors text-muted hover:text-foreground">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-border">
            {DAYS_ES.map(d => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-muted uppercase tracking-wide">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {calDays.map((date, idx) => {
              if (!date) return <div key={idx} className="h-28 bg-surface/30 border-b border-r border-border" />
              const iso = date.toISOString().split('T')[0]
              const dayBookings = bookingsOnDay(date)
              const isToday = iso === todayISO
              const isSelected = iso === selectedDay

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDay(isSelected ? null : iso)}
                  className={`h-28 border-b border-r border-border p-1.5 flex flex-col gap-0.5 cursor-pointer transition-colors relative
                    ${isToday ? 'bg-blue-50/60' : 'hover:bg-surface/80'}
                    ${isSelected ? 'ring-2 ring-inset ring-brand' : ''}
                  `}
                >
                  <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold self-start
                    ${isToday ? 'bg-brand text-white' : 'text-foreground'}`}>
                    {date.getDate()}
                  </div>
                  <div className="flex flex-col gap-0.5 overflow-hidden">
                    {dayBookings.slice(0, 3).map(b => {
                      const st = STATUS_MAP[b.status] || STATUS_MAP.pending
                      const label = b.clients?.name || b.document_number || 'Renta'
                      return (
                        <button
                          key={b.id}
                          onClick={e => { e.stopPropagation(); openEdit(b) }}
                          className={`w-full text-left text-[10px] font-semibold px-1.5 py-0.5 rounded text-white truncate ${st.bar}`}
                          title={label}
                        >
                          {label}
                        </button>
                      )
                    })}
                    {dayBookings.length > 3 && (
                      <span className="text-[9px] text-muted pl-1">+{dayBookings.length - 3} más</span>
                    )}
                  </div>
                  {/* Quick add */}
                  {dayBookings.length === 0 && (
                    <button
                      onClick={e => { e.stopPropagation(); openNew(iso) }}
                      className="absolute bottom-1 right-1 opacity-0 hover:opacity-100 group-hover:opacity-100 w-5 h-5 bg-brand text-white rounded-full flex items-center justify-center text-xs transition-opacity"
                    >
                      +
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 px-6 py-3 border-t border-border flex-wrap">
            {Object.entries(STATUS_MAP).filter(([k]) => k !== 'late').map(([key, st]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-sm ${st.bar}`} />
                <span className="text-xs text-muted">{st.label}</span>
              </div>
            ))}
          </div>

          {/* Selected day panel */}
          {selectedDay && (() => {
            const date = new Date(selectedDay + 'T12:00:00')
            const dayBookings = bookingsOnDay(date)
            return (
              <div className="border-t border-border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">
                    {date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
                    <span className="ml-2 text-sm text-muted font-normal">({dayBookings.length} renta{dayBookings.length !== 1 ? 's' : ''})</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openNew(selectedDay)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-brand border border-brand/30 hover:bg-blue-50 transition-colors">
                      <Plus size={14} /> Nueva renta este día
                    </button>
                    <button onClick={() => setSelectedDay(null)} className="p-1.5 rounded-lg hover:bg-surface-alt text-muted"><X size={16} /></button>
                  </div>
                </div>
                {dayBookings.length === 0 ? (
                  <p className="text-muted text-sm">Sin rentas en este día.</p>
                ) : (
                  <div className="space-y-2">
                    {dayBookings.map(b => <BookingRow key={b.id} b={b} onEdit={openEdit} onDelete={handleDelete} />)}
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      )}

      {/* ══ LIST VIEW ══ */}
      {!loading && view === 'list' && (
        <>
          {bookings.length === 0 && (
            <div className="card p-12 text-center">
              <CalendarIcon size={40} className="mx-auto text-muted/30 mb-3" />
              <p className="text-muted text-sm">Sin rentas registradas.</p>
              <button onClick={() => openNew()} className="text-brand font-semibold text-sm mt-2 hover:underline">Crear primera renta →</button>
            </div>
          )}
          <div className="space-y-3">
            {bookings.map(b => <BookingRow key={b.id} b={b} onEdit={openEdit} onDelete={handleDelete} />)}
          </div>
        </>
      )}

      {/* ══ MODAL ══ */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-overlay">
          <div className="card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-foreground">{editId ? 'Editar Renta' : 'Nueva Renta'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-surface-alt rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              {/* Folio */}
              <div>
                <label className="text-xs text-muted font-semibold uppercase block mb-1">Folio</label>
                <div className="flex gap-2">
                  <input className="flex-1 rounded-xl px-4 py-2.5 text-sm font-mono" value={form.document_number} onChange={e => setForm({ ...form, document_number: e.target.value })} />
                  <button type="button" onClick={() => setForm({ ...form, document_number: generateFolio() })} className="px-3 py-2 text-xs font-semibold border border-border rounded-xl text-muted hover:text-brand hover:border-brand/30 transition-colors">↻ Nuevo</button>
                </div>
              </div>

              {/* Cliente / Proyecto */}
              <div className="grid grid-cols-2 gap-3">
                <select className="w-full rounded-xl px-4 py-2.5 text-sm" value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}>
                  <option value="">Cliente (opcional)</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select className="w-full rounded-xl px-4 py-2.5 text-sm" value={form.project_id} onChange={e => setForm({ ...form, project_id: e.target.value })}>
                  <option value="">Sin proyecto</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted font-medium block mb-1">Inicio *</label>
                  <input type="date" required className="w-full rounded-xl px-4 py-2.5 text-sm" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted font-medium block mb-1">Fin</label>
                  <input type="date" className="w-full rounded-xl px-4 py-2.5 text-sm" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
                </div>
              </div>

              {/* Estado / Depósito */}
              <div className="grid grid-cols-2 gap-3">
                <select className="w-full rounded-xl px-4 py-2.5 text-sm" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="pending">Pendiente</option>
                  <option value="confirmed">Confirmada</option>
                  <option value="active">En Curso</option>
                  <option value="completed">Completada</option>
                  <option value="cancelled">Cancelada</option>
                </select>
                <input type="number" step="0.01" placeholder="Depósito / Garantía $" className="w-full rounded-xl px-4 py-2.5 text-sm" value={form.deposit_amount} onChange={e => setForm({ ...form, deposit_amount: e.target.value })} />
              </div>

              {/* Artículos */}
              <div className="border-t border-border pt-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-muted uppercase flex items-center gap-1"><Package size={12} /> Artículos Rentados</p>
                  <button type="button" onClick={addItem} className="text-xs text-brand font-semibold hover:underline flex items-center gap-1"><Plus size={12} /> Agregar</button>
                </div>
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-surface-alt rounded-xl p-2">
                      <select className="flex-1 rounded-lg px-3 py-1.5 text-sm bg-white" value={item.equipment_id} onChange={e => updateItem(idx, 'equipment_id', e.target.value)}>
                        <option value="">Seleccionar activo</option>
                        {equipment.map(eq => <option key={eq.id} value={eq.id}>{eq.name}{eq.daily_rate > 0 ? ` ($${eq.daily_rate}/día)` : ''}</option>)}
                      </select>
                      <input type="number" min="1" title="Cantidad" className="w-14 rounded-lg px-2 py-1.5 text-sm text-center bg-white" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)} />
                      <input type="number" step="0.01" title="Precio unit." className="w-24 rounded-lg px-2 py-1.5 text-sm bg-white" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)} />
                      <button type="button" onClick={() => removeItem(idx)} className="p-1 text-muted hover:text-danger flex-shrink-0"><X size={14} /></button>
                    </div>
                  ))}
                </div>
                {totalPrice > 0 && (
                  <div className="flex justify-end mt-2 text-sm font-bold text-foreground">
                    Total: <span className="text-brand ml-1">${totalPrice.toLocaleString()}</span>
                  </div>
                )}
              </div>

              <textarea placeholder="Notas adicionales..." rows={2} className="w-full rounded-xl px-4 py-2.5 text-sm resize-none" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />

              <button disabled={saving} className="w-full bg-brand hover:bg-brand-light text-white rounded-xl py-2.5 font-semibold text-sm disabled:opacity-50 transition-colors">
                {saving ? 'Guardando...' : editId ? 'Actualizar Renta' : 'Crear Renta'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function BookingRow({ b, onEdit, onDelete }: { b: any; onEdit: (b: any) => void; onDelete: (id: string) => void }) {
  const st = STATUS_MAP[b.status] || STATUS_MAP.pending
  const itemCount = b.booking_items?.length || 0
  return (
    <div className="card p-5 group">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-blue-50 flex flex-col items-center justify-center text-brand flex-shrink-0">
            <span className="text-lg font-bold leading-none">
              {b.start_date ? new Date(b.start_date + 'T12:00:00').getDate().toString().padStart(2, '0') : '--'}
            </span>
            <span className="text-[9px] uppercase font-bold mt-0.5">
              {b.start_date ? new Date(b.start_date + 'T12:00:00').toLocaleString('es', { month: 'short' }) : ''}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              {b.client?.name || 'Sin cliente'}
              {b.document_number && <span className="text-muted font-normal text-sm"> · {b.document_number}</span>}
            </h3>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${st.cls}`}>
                <st.Icon size={12} /> {st.label}
              </span>
              {itemCount > 0 && <span className="text-xs text-muted flex items-center gap-1"><Package size={12} />{itemCount} ítem{itemCount > 1 ? 's' : ''}</span>}
              {b.projects?.name && <span className="text-xs text-muted">📁 {b.projects.name}</span>}
              {b.total_price > 0 && <span className="text-sm font-bold text-foreground">${Number(b.total_price).toLocaleString()}</span>}
              {b.end_date && (
                <span className="text-xs text-muted">
                  hasta {new Date(b.end_date + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => generateRentalPDF({ ...b, clients: { name: b.client?.name } })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm font-medium text-muted hover:text-brand hover:border-brand/30 transition-colors"
          >
            <FileText size={14} /> PDF
          </button>
          <button onClick={() => onEdit(b)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm font-medium text-muted hover:text-brand hover:border-brand/30 transition-colors">
            <Edit3 size={14} /> Editar
          </button>
          <button onClick={() => onDelete(b.id)} className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-red-50 transition-all">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
