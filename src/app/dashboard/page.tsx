import { 
  TrendingUp, 
  Users, 
  Package, 
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'

export default function DashboardPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Bienvenido, Admin</h1>
        <p className="text-gray-400">Aquí tienes el resumen de tu negocio de rentas para hoy.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Ingresos Totales" 
          value="$12,450.00" 
          change="+12.5%" 
          trend="up"
          icon={TrendingUp} 
        />
        <StatCard 
          title="Equipos Rentados" 
          value="42" 
          change="+3" 
          trend="up"
          icon={Package} 
        />
        <StatCard 
          title="Nuevos Clientes" 
          value="8" 
          change="-2" 
          trend="down"
          icon={Users} 
        />
        <StatCard 
          title="Mantenimiento" 
          value="4" 
          change="Revisión urgente" 
          trend="neutral"
          icon={AlertCircle} 
          isAlert
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Placeholder for Analytics Chart */}
        <div className="lg:col-span-4 glass rounded-3xl p-6 h-[400px] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Tendencias de Uso</h3>
            <button className="text-sm text-brand font-medium">Ver reporte →</button>
          </div>
          <div className="flex-1 flex items-center justify-center text-gray-500 border-2 border-dashed border-border rounded-2xl my-4 italic">
            Gráfico de tendencias (Chart.js / Recharts)
          </div>
        </div>

        {/* Recent Activity / Calendar Summary */}
        <div className="lg:col-span-3 glass rounded-3xl p-6 h-[400px] flex flex-col">
          <h3 className="font-semibold text-lg mb-4">Próximas Entregas</h3>
          <div className="space-y-4">
            <ActivityItem 
              item="Carpa Evento 10x10" 
              time="Mañana, 09:00 AM" 
              customer="Juan Perez" 
            />
            <ActivityItem 
              item="Mezcladora de Cemento" 
              time="2 Abr, 02:00 PM" 
              customer="Construcciones S.A" 
            />
            <ActivityItem 
              item="Andamios x6" 
              time="4 Abr, 08:30 AM" 
              customer="Admin" 
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, change, icon: Icon, trend, isAlert = false }: any) {
  return (
    <div className="glass rounded-3xl p-6 flex flex-col gap-1 hover:border-brand/40 transition-colors">
      <div className="flex items-center justify-between text-gray-400">
        <span className="text-sm font-medium">{title}</span>
        <div className={cn(
          "p-2 rounded-xl",
          isAlert ? "bg-red-500/10 text-red-400" : "bg-brand/10 text-brand"
        )}>
          <Icon size={20} />
        </div>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="flex items-center gap-1 text-xs mt-2">
        {trend === 'up' && <ArrowUpRight size={14} className="text-accent" />}
        {trend === 'down' && <ArrowDownRight size={14} className="text-red-400" />}
        <span className={cn(
          "font-medium",
          trend === 'up' ? "text-accent" : trend === 'down' ? "text-red-400" : "text-gray-500"
        )}>{change}</span>
        <span className="text-gray-500 font-normal ml-0.5">desde el mes pasado</span>
      </div>
    </div>
  )
}

function ActivityItem({ item, time, customer }: any) {
  return (
    <div className="flex items-center gap-4 p-3 hover:bg-surface/50 rounded-2xl transition-colors group">
      <div className="h-10 w-10 rounded-xl bg-surface flex items-center justify-center text-brand font-bold">
        {item[0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate group-hover:text-brand">{item}</p>
        <p className="text-xs text-gray-500 truncate">{customer}</p>
      </div>
      <div className="text-[10px] font-medium text-gray-400 bg-surface px-2 py-1 rounded-lg">
        {time}
      </div>
    </div>
  )
}

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
