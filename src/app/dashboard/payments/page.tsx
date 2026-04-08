'use client'

import { useState, useEffect } from 'react'
import { CreditCard, Plus, DollarSign, X, Trash2, TrendingUp } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

export default function PaymentsPage() {
  const [payments, setPayments]   = useState<any[]>([])
  const [bookings, setBookings]   = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [form, setForm]           = useState({ booking_id: '', amount: '', method: 'cash', notes: '' })
  const supabase = createClient()

  const fetchAll = async () => {
    setLoading(true)
    const [p, b] = await Promise.all([
      supabase
        .from('payments')
        .select('*, bookings(id, total_price, document_number, clients(name))')
        .order('payment_date', { ascending: false }),
      supabase
        .from('bookings')
        .select('id, total_price, document_number, clients(name)')
        .neq('status', 'cancelled'),
    ])
    setPayments(p.data || [])
    setBookings(b.data || [])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('payments').insert([{
      booking_id: form.booking_id,
      amount:     parseFloat(form.amount),
      method:     form.method,
      notes:      form.notes || null,
    }])
    if (error) alert('Error: ' + error.message)
    else {
      setShowModal(false)
      setForm({ booking_id: '', amount: '', method: 'cash', notes: '' })
      fetchAll()
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este pago?')) return
    await supabase.from('payments').delete().eq('id', id)
    fetchAll()
  }

  const methodLabels: Record<string, string> = {
    cash: 'Efectivo', transfer: 'Transferencia', card: 'Tarjeta', deposit: 'Depósito', other: 'Otro'
  }
  const methodColors: Record<string, string> = {
    cash: 'badge-success', transfer: 'badge-info', card: 'badge-warn', deposit: 'badge-neutral', other: 'badge-neutral'
  }

  const totalMonth = payments
    .filter(p => {
      const d = new Date(p.payment_date)
      const n = new Date()
      return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()
    })
    .reduce((s, p) => s + Number(p.amount), 0)

  const totalAll = payments.reduce((s, p) => s + Number(p.amount), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pagos</h1>
          <p className="text-muted text-sm mt-1">Registro de abonos y pagos por renta.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-brand hover:bg-brand-light text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors"
        >
          <Plus size={18} /> Registrar Pago
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-5 flex items-center gap-4">
          <div className="h-11 w-11 rounded-xl bg-emerald-50 flex items-center justify-center text-accent flex-shrink-0">
            <TrendingUp size={22} />
          </div>
          <div>
            <p className="text-xs text-muted font-medium">Ingresos del mes</p>
            <p className="text-2xl font-bold text-foreground">${totalMonth.toLocaleString()}</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="h-11 w-11 rounded-xl bg-blue-50 flex items-center justify-center text-brand flex-shrink-0">
            <DollarSign size={22} />
          </div>
          <div>
            <p className="text-xs text-muted font-medium">Total acumulado</p>
            <p className="text-2xl font-bold text-foreground">${totalAll.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-white animate-pulse rounded-xl border border-border" />)}
        </div>
      )}

      {!loading && payments.length === 0 && (
        <div className="card p-12 text-center">
          <CreditCard size={40} className="mx-auto text-muted/30 mb-3" />
          <p className="text-muted text-sm">Sin pagos registrados.</p>
        </div>
      )}

      <div className="space-y-2">
        {payments.map(p => {
          const mLabel = methodLabels[p.method] || p.method
          const mColor = methodColors[p.method] || 'badge-neutral'
          const client = p.bookings?.clients?.name
          const doc    = p.bookings?.document_number
          return (
            <div key={p.id} className="card p-4 flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-accent flex-shrink-0">
                  <DollarSign size={18} />
                </div>
                <div>
                  <p className="font-semibold text-foreground">${Number(p.amount).toLocaleString()}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {client && <span className="text-xs text-muted">{client}</span>}
                    {doc    && <span className="text-xs text-muted">· {doc}</span>}
                    <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${mColor}`}>{mLabel}</span>
                  </div>
                  {p.notes && <p className="text-xs text-muted mt-0.5 italic">{p.notes}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted">
                  {new Date(p.payment_date).toLocaleDateString('es-MX', { day:'numeric', month:'short', year:'numeric' })}
                </span>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-overlay">
          <div className="card w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-foreground">Registrar Pago</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-surface-alt rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <select
                required
                className="w-full rounded-xl px-4 py-2.5 text-sm"
                value={form.booking_id}
                onChange={e => setForm({ ...form, booking_id: e.target.value })}
              >
                <option value="">Selecciona una renta *</option>
                {bookings.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.clients?.name || 'Sin cliente'}{b.document_number ? ` · ${b.document_number}` : ''} — ${b.total_price || 0}
                  </option>
                ))}
              </select>
              <input
                required type="number" step="0.01" min="0.01"
                placeholder="Monto del pago ($) *"
                className="w-full rounded-xl px-4 py-2.5 text-sm"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
              />
              <select
                className="w-full rounded-xl px-4 py-2.5 text-sm"
                value={form.method}
                onChange={e => setForm({ ...form, method: e.target.value })}
              >
                <option value="cash">Efectivo</option>
                <option value="transfer">Transferencia</option>
                <option value="card">Tarjeta</option>
                <option value="deposit">Depósito</option>
              </select>
              <textarea
                placeholder="Notas (opcional)"
                rows={2}
                className="w-full rounded-xl px-4 py-2.5 text-sm resize-none"
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
              />
              <button
                disabled={saving}
                className="w-full bg-accent hover:bg-accent/90 text-white rounded-xl py-2.5 font-semibold text-sm disabled:opacity-50 transition-colors"
              >
                {saving ? 'Guardando...' : 'Registrar Pago'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
