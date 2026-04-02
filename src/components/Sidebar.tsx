'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Package, 
  Calendar, 
  CreditCard, 
  BarChart3, 
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react'
import { useState } from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Package, label: 'Inventario', href: '/dashboard/inventory' },
  { icon: Calendar, label: 'Calendario', href: '/dashboard/calendar' },
  { icon: CreditCard, label: 'Pagos', href: '/dashboard/payments' },
  { icon: BarChart3, label: 'Estadísticas', href: '/dashboard/stats' },
]

export function Sidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(true)

  return (
    <>
      {/* Mobile Backdrop */}
      {!isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden" 
          onClick={() => setIsOpen(true)}
        />
      )}

      <aside className={cn(
        "fixed left-0 top-0 z-50 h-screen glass border-r border-border transition-all duration-300",
        isOpen ? "w-64" : "w-20"
      )}>
        <div className="flex h-full flex-col justify-between p-4">
          <div>
            <div className="flex items-center justify-between mb-8 px-2">
              {isOpen && (
                <span className="text-xl font-bold gradient-text tracking-tight">
                  RentaPro
                </span>
              )}
              <button 
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 hover:bg-surface rounded-lg transition-colors"
              >
                {isOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>

            <nav className="space-y-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                      isActive 
                        ? "bg-brand text-white shadow-lg shadow-brand/20" 
                        : "text-gray-400 hover:bg-surface hover:text-white"
                    )}
                  >
                    <item.icon size={22} className={cn(
                      "min-w-[22px]",
                      !isActive && "group-hover:scale-110 transition-transform"
                    )} />
                    {isOpen && <span className="font-medium whitespace-nowrap">{item.label}</span>}
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className="space-y-2 pt-4 border-t border-border">
            <Link
              href="/dashboard/settings"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 hover:bg-surface hover:text-white transition-all",
                pathname === '/dashboard/settings' && "bg-surface text-white"
              )}
            >
              <Settings size={22} />
              {isOpen && <span className="font-medium text-sm">Configuración</span>}
            </Link>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 transition-all">
              <LogOut size={22} />
              {isOpen && <span className="font-medium text-sm">Cerrar Sesión</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
