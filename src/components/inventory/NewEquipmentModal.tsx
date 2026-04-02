'use client'

import { useState } from 'react'
import { X, Package, Ruler, Hash, Info, Save } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

export function NewEquipmentModal({ isOpen, onClose, onRefresh }: any) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    model: '',
    is_serialized: true,
    quantity_total: 1,
  })

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const supabase = createClient()
    
    // El tenant_id se inyecta automáticamente por el Trigger que creamos
    const { error } = await supabase
      .from('equipment')
      .insert([
        { 
          name: formData.name,
          brand: formData.brand,
          model: formData.model,
          is_serialized: formData.is_serialized,
          quantity_total: formData.is_serialized ? 1 : formData.quantity_total,
          current_status: 'available'
        }
      ])

    if (error) {
      console.error('Error guardando equipo:', error.message)
      alert('Error al guardar: ' + error.message)
    } else {
      onRefresh()
      onClose()
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="glass w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-brand/10 text-brand rounded-2xl">
                <Package size={24} />
              </div>
              <h2 className="text-2xl font-bold">Nuevo Equipo</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-surface rounded-xl transition-colors">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase text-gray-400 ml-1">Nombre del Artículo / Equipo</label>
                <div className="relative">
                  <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input 
                    required
                    type="text" 
                    placeholder="Ej. Carpa 6x6, Cámara Sony, Proyector..."
                    className="w-full bg-surface border border-border rounded-2xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-brand/50 outline-none transition-all"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase text-gray-400 ml-1">Marca (Opcional)</label>
                  <input 
                    type="text" 
                    placeholder="Ej. Sony, Apple, genérica"
                    className="w-full bg-surface border border-border rounded-2xl px-4 py-3 focus:ring-2 focus:ring-brand/50 outline-none transition-all"
                    value={formData.brand}
                    onChange={(e) => setFormData({...formData, brand: e.target.value})}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase text-gray-400 ml-1">Modelo o Variante</label>
                  <input 
                    type="text" 
                    placeholder="Ej. Pro 2024, Color Negro"
                    className="w-full bg-surface border border-border rounded-2xl px-4 py-3 focus:ring-2 focus:ring-brand/50 outline-none transition-all"
                    value={formData.model}
                    onChange={(e) => setFormData({...formData, model: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-surface/50 rounded-2xl border border-border">
                <div className="flex flex-col">
                  <span className="text-sm font-bold">¿Controlar por Serie Única?</span>
                  <span className="text-[10px] text-gray-500 max-w-[280px]">Apágalo si gestionas este ítem por cantidad/stock (ej. 50 sillas iguales). Déjalo prendido si es un ítem rastreable específico.</span>
                </div>
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, is_serialized: !formData.is_serialized})}
                  className={`w-12 h-6 rounded-full transition-all relative ${formData.is_serialized ? 'bg-brand' : 'bg-gray-600'}`}
                >
                  <div className={`absolute top-1 bg-white w-4 h-4 rounded-full transition-all ${formData.is_serialized ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              {!formData.is_serialized && (
                <div className="flex flex-col gap-2 animate-in slide-in-from-top-2 duration-300">
                  <label className="text-xs font-bold uppercase text-gray-400 ml-1">Cantidad Inicial</label>
                  <input 
                    type="number" 
                    min="1"
                    className="w-full bg-surface border border-border rounded-2xl px-4 py-3 focus:ring-2 focus:ring-brand/50 outline-none transition-all font-bold"
                    value={formData.quantity_total}
                    onChange={(e) => setFormData({...formData, quantity_total: parseInt(e.target.value)})}
                  />
                </div>
              )}
            </div>

            <button 
              disabled={loading}
              type="submit" 
              className="w-full bg-brand hover:bg-brand/90 disabled:opacity-50 text-white py-4 rounded-3xl font-bold text-lg shadow-xl shadow-brand/20 transition-all flex items-center justify-center gap-3"
            >
              {loading ? 'Guardando...' : (
                <>
                  <Save size={20} />
                  Guardar en Inventario
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
