'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, Users, Package, AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

export default function DashboardPage() {
  const [stats, setStats] = useState({ equipment: 0, clients: 0, bookings: 0, maintenance: 0 })

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const [eq, cl, bk, mt] = await Promise.all([
        supabase.from('equipment').select('id', { count: 'exact', head: true }),
        supabase.from('clients').select('id', { count: 'exact', head: true }),
        supabase.from('bookings').select('id', { count: 'exact', head: true }),
        supabase.from('maintenance_logs').select('id', { count: 'exact', head: true }),
      ])
      setStats({
        equipment: eq.count || 0,
        clients: cl.count || 0,
        bookings: bk.count || 0,
        maintenance: mt.count || 0,
      })
    }
    load()
  }, [])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted text-sm mt-1">Resumen general de tu negocio de rentas.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Activos Registrados" value={stats.equipment} icon={Package} color="blue" />
        <StatCard title="Clientes" value={stats.clients} icon={Users} color="green" />
        <StatCard title="Rentas" value={stats.bookings} icon={TrendingUp} color="blue" />
        <StatCard title="Mantenimiento" value={stats.maintenance} icon={AlertTriangle} color={stats.maintenance > 0 ? "amber" : "blue"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 card p-6">
          <h3 className="font-semibold text-foreground mb-4">Actividad Reciente</h3>
          <div className="flex items-center justify-center h-48 text-muted text-sm border border-dashed border-border rounded-xl">
            Los datos de actividad se mostrarán aquí conforme uses el sistema.
          </div>
        </div>
        <div className="card p-6">
          <h3 className="font-semibold text-foreground mb-4">Accesos Rápidos</h3>
          <div className="space-y-2">
            <QuickLink href="/dashboard/inventory" label="Agregar activo" icon="📦" />
            <QuickLink href="/dashboard/clients" label="Nuevo cliente" icon="👤" />
            <QuickLink href="/dashboard/calendar" label="Crear renta" icon="📋" />
            <QuickLink href="/dashboard/projects" label="Nuevo proyecto" icon="🏗️" />
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon: Icon, color }: any) {
  const colors: any = {
    blue: 'badge-info',
    green: 'badge-success',
    amber: 'badge-warn',
    red: 'badge-danger',
  }
  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted">{title}</span>
        <div className={`p-2 rounded-lg ${colors[color]}`}><Icon size={18} /></div>
      </div>
      <span className="text-3xl font-bold text-foreground">{value}</span>
    </div>
  )
}

function QuickLink({ href, label, icon }: any) {
  return (
    <a href={href} className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-alt transition-colors text-sm font-medium text-foreground">
      <span className="text-lg">{icon}</span>
      {label}
    </a>
  )
}
