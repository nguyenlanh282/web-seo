'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  FolderOpen,
  Globe,
  CreditCard,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  LogOut,
  User,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CreditCounter } from '@/components/plan-limits'
import { useAuth } from '@/lib/auth-context'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, accent: 'bg-nb-yellow' },
  { href: '/projects',  label: 'Projects',  icon: FolderOpen,      accent: 'bg-nb-primary' },
  { href: '/wordpress', label: 'WordPress', icon: Globe,            accent: 'bg-green-400' },
  { href: '/pricing',   label: 'Pricing',   icon: CreditCard,       accent: 'bg-nb-cta' },
  { href: '/settings',  label: 'Settings',  icon: Settings,         accent: 'bg-gray-300' },
]

interface SidebarProps {
  collapsed: boolean
  onCollapse: (v: boolean) => void
}

export function DashboardSidebar({ collapsed, onCollapse }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  return (
    <aside
      style={{
        width: collapsed ? 64 : 240,
        transition: 'width 200ms ease',
        backgroundColor: '#FFFEF0',
        borderRight: '3px solid #000',
        flexShrink: 0,
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
      aria-label="Sidebar navigation"
    >
      {/* Logo row */}
      <div
        className="h-14 flex items-center justify-between px-3 shrink-0"
        style={{ borderBottom: '3px solid #000' }}
      >
        {collapsed ? (
          <Link href="/dashboard" className="mx-auto" aria-label="SEOPen home">
            <div
              className="w-8 h-8 rounded-lg bg-nb-primary flex items-center justify-center text-white font-bold border-[2px] border-black"
              style={{ boxShadow: '2px 2px 0 #000', fontFamily: 'var(--nb-font-heading)' }}
            >S</div>
          </Link>
        ) : (
          <>
            <Link href="/dashboard" className="flex items-center gap-2 min-w-0" aria-label="SEOPen home">
              <div
                className="w-8 h-8 rounded-lg bg-nb-primary flex items-center justify-center text-white font-bold shrink-0 border-[2px] border-black"
                style={{ boxShadow: '2px 2px 0 #000', fontFamily: 'var(--nb-font-heading)' }}
              >S</div>
              <span className="font-bold text-[#0D0D0D] text-lg truncate" style={{ fontFamily: 'var(--nb-font-heading)' }}>
                SEOPen
              </span>
            </Link>
            <button
              onClick={() => onCollapse(true)}
              className="nb-btn p-1.5 bg-nb-yellow text-black shrink-0"
              style={{ boxShadow: '2px 2px 0 #000' }}
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 p-2.5 flex flex-col gap-1 overflow-hidden" aria-label="Main navigation">
        {NAV_ITEMS.map(({ href, label, icon: Icon, accent }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg font-semibold text-sm transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-nb-primary border-[2px] ${
                active
                  ? 'bg-[#0D0D0D] text-white border-black'
                  : 'text-[#0D0D0D] hover:bg-[#0D0D0D] hover:text-white border-transparent hover:border-black'
              } ${collapsed ? 'justify-center' : ''}`}
              style={active ? { boxShadow: '3px 3px 0 #2196F3' } : undefined}
            >
              <div
                className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${active ? 'bg-nb-yellow' : accent}`}
                style={{ border: '1.5px solid #000' }}
              >
                <Icon className="w-3.5 h-3.5 text-black" aria-hidden="true" />
              </div>
              {!collapsed && <span>{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Credit counter (expanded only) */}
      {!collapsed && (
        <div style={{ borderTop: '3px solid #000' }}>
          <CreditCounter />
        </div>
      )}

      {/* User menu + expand toggle */}
      <div className="p-2.5 flex flex-col gap-2" style={{ borderTop: '3px solid #000' }}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={`nb-btn flex items-center gap-2.5 px-2.5 py-2 w-full bg-white text-[#0D0D0D] cursor-pointer ${collapsed ? 'justify-center' : ''}`}
              style={{ boxShadow: '3px 3px 0 #000' }}
              aria-label="User menu"
            >
              <div
                className="w-7 h-7 rounded-lg bg-nb-primary flex items-center justify-center text-white text-xs font-bold border-[2px] border-black shrink-0"
                style={{ fontFamily: 'var(--nb-font-heading)' }}
                aria-hidden="true"
              >
                {initials}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-bold text-[#0D0D0D] truncate">{user?.name || 'User'}</p>
                  <p className="text-[10px] text-gray-500 capitalize">{user?.plan || 'Starter'} plan</p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 border-[2px] border-black" style={{ boxShadow: '4px 4px 0 #000' }}>
            <DropdownMenuLabel style={{ fontFamily: 'var(--nb-font-heading)' }}>Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" onClick={() => router.push('/settings')}>
              <User className="mr-2 h-4 w-4" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={() => router.push('/pricing')}>
              <Sparkles className="mr-2 h-4 w-4" /> Upgrade
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-red-600" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {collapsed && (
          <button
            onClick={() => onCollapse(false)}
            className="nb-btn p-1.5 bg-nb-yellow text-black flex items-center justify-center w-full"
            style={{ boxShadow: '2px 2px 0 #000' }}
            aria-label="Expand sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  )
}
