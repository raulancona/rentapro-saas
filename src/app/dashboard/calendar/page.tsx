'use client'

import { useState, useEffect } from 'react'
import { CalendarIcon, Plus, Edit3, Trash2, CheckCircle2, Clock, X, AlertCircle, FileText, Package } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { generateRentalPDF } from '@/utils/pdf'

const defaultForm = {
  customer_id: '', project_id: '', start_date: '', end_date: '',
  status: 'pending', notes: '', deposit_amount: '', document_number: ''
}

function generateFolio() {
  const now = new Date()
  const y = now.getFullYear().toString().slice(-2)
  const m = (now.getMonth() + 1).toString().padStart(2, '0')
  const rand = Math.floor(Math.random() * 9000 + 1000)
  return `R${y}${m}-${rand}`
}

const statusMap: any = {
  pending:   { label: 'Pendiente',  cls: 'badge-warn',    Icon: Clock },
  confirmed: { label: 'Confirmada', cls: 'badge-info',    Icon: CheckCircle2 },
  active:    { label: 'En Curso',   cls: 'badge-success', Icon: CheckCircle2 },
  completed: { label: 'Completada', cls: 'badge-neutral', Icon: CheckCircle2 },
  cancelled: { label: 'Cancelada',  cls: 'badge-danger',  Icon: AlertCircle },
}

export default function BookingsPage() {
  const [bookings, setBookings]     = useState<any[]>([])
  const [clients, setClients]       = useState<any[]>([])
  const [projects, setProjects]     = useState<any[]>([])
  const [equipment, setEquipment]   = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [showModal, setShowModal]   = useState(false)
  const [editId, setEditId]         = useState<string | null>(null)
  const [saving, setSaving]         = useState(false)
  const [form, setForm]             = useState(defaultForm)
  const [items, setItems]           = useState<any[]>([])

  const supabase = createClient()

  const fetchAll = async () => {
    setLoading(true)
    const [bRes, cRes, pRes, eRes] = await Promise.all([
      supabase.from('bookings').select('*, booking_items(*, equipment(name, daily_rate))').order('created_at', { ascending: false }),
      supabase.from('clients').select('id, name'),
      supabase.from('projects').select('id, name'),
      supabase.from('equipment').select('id, name, daily_rate, weekly_rate, monthly_rate'),
    ])
    const clientMap: any = {}
    const projectMap: any = {}
    ;(cRes.data || []).forEach((c: any) => { clientMap[c.id] = c.name })
    ;(pRes.data || []).forEach((p: any) => { projectMap[p.id] = p.name })

    const enriched = (bRes.data || []).map((b: any) => ({
      ...b,
      client_name:  clientMap[b.customer_id] || null,
      project_name: projectMap[b.project_id] || null,
    }))

    setBookings(enriched)
    setClients(cRes.data || [])
    setProjects(pRes.data || [])
    setEquipment(eRes.data || [])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  /* ---------- Items helpers ---------- */
  const addItem  = () => setItems([...items, { equipment_id: '', quantity: 1, unit_price: 0 }])
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

  /* ---------- Modal open ---------- */
  const openNew = () => {
    setEditId(null)
    setForm({ ...defaultForm, document_number: generateFolio() })
    setItems([{ equipment_id: '', quantity: 1, unit_price: 0 }])
    setShowModal(true)
  }

  const openEdit = (b: any) => {
    setEditId(b.id)
    setForm({
      customer_id:     b.customer_id     || '',
      project_id:      b.project_id      || '',
      start_date:      b.start_date      || '',
      end_date:        b.end_date        || '',
      status:          b.status          || 'pending',
      notes:           b.notes           || '',
      deposit_amount:  b.deposit_amount?.toString() || '',
      document_number: b.document_number || '',
    })
    setItems((b.booking_items || []).map((bi: any) => ({
      equipment_id: bi.equipment_id,
      quantity:     bi.quantity,
      unit_price:   bi.unit_price,
    })))
    setShowModal(true)
  }

  /* ---------- Save ---------- */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const payload: any = {
      customer_id:     form.customer_id     || null,
      project_id:      form.project_id      || null,
      start_date:      form.start_date      || null,
      end_date:        form.end_date        || null,
      total_price:     totalPrice,
      deposit_amount:  parseFloat(form.deposit_amount) || 0,
      status:          form.status,
      notes:           form.notes           || null,
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

  /* ---------- Delete ---------- */
  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta renta?')) return
    await supabase.from('booking_items').delete().eq('booking_id', id)
    await supabase.from('bookings').delete().eq('id', id)
    fetchAll()
  }

  /* ---------- Render ---------- */
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Rentas</h1>
          <p className="text-muted text-sm mt-1">Crea, edita y genera documentos.</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-brand hover:bg-brand-light text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors">
          <Plus size={18} /> Nueva Renta
        </button>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-white animate-pulse rounded-xl border border-border" />)}
        </div>
      )}

      {!loading && bookings.length === 0 && (
        <div className="card p-12 text-center">
          <CalendarIcon size={40} className="mx-auto text-muted/30 mb-3" />
          <p className="text-muted text-sm">Sin rentas registradas.</p>
          <button onClick={openNew} className="text-brand font-semibold text-sm mt-2 hover:underline">Crear primera renta →</button>
        </div>
      )}

      <div className="space-y-3">
        {bookings.map((b) => {
          const st = statusMap[b.status] || statusMap.pending
          const itemCount = b.booking_items?.length || 0
          return (
            <div key={b.id} className="card p-5 group">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-blue-50 flex flex-col items-center justify-center text-brand flex-shrink-0">
                    <span className="text-lg font-bold leading-none">
                      {b.start_date ? new Date(b.start_date + 'T12:00:00').getDate().toString().padStart(2,'0') : '--'}
                    </span>
                    <span className="text-[9px] uppercase font-bold mt-0.5">
                      {b.start_date ? new Date(b.start_date + 'T12:00:00').toLocaleString('es',{month:'short'}) : ''}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {b.client_name || 'Sin cliente'}
                      {b.document_number && <span className="text-muted font-normal text-sm"> · {b.document_number}</span>}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${st.cls}`}>
                        <st.Icon size={12} /> {st.label}
                      </span>
                      {itemCount > 0 && <span className="text-xs text-muted flex items-center gap-1"><Package size={12} />{itemCount} ítem{itemCount>1?'s':''}</span>}
                      {b.project_name && <span className="text-xs text-muted">📁 {b.project_name}</span>}
                      {b.total_price > 0 && <span className="text-sm font-bold text-foreground">${Number(b.total_price).toLocaleString()}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => generateRentalPDF({ ...b, clients: { name: b.client_name } })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm font-medium text-muted hover:text-brand hover:border-brand/30 transition-colors"
                  >
                    <FileText size={14} /> PDF
                  </button>
                  <button onClick={() => openEdit(b)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm font-medium text-muted hover:text-brand hover:border-brand/30 transition-colors">
                    <Edit3 size={14} /> Editar
                  </button>
                  <button onClick={() => handleDelete(b.id)} className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-red-50 transition-all">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ===== MODAL ===== */}
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
                  <input className="flex-1 rounded-xl px-4 py-2.5 text-sm font-mono" value={form.document_number} onChange={e => setForm({...form, document_number: e.target.value})} />
                  <button type="button" onClick={() => setForm({...form, document_number: generateFolio()})} className="px-3 py-2 text-xs font-semibold border border-border rounded-xl text-muted hover:text-brand hover:border-brand/30 transition-colors">↻ Nuevo</button>
                </div>
              </div>

              {/* Cliente / Proyecto */}
              <div className="grid grid-cols-2 gap-3">
                <select className="w-full rounded-xl px-4 py-2.5 text-sm" value={form.customer_id} onChange={e => setForm({...form, customer_id: e.target.value})}>
                  <option value="">Cliente (opcional)</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select className="w-full rounded-xl px-4 py-2.5 text-sm" value={form.project_id} onChange={e => setForm({...form, project_id: e.target.value})}>
                  <option value="">Sin proyecto</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted font-medium block mb-1">Inicio *</label>
                  <input type="date" required className="w-full rounded-xl px-4 py-2.5 text-sm" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs text-muted font-medium block mb-1">Fin</label>
                  <input type="date" className="w-full rounded-xl px-4 py-2.5 text-sm" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} />
                </div>
              </div>

              {/* Estado / Depósito */}
              <div className="grid grid-cols-2 gap-3">
                <select className="w-full rounded-xl px-4 py-2.5 text-sm" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                  <option value="pending">Pendiente</option>
                  <option value="confirmed">Confirmada</option>
                  <option value="active">En Curso</option>
                  <option value="completed">Completada</option>
                  <option value="cancelled">Cancelada</option>
                </select>
                <input type="number" step="0.01" placeholder="Depósito / Garantía $" className="w-full rounded-xl px-4 py-2.5 text-sm" value={form.deposit_amount} onChange={e => setForm({...form, deposit_amount: e.target.value})} />
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
                      <input type="number" min="1" title="Cantidad" className="w-14 rounded-lg px-2 py-1.5 text-sm text-center bg-white" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value)||1)} />
                      <input type="number" step="0.01" title="Precio unit." className="w-24 rounded-lg px-2 py-1.5 text-sm bg-white" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value)||0)} />
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

              <textarea placeholder="Notas adicionales..." rows={2} className="w-full rounded-xl px-4 py-2.5 text-sm resize-none" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />

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
