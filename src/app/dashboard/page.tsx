'use client'

import { useEffect, useState } from 'react'
import {
  TrendingUp, Users, Package, AlertTriangle,
  DollarSign, Clock, CheckCircle2, ArrowUpRight, ArrowDownRight, Calendar, Wrench
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'

interface Stats {
  incomeMonth: number
  incomePrev: number
  activeBookings: number
  rentedAssets: number
  totalAssets: number
  overdueBookings: number
  clients: number
}

interface UpcomingReturn {
  id: string
  document_number: string | null
  client_name: string | null
  end_date: string
  daysLeft: number
  status: string
}

interface WeeklyBar {
  label: string
  count: number
}

const STATUSES: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'Pendiente',  cls: 'badge-warn' },
  confirmed: { label: 'Confirmada', cls: 'badge-info' },
  active:    { label: 'En Curso',   cls: 'badge-success' },
  completed: { label: 'Completada', cls: 'badge-neutral' },
  cancelled: { label: 'Cancelada',  cls: 'badge-danger' },
  late:      { label: 'Retrasada',  cls: 'badge-danger' },
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    incomeMonth: 0, incomePrev: 0, activeBookings: 0,
    rentedAssets: 0, totalAssets: 0, overdueBookings: 0, clients: 0,
  })
  const [upcoming, setUpcoming] = useState<UpcomingReturn[]>([])
  const [weeklyBars, setWeeklyBars] = useState<WeeklyBar[]>([])
  const [topEquipment, setTopEquipment] = useState<{ name: string; count: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
      const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString()
      const todayISO = now.toISOString().split('T')[0]
      const in7Days = new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0]

      const [
        paymentsMonth, paymentsPrev,
        bookingsAll, equipmentAll, clientsAll, itemsAll
      ] = await Promise.all([
        supabase.from('payments').select('amount').gte('payment_date', startOfMonth),
        supabase.from('payments').select('amount').gte('payment_date', startOfPrevMonth).lte('payment_date', endOfPrevMonth),
        supabase.from('bookings').select('id, status, end_date, document_number, client_id, client:clients!bookings_client_id_fkey(name)').neq('status', 'cancelled'),
        supabase.from('equipment').select('id, name, current_status'),
        supabase.from('clients').select('id', { count: 'exact', head: true }),
        supabase.from('booking_items').select('equipment_id, equipment(name)'),
      ])

      const incomeMonth = (paymentsMonth.data || []).reduce((s, p) => s + Number(p.amount), 0)
      const incomePrev = (paymentsPrev.data || []).reduce((s, p) => s + Number(p.amount), 0)

      const allBookings = bookingsAll.data || []
      const activeBookings = allBookings.filter(b => ['active', 'confirmed', 'pending'].includes(b.status)).length
      const overdueBookings = allBookings.filter(b =>
        b.end_date && b.end_date.split('T')[0] < todayISO &&
        !['completed', 'cancelled'].includes(b.status)
      ).length

      const allEquipment = equipmentAll.data || []
      const rentedAssets = allEquipment.filter(e => e.current_status === 'rented').length

      // Upcoming returns (next 7 days)
      const upcomingList: UpcomingReturn[] = allBookings
        .filter(b => {
          const d = b.end_date?.split('T')[0] || ''
          return d >= todayISO && d <= in7Days && !['completed', 'cancelled'].includes(b.status)
        })
        .map(b => {
          const endDay = b.end_date?.split('T')[0] || ''
          const ms = new Date(endDay + 'T12:00:00').getTime() - new Date(todayISO + 'T12:00:00').getTime()
          return {
            id: b.id,
            document_number: b.document_number,
            client_name: (b.client as any)?.name || null,
            end_date: endDay,
            daysLeft: Math.round(ms / 86400000),
            status: b.status,
          }
        })
        .sort((a, b) => a.daysLeft - b.daysLeft)
        .slice(0, 5)

      // Weekly bars (last 8 weeks)
      const bars: WeeklyBar[] = []
      for (let i = 7; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(d.getDate() - i * 7)
        const weekStart = new Date(d)
        weekStart.setDate(weekStart.getDate() - weekStart.getDay())
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekEnd.getDate() + 6)
        const wsStr = weekStart.toISOString().split('T')[0]
        const weStr = weekEnd.toISOString().split('T')[0]
        const count = allBookings.filter(b => {
          const created = b.id // no created_at here, use rough heuristic
          const sd = (b as any).start_date?.split('T')[0] || ''
          return sd >= wsStr && sd <= weStr
        }).length
        bars.push({
          label: `${weekStart.getDate()}/${weekStart.getMonth() + 1}`,
          count,
        })
      }

      // Top equipment
      const itemsData = itemsAll.data || []
      const countMap: Record<string, { name: string; count: number }> = {}
      itemsData.forEach((item: any) => {
        const id = item.equipment_id
        const name = item.equipment?.name || 'Activo'
        if (!countMap[id]) countMap[id] = { name, count: 0 }
        countMap[id].count++
      })
      const top = Object.values(countMap).sort((a, b) => b.count - a.count).slice(0, 5)

      setStats({
        incomeMonth, incomePrev, activeBookings,
        rentedAssets, totalAssets: allEquipment.length,
        overdueBookings, clients: clientsAll.count || 0,
      })
      setUpcoming(upcomingList)
      setWeeklyBars(bars)
      setTopEquipment(top)
      setLoading(false)
    }
    load()
  }, [])

  const incomeDelta = stats.incomePrev > 0
    ? Math.round(((stats.incomeMonth - stats.incomePrev) / stats.incomePrev) * 100)
    : null

  const maxBar = Math.max(...weeklyBars.map(b => b.count), 1)

  if (loading) return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-white animate-pulse rounded-2xl border border-border" />)}
      </div>
    </div>
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted text-sm mt-1">Resumen en tiempo real de tu negocio.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Ingresos del mes"
          value={`$${stats.incomeMonth.toLocaleString()}`}
          icon={DollarSign}
          color="green"
          delta={incomeDelta}
          sub="vs. mes anterior"
        />
        <KPICard
          title="Rentas activas"
          value={String(stats.activeBookings)}
          icon={TrendingUp}
          color="blue"
          sub="pendientes + confirmadas + en curso"
        />
        <KPICard
          title="Activos en uso"
          value={`${stats.rentedAssets} / ${stats.totalAssets}`}
          icon={Package}
          color="blue"
          sub="del inventario total"
        />
        <KPICard
          title="Devoluciones vencidas"
          value={String(stats.overdueBookings)}
          icon={AlertTriangle}
          color={stats.overdueBookings > 0 ? 'amber' : 'green'}
          sub={stats.overdueBookings > 0 ? 'requieren atención' : 'sin pendientes'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Weekly chart */}
        <div className="lg:col-span-2 card p-6">
          <h3 className="font-semibold text-foreground mb-5">Rentas iniciadas — últimas 8 semanas</h3>
          <div className="flex items-end gap-2 h-36">
            {weeklyBars.map((bar, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] font-semibold text-brand">{bar.count > 0 ? bar.count : ''}</span>
                <div
                  className="w-full rounded-t-md bg-brand/80 transition-all duration-500"
                  style={{ height: `${Math.max(4, (bar.count / maxBar) * 120)}px` }}
                />
                <span className="text-[9px] text-muted">{bar.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick stats */}
        <div className="card p-6 flex flex-col gap-4">
          <h3 className="font-semibold text-foreground">Resumen</h3>
          <div className="space-y-3">
            <StatRow icon={Users} label="Total clientes" value={String(stats.clients)} />
            <StatRow icon={Package} label="Total activos" value={String(stats.totalAssets)} />
            <StatRow icon={CheckCircle2} label="Disponibles" value={String(stats.totalAssets - stats.rentedAssets)} />
            <StatRow icon={Wrench} label="En mantenimiento" value="—" />
          </div>
          <div className="pt-3 border-t border-border">
            <Link href="/dashboard/calendar" className="text-brand text-sm font-semibold hover:underline flex items-center gap-1">
              Ver todas las rentas →
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Upcoming returns */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Próximas devoluciones</h3>
            <span className="text-xs text-muted">Próximos 7 días</span>
          </div>
          {upcoming.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-muted text-sm">
              <CheckCircle2 size={16} className="mr-2 text-accent" /> Sin devoluciones próximas
            </div>
          ) : (
            <div className="space-y-2">
              {upcoming.map(r => {
                const st = STATUSES[r.status] || STATUSES.pending
                return (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-surface-alt transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {r.client_name || 'Sin cliente'}
                        {r.document_number && <span className="text-muted font-normal"> · {r.document_number}</span>}
                      </p>
                      <p className="text-xs text-muted mt-0.5 flex items-center gap-1">
                        <Calendar size={11} />
                        {new Date(r.end_date + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                      <span className={`text-xs font-bold ${r.daysLeft === 0 ? 'text-danger' : r.daysLeft <= 2 ? 'text-warning' : 'text-muted'}`}>
                        {r.daysLeft === 0 ? 'Hoy' : `${r.daysLeft}d`}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Top equipment */}
        <div className="card p-6">
          <h3 className="font-semibold text-foreground mb-4">Activos más rentados</h3>
          {topEquipment.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-muted text-sm">Sin datos aún</div>
          ) : (
            <div className="space-y-3">
              {topEquipment.map((eq, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted w-4">{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{eq.name}</p>
                    <div className="mt-1 h-1.5 bg-surface-alt rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand rounded-full"
                        style={{ width: `${(eq.count / (topEquipment[0]?.count || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-brand">{eq.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function KPICard({ title, value, icon: Icon, color, delta, sub }: any) {
  const colors: any = {
    blue: 'bg-blue-50 text-brand',
    green: 'bg-emerald-50 text-accent',
    amber: 'bg-amber-50 text-warning',
    red: 'bg-red-50 text-danger',
  }
  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted">{title}</span>
        <div className={`p-2 rounded-xl ${colors[color]}`}><Icon size={18} /></div>
      </div>
      <div>
        <span className="text-3xl font-bold text-foreground">{value}</span>
        {delta !== null && delta !== undefined && (
          <span className={`ml-2 text-sm font-semibold flex items-center gap-0.5 inline-flex ${delta >= 0 ? 'text-accent' : 'text-danger'}`}>
            {delta >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  )
}

function StatRow({ icon: Icon, label, value }: any) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-muted">
        <Icon size={15} className="text-brand" />
        {label}
      </div>
      <span className="text-sm font-bold text-foreground">{value}</span>
    </div>
  )
}
