'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  CalendarIcon, Plus, Edit3, Trash2, CheckCircle2, Clock, X,
  AlertCircle, FileText, Package, ChevronLeft, ChevronRight, List,
  Paperclip, Upload, ImageIcon, File as FileIcon, Loader2,
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { generateRentalPDF } from '@/utils/pdf'
import { compressImage } from '@/utils/imageCompressor'

// ─── Types ──────────────────────────────────────────────────────────────────
type RateType = 'daily' | 'weekly' | 'monthly'

interface ItemRow {
  equipment_id: string
  quantity: number
  unit_price: number
  rate_type: RateType
}

interface Attachment {
  id: string
  file_name: string
  file_url: string
  file_size: number | null
  file_type: string | null
  created_at: string
}

// ─── Constants ───────────────────────────────────────────────────────────────
const defaultForm = {
  client_id: '', project_id: '', start_date: '', end_date: '',
  status: 'pending', notes: '', deposit_amount: '', document_number: ''
}

const RATE_LABELS: Record<RateType, string> = {
  daily: '/día',
  weekly: '/sem',
  monthly: '/mes',
}

function generateFolio() {
  const now = new Date()
  const y  = now.getFullYear().toString().slice(-2)
  const m  = (now.getMonth() + 1).toString().padStart(2, '0')
  const rnd = Math.floor(Math.random() * 9000 + 1000)
  return `R${y}${m}-${rnd}`
}

/** Days between two ISO date strings, minimum 1 */
function daysBetween(start: string, end: string): number {
  if (!start || !end) return 1
  const ms = new Date(end + 'T12:00:00').getTime() - new Date(start + 'T12:00:00').getTime()
  return Math.max(1, Math.round(ms / 86_400_000) + 1)
}

/** Convert a unit_price (per day/week/month) × quantity × period to total */
function calcSubtotal(item: ItemRow, days: number): number {
  let units = days
  if (item.rate_type === 'weekly')  units = Math.ceil(days / 7)
  if (item.rate_type === 'monthly') units = Math.ceil(days / 30)
  return item.quantity * item.unit_price * units
}

const STATUS_MAP: Record<string, { label: string; cls: string; bar: string; Icon: any }> = {
  pending:   { label: 'Pendiente',  cls: 'badge-warn',    bar: 'bg-amber-400',   Icon: Clock },
  confirmed: { label: 'Confirmada', cls: 'badge-info',    bar: 'bg-blue-500',    Icon: CheckCircle2 },
  active:    { label: 'En Curso',   cls: 'badge-success', bar: 'bg-emerald-500', Icon: CheckCircle2 },
  completed: { label: 'Completada', cls: 'badge-neutral', bar: 'bg-slate-400',   Icon: CheckCircle2 },
  cancelled: { label: 'Cancelada',  cls: 'badge-danger',  bar: 'bg-red-400',     Icon: AlertCircle },
  late:      { label: 'Retrasada',  cls: 'badge-danger',  bar: 'bg-red-600',     Icon: AlertCircle },
}

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

// ─── Page ────────────────────────────────────────────────────────────────────
export default function BookingsPage() {
  const [bookings, setBookings]       = useState<any[]>([])
  const [clients, setClients]         = useState<any[]>([])
  const [projects, setProjects]       = useState<any[]>([])
  const [equipment, setEquipment]     = useState<any[]>([])
  const [loading, setLoading]         = useState(true)
  const [showModal, setShowModal]     = useState(false)
  const [editId, setEditId]           = useState<string | null>(null)
  const [saving, setSaving]           = useState(false)
  const [form, setForm]               = useState(defaultForm)
  const [items, setItems]             = useState<ItemRow[]>([])
  const [view, setView]               = useState<'list' | 'calendar'>('calendar')
  const [calMonth, setCalMonth]       = useState(() => {
    const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1)
  })
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  // Attachment state
  const [pendingFiles, setPendingFiles]   = useState<File[]>([])
  const [uploading, setUploading]         = useState(false)
  const [attachments, setAttachments]     = useState<Attachment[]>([])
  const [loadingAttachments, setLoadingAttachments] = useState(false)

  const supabase = createClient()

  // ── Fetch all bookings, clients, projects, equipment ──
  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [bRes, cRes, pRes, eRes] = await Promise.all([
      supabase.from('bookings')
        .select('*, booking_items(*, equipment(name, daily_rate, weekly_rate, monthly_rate)), client:clients!bookings_client_id_fkey(name), projects(name)')
        .order('created_at', { ascending: false }),
      supabase.from('clients').select('id, name'),
      supabase.from('projects').select('id, name'),
      supabase.from('equipment').select('id, name, daily_rate, weekly_rate, monthly_rate, current_status, quantity_total'),
    ])
    setBookings(bRes.data || [])
    setClients(cRes.data || [])
    setProjects(pRes.data || [])
    setEquipment(eRes.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Load attachments for the booking being edited ──
  const loadAttachments = useCallback(async (bookingId: string) => {
    setLoadingAttachments(true)
    const { data } = await supabase
      .from('booking_attachments')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false })
    setAttachments(data || [])
    setLoadingAttachments(false)
  }, [])

  // ── Days in rental period ──
  const rentalDays = useMemo(() =>
    daysBetween(form.start_date, form.end_date), [form.start_date, form.end_date])

  // ── Item helpers ──
  const addItem = () =>
    setItems(prev => [...prev, { equipment_id: '', quantity: 1, unit_price: 0, rate_type: 'daily' }])

  const removeItem = (i: number) =>
    setItems(prev => prev.filter((_, idx) => idx !== i))

  const updateItem = (index: number, field: string, value: any) => {
    setItems(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      // Auto-fill price when selecting equipment or changing rate type
      if (field === 'equipment_id' || field === 'rate_type') {
        const eqId = field === 'equipment_id' ? value : updated[index].equipment_id
        const rt   = field === 'rate_type'    ? value : updated[index].rate_type
        const eq   = equipment.find(e => e.id === eqId)
        if (eq) {
          const price =
            rt === 'weekly'  ? (eq.weekly_rate  || eq.daily_rate * 7 || 0) :
            rt === 'monthly' ? (eq.monthly_rate || eq.daily_rate * 28 || 0) :
            (eq.daily_rate || 0)
          updated[index].unit_price = price
        }
      }
      return updated
    })
  }

  // Auto-calculated total based on rates and rental period
  const totalPrice = useMemo(() =>
    items.reduce((sum, item) => sum + calcSubtotal(item, rentalDays), 0),
    [items, rentalDays])

  // ── Modal open ──
  const openNew = (date?: string) => {
    setEditId(null)
    setForm({ ...defaultForm, document_number: generateFolio(), start_date: date || '', end_date: '' })
    setItems([{ equipment_id: '', quantity: 1, unit_price: 0, rate_type: 'daily' }])
    setPendingFiles([])
    setAttachments([])
    setShowModal(true)
  }

  const openEdit = (b: any) => {
    setEditId(b.id)
    setForm({
      client_id:       b.client_id             || '',
      project_id:      b.project_id            || '',
      start_date:      b.start_date?.split('T')[0] || '',
      end_date:        b.end_date?.split('T')[0]   || '',
      status:          b.status                || 'pending',
      notes:           b.notes                 || '',
      deposit_amount:  b.deposit_amount?.toString() || '',
      document_number: b.document_number       || '',
    })
    setItems((b.booking_items || []).map((bi: any) => ({
      equipment_id: bi.equipment_id,
      quantity:     bi.quantity,
      unit_price:   bi.unit_price || 0,
      rate_type:    (bi.rate_type as RateType) || 'daily',
    })))
    setPendingFiles([])
    setAttachments([])
    loadAttachments(b.id)
    setShowModal(true)
  }

  // ── File handling ──
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setPendingFiles(prev => [...prev, ...files])
    e.target.value = ''
  }

  const removePendingFile = (idx: number) =>
    setPendingFiles(prev => prev.filter((_, i) => i !== idx))

  const uploadFiles = async (bookingId: string, tenantId: string): Promise<void> => {
    if (pendingFiles.length === 0) return
    setUploading(true)
    const insertRows: any[] = []

    for (const file of pendingFiles) {
      let uploadFile: Blob = file
      let finalName = file.name
      let finalType = file.type

      // Compress images automatically
      if (IMAGE_TYPES.includes(file.type)) {
        try {
          uploadFile = await compressImage(file, 1200, 0.78)
          finalName  = file.name.replace(/\.[^.]+$/, '.webp')
          finalType  = 'image/webp'
        } catch {
          // fallback: upload original
        }
      }

      const path = `${tenantId}/${bookingId}/${Date.now()}_${finalName}`
      const { error: upErr } = await supabase.storage
        .from('booking-attachments')
        .upload(path, uploadFile, { contentType: finalType, upsert: false })

      if (!upErr) {
        const { data: urlData } = supabase.storage.from('booking-attachments').getPublicUrl(path)
        insertRows.push({
          tenant_id:  tenantId,
          booking_id: bookingId,
          file_name:  finalName,
          file_url:   urlData.publicUrl,
          file_size:  uploadFile.size,
          file_type:  finalType,
        })
      }
    }

    if (insertRows.length > 0) {
      await supabase.from('booking_attachments').insert(insertRows)
    }
    setUploading(false)
  }

  const deleteAttachment = async (att: Attachment) => {
    if (!confirm(`¿Eliminar "${att.file_name}"?`)) return
    await supabase.from('booking_attachments').delete().eq('id', att.id)
    setAttachments(prev => prev.filter(a => a.id !== att.id))
  }

  // ── Availability check ──
  const checkAvailability = (): string[] => {
    if (!form.start_date || !form.end_date) return []
    const warnings: string[] = []
    const selectedEquipmentIds = items.map(i => i.equipment_id).filter(Boolean)

    for (const eqId of selectedEquipmentIds) {
      const eq = equipment.find(e => e.id === eqId)
      if (!eq) continue

      // Count how many of this equipment are booked in the date range
      const conflicting = bookings.filter(b => {
        if (b.id === editId) return false // skip self when editing
        if (['cancelled', 'completed'].includes(b.status)) return false
        const bStart = b.start_date?.split('T')[0] || ''
        const bEnd   = b.end_date?.split('T')[0]   || ''
        return bStart <= form.end_date && (bEnd >= form.start_date || !bEnd)
      })

      const bookedQty = conflicting.reduce((sum: number, b: any) => {
        const bi = (b.booking_items || []).find((i: any) => i.equipment_id === eqId)
        return sum + (bi?.quantity || 0)
      }, 0)

      const totalQty   = eq.quantity_total || 1
      const requesting = items.find(i => i.equipment_id === eqId)?.quantity || 1
      const available  = totalQty - bookedQty

      if (requesting > available) {
        warnings.push(`⚠️ ${eq.name}: solo ${available} disponible(s) en ese período (tienes ${totalQty} en total)`)
      }
    }
    return warnings
  }

  // ── Save ──
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

    // Insert booking items with rate_type
    const validItems = items.filter(i => i.equipment_id)
    if (validItems.length > 0 && bookingId) {
      await supabase.from('booking_items').insert(
        validItems.map(i => ({
          booking_id:   bookingId,
          equipment_id: i.equipment_id,
          quantity:     i.quantity,
          unit_price:   i.unit_price,
          subtotal:     calcSubtotal(i, rentalDays),
        }))
      )
    }

    // Upload pending files
    if (bookingId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await uploadFiles(bookingId, user.id)
    }

    setShowModal(false)
    setPendingFiles([])
    fetchAll()
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta renta?')) return
    await supabase.from('booking_attachments').delete().eq('booking_id', id)
    await supabase.from('booking_items').delete().eq('booking_id', id)
    await supabase.from('bookings').delete().eq('id', id)
    fetchAll()
  }

  // ── Calendar helpers ──
  const calDays = useMemo(() => {
    const year  = calMonth.getFullYear()
    const month = calMonth.getMonth()
    const firstDay   = new Date(year, month, 1).getDay()
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
      const e = b.end_date?.split('T')[0]   || ''
      return s <= iso && (e >= iso || !e)
    })
  }

  const prevMonth  = () => setCalMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  const nextMonth  = () => setCalMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  const todayISO   = new Date().toISOString().split('T')[0]
  const DAYS_ES    = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
  const MONTHS_ES  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

  const availabilityWarnings = useMemo(() => checkAvailability(), [items, form.start_date, form.end_date, bookings, editId])

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Rentas</h1>
          <p className="text-muted text-sm mt-1">Crea, edita y visualiza en calendario.</p>
        </div>
        <div className="flex items-center gap-2">
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

          <div className="grid grid-cols-7 border-b border-border">
            {DAYS_ES.map(d => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-muted uppercase tracking-wide">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {calDays.map((date, idx) => {
              if (!date) return <div key={idx} className="h-28 bg-surface/30 border-b border-r border-border" />
              const iso        = date.toISOString().split('T')[0]
              const dayBookings = bookingsOnDay(date)
              const isToday    = iso === todayISO
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
                      const st    = STATUS_MAP[b.status] || STATUS_MAP.pending
                      const label = b.client?.name || b.document_number || 'Renta'
                      return (
                        <button
                          key={b.id}
                          onClick={ev => { ev.stopPropagation(); openEdit(b) }}
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
                  {dayBookings.length === 0 && (
                    <button
                      onClick={ev => { ev.stopPropagation(); openNew(iso) }}
                      className="absolute bottom-1 right-1 opacity-0 hover:opacity-100 w-5 h-5 bg-brand text-white rounded-full flex items-center justify-center text-xs transition-opacity"
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
            const date        = new Date(selectedDay + 'T12:00:00')
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
                {dayBookings.length === 0
                  ? <p className="text-muted text-sm">Sin rentas en este día.</p>
                  : <div className="space-y-2">{dayBookings.map(b => <BookingRow key={b.id} b={b} onEdit={openEdit} onDelete={handleDelete} />)}</div>
                }
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
          <div className="card w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-foreground">{editId ? 'Editar Renta' : 'Nueva Renta'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-surface-alt rounded-lg"><X size={18} /></button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">

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

              {/* Rental duration badge */}
              {form.start_date && form.end_date && (
                <div className="flex items-center gap-2 text-xs text-muted bg-surface-alt rounded-xl px-4 py-2">
                  <Clock size={13} className="text-brand" />
                  <span>Duración: <strong className="text-foreground">{rentalDays} día{rentalDays !== 1 ? 's' : ''}</strong></span>
                  <span className="ml-auto text-foreground font-semibold">Total calculado: <span className="text-brand">${totalPrice.toLocaleString()}</span></span>
                </div>
              )}

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
                  {items.map((item, idx) => {
                    const eq = equipment.find(e => e.id === item.equipment_id)
                    const sub = calcSubtotal(item, rentalDays)
                    return (
                      <div key={idx} className="bg-surface-alt rounded-xl p-2 space-y-2">
                        <div className="flex items-center gap-2">
                          {/* Equipment selector */}
                          <select
                            className="flex-1 rounded-lg px-3 py-1.5 text-sm bg-white"
                            value={item.equipment_id}
                            onChange={e => updateItem(idx, 'equipment_id', e.target.value)}
                          >
                            <option value="">Seleccionar activo</option>
                            {equipment.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                          </select>
                          {/* Quantity */}
                          <input
                            type="number" min="1" title="Cantidad"
                            className="w-14 rounded-lg px-2 py-1.5 text-sm text-center bg-white"
                            value={item.quantity}
                            onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                          />
                          <button type="button" onClick={() => removeItem(idx)} className="p-1 text-muted hover:text-danger flex-shrink-0"><X size={14} /></button>
                        </div>
                        {/* Rate type + unit price + subtotal */}
                        {item.equipment_id && (
                          <div className="flex items-center gap-2 pl-1">
                            <select
                              className="rounded-lg px-2 py-1 text-xs bg-white border border-border"
                              value={item.rate_type}
                              onChange={e => updateItem(idx, 'rate_type', e.target.value as RateType)}
                            >
                              <option value="daily">Por día</option>
                              <option value="weekly">Por semana</option>
                              <option value="monthly">Por mes</option>
                            </select>
                            <div className="flex items-center gap-1 text-xs text-muted">
                              <span>$</span>
                              <input
                                type="number" step="0.01" min="0" title={`Precio${RATE_LABELS[item.rate_type]}`}
                                className="w-24 rounded-lg px-2 py-1 text-sm bg-white border border-border"
                                value={item.unit_price}
                                onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                              />
                              <span className="text-muted">{RATE_LABELS[item.rate_type]}</span>
                            </div>
                            {rentalDays > 0 && (
                              <span className="ml-auto text-xs font-semibold text-foreground">= ${sub.toLocaleString()}</span>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Availability warnings */}
                {availabilityWarnings.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {availabilityWarnings.map((w, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                        {w}
                      </div>
                    ))}
                  </div>
                )}

                {totalPrice > 0 && (
                  <div className="flex justify-end mt-2 text-sm font-bold text-foreground">
                    Total: <span className="text-brand ml-1">${totalPrice.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Notes */}
              <textarea
                placeholder="Notas adicionales..."
                rows={2}
                className="w-full rounded-xl px-4 py-2.5 text-sm resize-none"
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
              />

              {/* ── Attachments ── */}
              <div className="border-t border-border pt-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-muted uppercase flex items-center gap-1">
                    <Paperclip size={12} /> Archivos adjuntos
                    <span className="ml-1 font-normal normal-case">(imágenes comprimidas automáticamente)</span>
                  </p>
                  <label className="cursor-pointer text-xs text-brand font-semibold hover:underline flex items-center gap-1">
                    <Upload size={12} /> Subir
                    <input type="file" multiple className="hidden" onChange={handleFileChange}
                      accept="image/*,application/pdf,.doc,.docx" />
                  </label>
                </div>

                {/* Existing attachments (edit mode) */}
                {loadingAttachments
                  ? <div className="flex items-center gap-2 text-xs text-muted py-2"><Loader2 size={12} className="animate-spin" /> Cargando archivos...</div>
                  : attachments.length > 0 && (
                    <div className="space-y-1 mb-2">
                      {attachments.map(att => (
                        <AttachmentRow key={att.id} att={att} onDelete={() => deleteAttachment(att)} />
                      ))}
                    </div>
                  )
                }

                {/* Pending files preview */}
                {pendingFiles.length > 0 && (
                  <div className="space-y-1">
                    {pendingFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5">
                        {IMAGE_TYPES.includes(f.type)
                          ? <ImageIcon size={13} className="text-brand flex-shrink-0" />
                          : <FileIcon size={13} className="text-muted flex-shrink-0" />
                        }
                        <span className="text-xs text-foreground flex-1 truncate">{f.name}</span>
                        <span className="text-[10px] text-muted">{(f.size / 1024).toFixed(0)} KB</span>
                        {IMAGE_TYPES.includes(f.type) && (
                          <span className="text-[10px] text-accent font-semibold">→ WebP</span>
                        )}
                        <button type="button" onClick={() => removePendingFile(i)} className="text-muted hover:text-danger"><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                )}

                {attachments.length === 0 && pendingFiles.length === 0 && !loadingAttachments && (
                  <p className="text-xs text-muted/60">Sin archivos adjuntos.</p>
                )}
              </div>

              <button
                disabled={saving || uploading}
                className="w-full bg-brand hover:bg-brand-light text-white rounded-xl py-2.5 font-semibold text-sm disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {(saving || uploading)
                  ? <><Loader2 size={15} className="animate-spin" /> {uploading ? 'Subiendo archivos...' : 'Guardando...'}</>
                  : editId ? 'Actualizar Renta' : 'Crear Renta'
                }
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── AttachmentRow ────────────────────────────────────────────────────────────
function AttachmentRow({ att, onDelete }: { att: Attachment; onDelete: () => void }) {
  const isImage = att.file_type?.startsWith('image/')
  return (
    <div className="flex items-center gap-2 bg-surface-alt rounded-lg px-3 py-1.5">
      {isImage
        ? <ImageIcon size={13} className="text-brand flex-shrink-0" />
        : <FileIcon  size={13} className="text-muted flex-shrink-0" />
      }
      <a href={att.file_url} target="_blank" rel="noopener noreferrer"
        className="text-xs text-brand hover:underline flex-1 truncate"
      >
        {att.file_name}
      </a>
      {att.file_size && (
        <span className="text-[10px] text-muted">{(att.file_size / 1024).toFixed(0)} KB</span>
      )}
      <button onClick={onDelete} className="p-0.5 text-muted hover:text-danger"><X size={12} /></button>
    </div>
  )
}

// ─── BookingRow ───────────────────────────────────────────────────────────────
function BookingRow({ b, onEdit, onDelete }: { b: any; onEdit: (b: any) => void; onDelete: (id: string) => void }) {
  const st        = STATUS_MAP[b.status] || STATUS_MAP.pending
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
