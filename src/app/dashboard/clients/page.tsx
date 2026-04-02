'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Mail, Phone, MapPin, Trash2, X, Edit3, Save } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', tax_id: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const fetchClients = async () => {
    setLoading(true)
    const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false })
    setClients(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchClients() }, [])

  const openNew = () => {
    setEditId(null)
    setForm({ name: '', email: '', phone: '', address: '', tax_id: '', notes: '' })
    setShowModal(true)
  }

  const openEdit = (client: any) => {
    setEditId(client.id)
    setForm({ name: client.name || '', email: client.email || '', phone: client.phone || '', address: client.address || '', tax_id: client.tax_id || '', notes: client.notes || '' })
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    if (editId) {
      const { error } = await supabase.from('clients').update(form).eq('id', editId)
      if (error) alert('Error: ' + error.message)
    } else {
      const { error } = await supabase.from('clients').insert([form])
      if (error) alert('Error: ' + error.message)
    }
    setShowModal(false)
    setEditId(null)
    setForm({ name: '', email: '', phone: '', address: '', tax_id: '', notes: '' })
    fetchClients()
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este cliente? También se eliminarán sus rentas asociadas.')) return
    await supabase.from('clients').delete().eq('id', id)
    fetchClients()
  }

  const filtered = clients.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.tax_id?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-muted text-sm mt-1">Directorio de clientes y empresas.</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-brand hover:bg-brand-light text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors">
          <Plus size={18} /> Nuevo Cliente
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
        <input type="text" placeholder="Buscar por nombre, correo o RFC..." className="w-full sm:max-w-md rounded-xl pl-10 pr-4 py-2.5 text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      {loading && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3].map(i => <div key={i} className="h-40 bg-white animate-pulse rounded-xl border border-border" />)}</div>}

      {!loading && filtered.length === 0 && (
        <div className="card p-12 text-center">
          <p className="text-muted text-sm">No hay clientes{searchTerm ? ' que coincidan.' : '.'}</p>
          {!searchTerm && <button onClick={openNew} className="text-brand font-semibold text-sm mt-2 hover:underline">Agregar primer cliente →</button>}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => (
          <div key={c.id} className="card p-5 group">
            <div className="flex justify-between items-start mb-3">
              <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-brand font-bold text-lg">{c.name?.[0]?.toUpperCase() || '?'}</div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg text-muted hover:text-brand hover:bg-blue-50 transition-colors"><Edit3 size={15} /></button>
                <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-red-50 transition-colors"><Trash2 size={15} /></button>
              </div>
            </div>
            <h3 className="font-semibold text-foreground truncate">{c.name}</h3>
            {c.tax_id && <p className="text-xs text-muted uppercase tracking-wide mt-0.5">{c.tax_id}</p>}
            <div className="mt-3 space-y-1.5 text-sm text-muted">
              {c.email && <div className="flex items-center gap-2 truncate"><Mail size={14} className="text-brand flex-shrink-0" />{c.email}</div>}
              {c.phone && <div className="flex items-center gap-2"><Phone size={14} className="text-brand flex-shrink-0" />{c.phone}</div>}
              {c.address && <div className="flex items-center gap-2 truncate"><MapPin size={14} className="text-brand flex-shrink-0" />{c.address}</div>}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-overlay">
          <div className="card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-foreground">{editId ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-surface-alt rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <input required placeholder="Nombre o Razón Social *" className="w-full rounded-xl px-4 py-2.5 text-sm" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Email" type="email" className="w-full rounded-xl px-4 py-2.5 text-sm" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                <input placeholder="Teléfono" type="tel" className="w-full rounded-xl px-4 py-2.5 text-sm" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
              </div>
              <input placeholder="RFC / ID Fiscal" className="w-full rounded-xl px-4 py-2.5 text-sm" value={form.tax_id} onChange={e => setForm({...form, tax_id: e.target.value})} />
              <input placeholder="Dirección" className="w-full rounded-xl px-4 py-2.5 text-sm" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
              <textarea placeholder="Notas internas..." rows={2} className="w-full rounded-xl px-4 py-2.5 text-sm resize-none" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
              <button disabled={saving} className="w-full bg-brand hover:bg-brand-light text-white rounded-xl py-2.5 font-semibold text-sm disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                {saving ? 'Guardando...' : <><Save size={16} /> {editId ? 'Actualizar Cliente' : 'Guardar Cliente'}</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
