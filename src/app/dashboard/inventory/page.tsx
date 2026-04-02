'use client'

import { useState, useEffect } from 'react'
import { Package, Plus, RefreshCcw, Trash2, X, Save, Box, Layers, DollarSign, Tag, Edit3 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

const defaultForm = { name: '', brand: '', model: '', is_serialized: true, quantity_total: 1, daily_rate: '', weekly_rate: '', monthly_rate: '', category_id: '' }

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showCatModal, setShowCatModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('all')
  const [form, setForm] = useState(defaultForm)
  const [catName, setCatName] = useState('')
  const supabase = createClient()

  const fetchAll = async () => {
    setLoading(true)
    const [eq, cat] = await Promise.all([
      supabase.from('equipment').select('*, categories(name)').order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('name'),
    ])
    setItems(eq.data || [])
    setCategories(cat.data || [])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  const openNew = () => {
    setEditId(null)
    setForm(defaultForm)
    setShowModal(true)
  }

  const openEdit = (item: any) => {
    setEditId(item.id)
    setForm({
      name: item.name || '',
      brand: item.brand || '',
      model: item.model || '',
      is_serialized: item.is_serialized ?? true,
      quantity_total: item.quantity_total || 1,
      daily_rate: item.daily_rate?.toString() || '',
      weekly_rate: item.weekly_rate?.toString() || '',
      monthly_rate: item.monthly_rate?.toString() || '',
      category_id: item.category_id || '',
    })
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const payload = {
      name: form.name,
      brand: form.brand || null,
      model: form.model || null,
      is_serialized: form.is_serialized,
      quantity_total: form.is_serialized ? 1 : form.quantity_total,
      daily_rate: parseFloat(form.daily_rate) || 0,
      weekly_rate: parseFloat(form.weekly_rate) || 0,
      monthly_rate: parseFloat(form.monthly_rate) || 0,
      category_id: form.category_id || null,
    }
    if (editId) {
      const { error } = await supabase.from('equipment').update(payload).eq('id', editId)
      if (error) alert('Error: ' + error.message)
    } else {
      const { error } = await supabase.from('equipment').insert([{ ...payload, current_status: 'available' }])
      if (error) alert('Error: ' + error.message)
    }
    setShowModal(false)
    setEditId(null)
    setForm(defaultForm)
    fetchAll()
    setSaving(false)
  }

  const handleSaveCat = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.from('categories').insert([{ name: catName }])
    if (error) alert('Error: ' + error.message)
    else { setShowCatModal(false); setCatName(''); fetchAll() }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este activo?')) return
    await supabase.from('equipment').delete().eq('id', id)
    fetchAll()
  }

  const filtered = filter === 'all' ? items : items.filter(i => i.category_id === filter)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventario</h1>
          <p className="text-muted text-sm mt-1">Activos disponibles para renta con tarifas.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchAll} className="p-2.5 rounded-xl border border-border text-muted hover:text-foreground transition-colors"><RefreshCcw size={18} /></button>
          <button onClick={() => setShowCatModal(true)} className="flex items-center gap-2 border border-border text-foreground px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-surface-alt transition-colors">
            <Tag size={16} /> Categoría
          </button>
          <button onClick={openNew} className="flex items-center gap-2 bg-brand hover:bg-brand-light text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors">
            <Plus size={18} /> Nuevo Activo
          </button>
        </div>
      </div>

      {categories.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filter === 'all' ? 'bg-brand text-white' : 'bg-surface-alt text-muted hover:text-foreground'}`}>Todos ({items.length})</button>
          {categories.map(c => (
            <button key={c.id} onClick={() => setFilter(c.id)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filter === c.id ? 'bg-brand text-white' : 'bg-surface-alt text-muted hover:text-foreground'}`}>
              {c.name} ({items.filter(i => i.category_id === c.id).length})
            </button>
          ))}
        </div>
      )}

      {loading && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3].map(i => <div key={i} className="h-36 bg-white animate-pulse rounded-xl border border-border" />)}</div>}

      {!loading && filtered.length === 0 && (
        <div className="card p-12 text-center">
          <Package size={40} className="mx-auto text-muted/30 mb-3" />
          <p className="text-muted text-sm">Sin activos{filter !== 'all' ? ' en esta categoría' : ''}.</p>
          <button onClick={openNew} className="text-brand font-semibold text-sm mt-2 hover:underline">Agregar activo →</button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((item) => {
          const isAvailable = item.current_status === 'available'
          return (
            <div key={item.id} className="card p-5 group">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-brand">
                    {item.is_serialized ? <Box size={20} /> : <Layers size={20} />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm truncate max-w-[160px]">{item.name}</h3>
                    <p className="text-xs text-muted">{[item.brand, item.model].filter(Boolean).join(' · ') || item.categories?.name || 'Sin categoría'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg text-muted hover:text-brand hover:bg-blue-50 transition-colors"><Edit3 size={15} /></button>
                  <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-red-50 transition-colors"><Trash2 size={15} /></button>
                </div>
              </div>

              <div className="flex gap-2 mt-3 flex-wrap">
                {item.daily_rate > 0 && <span className="text-xs font-semibold badge-info px-2 py-0.5 rounded-full">${item.daily_rate}/día</span>}
                {item.weekly_rate > 0 && <span className="text-xs font-semibold badge-info px-2 py-0.5 rounded-full">${item.weekly_rate}/sem</span>}
                {item.monthly_rate > 0 && <span className="text-xs font-semibold badge-info px-2 py-0.5 rounded-full">${item.monthly_rate}/mes</span>}
                {!item.daily_rate && !item.weekly_rate && !item.monthly_rate && <span className="text-xs text-muted italic">Sin tarifa</span>}
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isAvailable ? 'badge-success' : 'badge-warn'}`}>
                  {isAvailable ? 'Disponible' : item.current_status}
                </span>
                {!item.is_serialized && <span className="text-xs font-bold text-brand bg-blue-50 px-2 py-0.5 rounded-full">×{item.quantity_total}</span>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Equipment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-overlay">
          <div className="card w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-foreground">{editId ? 'Editar Activo' : 'Nuevo Activo'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-surface-alt rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <input required placeholder="Nombre del activo *" className="w-full rounded-xl px-4 py-2.5 text-sm" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Marca" className="w-full rounded-xl px-4 py-2.5 text-sm" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} />
                <input placeholder="Modelo / Variante" className="w-full rounded-xl px-4 py-2.5 text-sm" value={form.model} onChange={e => setForm({...form, model: e.target.value})} />
              </div>
              {categories.length > 0 && (
                <select className="w-full rounded-xl px-4 py-2.5 text-sm" value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})}>
                  <option value="">Sin categoría</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
              <div className="flex items-center justify-between p-3 bg-surface rounded-xl border border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">¿Ítem único rastreable?</p>
                  <p className="text-xs text-muted mt-0.5">Apágalo para stock por cantidad.</p>
                </div>
                <button type="button" onClick={() => setForm({...form, is_serialized: !form.is_serialized})} className={`w-11 h-6 rounded-full relative transition-colors ${form.is_serialized ? 'bg-brand' : 'bg-gray-300'}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${form.is_serialized ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
              {!form.is_serialized && (
                <input type="number" min="1" placeholder="Cantidad" className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold" value={form.quantity_total} onChange={e => setForm({...form, quantity_total: parseInt(e.target.value) || 1})} />
              )}
              <div className="border-t border-border pt-3">
                <p className="text-xs font-semibold text-muted uppercase mb-2 flex items-center gap-1"><DollarSign size={12} /> Tarifas de Renta</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-muted block mb-1">Por Día</label>
                    <input type="number" step="0.01" placeholder="$0" className="w-full rounded-lg px-3 py-2 text-sm" value={form.daily_rate} onChange={e => setForm({...form, daily_rate: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted block mb-1">Por Semana</label>
                    <input type="number" step="0.01" placeholder="$0" className="w-full rounded-lg px-3 py-2 text-sm" value={form.weekly_rate} onChange={e => setForm({...form, weekly_rate: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted block mb-1">Por Mes</label>
                    <input type="number" step="0.01" placeholder="$0" className="w-full rounded-lg px-3 py-2 text-sm" value={form.monthly_rate} onChange={e => setForm({...form, monthly_rate: e.target.value})} />
                  </div>
                </div>
              </div>
              <button disabled={saving} className="w-full bg-brand hover:bg-brand-light text-white rounded-xl py-2.5 font-semibold text-sm disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                {saving ? 'Guardando...' : <><Save size={16} /> {editId ? 'Actualizar Activo' : 'Guardar Activo'}</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCatModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-overlay">
          <div className="card w-full max-w-xs p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Nueva Categoría</h2>
              <button onClick={() => setShowCatModal(false)} className="p-1 hover:bg-surface-alt rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveCat} className="space-y-3">
              <input required placeholder="Ej: Maquinaria, Audio, Mobiliario..." className="w-full rounded-xl px-4 py-2.5 text-sm" value={catName} onChange={e => setCatName(e.target.value)} />
              <button className="w-full bg-brand text-white rounded-xl py-2.5 font-semibold text-sm">Crear</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
