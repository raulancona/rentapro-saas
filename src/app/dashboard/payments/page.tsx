'use client'

import { useState, useEffect } from 'react'
import { CreditCard, Plus, DollarSign, X, Trash2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ booking_id: '', amount: '', payment_method: 'cash' })
  const supabase = createClient()

  const fetchAll = async () => {
    setLoading(true)
    const [p, b] = await Promise.all([
      supabase.from('payments').select('*, bookings(id, clients(name))').order('created_at', { ascending: false }),
      supabase.from('bookings').select('id, total_amount, clients(name)'),
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
      amount: parseFloat(form.amount),
      payment_method: form.payment_method
    }])
    if (error) alert('Error: ' + error.message)
    else { setShowModal(false); setForm({ booking_id: '', amount: '', payment_method: 'cash' }); fetchAll() }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este pago?')) return
    await supabase.from('payments').delete().eq('id', id)
    fetchAll()
  }

  const methodLabels: any = { cash: 'Efectivo', transfer: 'Transferencia', card: 'Tarjeta', other: 'Otro' }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pagos</h1>
          <p className="text-muted text-sm mt-1">Registro de abonos y pagos por renta.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-brand hover:bg-brand-light text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors">
          <Plus size={18} /> Registrar Pago
        </button>
      </div>

      {loading && <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-16 bg-white animate-pulse rounded-xl border border-border" />)}</div>}

      {!loading && payments.length === 0 && (
        <div className="card p-12 text-center">
          <CreditCard size={40} className="mx-auto text-muted/30 mb-3" />
          <p className="text-muted text-sm">Sin pagos registrados.</p>
        </div>
      )}

      <div className="space-y-3">
        {payments.map((p) => (
          <div key={p.id} className="card p-5 flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-green-50 flex items-center justify-center text-accent"><DollarSign size={20} /></div>
              <div>
                <p className="font-semibold text-foreground">${Number(p.amount).toLocaleString()}</p>
                <p className="text-sm text-muted">
                  {p.bookings?.clients?.name || 'Renta'} · <span className="badge-neutral text-xs font-semibold px-1.5 py-0.5 rounded">{methodLabels[p.payment_method] || p.payment_method}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted">{new Date(p.created_at).toLocaleDateString('es')}</span>
              <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-overlay">
          <div className="card w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-foreground">Registrar Pago</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-surface-alt rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <select required className="w-full rounded-xl px-4 py-2.5 text-sm" value={form.booking_id} onChange={e => setForm({...form, booking_id: e.target.value})}>
                <option value="">Selecciona una renta *</option>
                {bookings.map(b => <option key={b.id} value={b.id}>{b.clients?.name || 'Renta'} · ${b.total_amount || 0}</option>)}
              </select>
              <input required type="number" step="0.01" min="0.01" placeholder="Monto del pago ($) *" className="w-full rounded-xl px-4 py-2.5 text-sm" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
              <select className="w-full rounded-xl px-4 py-2.5 text-sm" value={form.payment_method} onChange={e => setForm({...form, payment_method: e.target.value})}>
                <option value="cash">Efectivo</option>
                <option value="transfer">Transferencia</option>
                <option value="card">Tarjeta</option>
                <option value="other">Otro</option>
              </select>
              <button disabled={saving} className="w-full bg-accent hover:bg-accent/90 text-white rounded-xl py-2.5 font-semibold text-sm disabled:opacity-50 transition-colors">
                {saving ? 'Guardando...' : 'Registrar Pago'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
