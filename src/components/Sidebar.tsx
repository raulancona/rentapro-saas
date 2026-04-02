'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  LayoutDashboard, Package, Calendar, CreditCard, 
  Settings, LogOut, Menu, X, Users, Briefcase
} from 'lucide-react'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Users, label: 'Clientes', href: '/dashboard/clients' },
  { icon: Briefcase, label: 'Proyectos', href: '/dashboard/projects' },
  { icon: Package, label: 'Inventario', href: '/dashboard/inventory' },
  { icon: Calendar, label: 'Rentas', href: '/dashboard/calendar' },
  { icon: CreditCard, label: 'Pagos', href: '/dashboard/payments' },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(true)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-[60] lg:hidden p-2 rounded-xl bg-white border border-border shadow-sm"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/20 lg:hidden" onClick={() => setIsOpen(false)} />
      )}

      <aside className={`fixed left-0 top-0 z-50 h-screen bg-white border-r border-border transition-all duration-300 ${isOpen ? 'w-60' : 'w-[70px]'}`}>
        <div className="flex h-full flex-col justify-between py-6 px-3">
          <div>
            <div className="flex items-center gap-2.5 mb-8 px-2">
              <div className="h-8 w-8 rounded-lg bg-brand flex items-center justify-center text-white font-bold text-sm flex-shrink-0">R</div>
              {isOpen && <span className="text-lg font-bold text-foreground tracking-tight">RentaPro</span>}
            </div>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive 
                        ? 'bg-brand text-white shadow-sm' 
                        : 'text-muted hover:bg-surface-alt hover:text-foreground'
                    }`}
                  >
                    <item.icon size={20} className="flex-shrink-0" />
                    {isOpen && <span>{item.label}</span>}
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className="space-y-1 pt-4 border-t border-border">
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted hover:bg-surface-alt hover:text-foreground transition-all"
            >
              <Settings size={20} />
              {isOpen && <span>Configuración</span>}
            </Link>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-danger hover:bg-red-50 transition-all"
            >
              <LogOut size={20} />
              {isOpen && <span>Cerrar Sesión</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
