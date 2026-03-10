'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  LayoutDashboard,
  FolderOpen,
  Globe,
  CreditCard,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
  LogOut,
  User,
} from 'lucide-react'
import { CreditCounter } from '@/components/plan-limits'
import { PlanErrorProvider } from '@/components/plan-error-provider'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects', label: 'Dự án', icon: FolderOpen },
  { href: '/wordpress', label: 'WordPress', icon: Globe },
  { href: '/pricing', label: 'Gói dịch vụ', icon: CreditCard },
  { href: '/settings', label: 'Cài đặt', icon: Settings },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const { user, logout } = useAuth()

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside
        className={`${
          collapsed ? 'w-16' : 'w-60'
        } bg-white border-r border-slate-200 flex flex-col transition-all duration-200 ease-in-out shrink-0`}
      >
        {/* Logo + Collapse toggle */}
        <div className="h-14 px-4 border-b border-slate-200 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0">
              S
            </div>
            {!collapsed && (
              <span className="font-bold font-heading text-slate-900 text-lg truncate">
                SEOPen
              </span>
            )}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
            title={collapsed ? 'Mở rộng' : 'Thu gọn'}
          >
            {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive(item.href)
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                } ${collapsed ? 'justify-center px-0' : ''}`}
              >
                <Icon className="w-[18px] h-[18px] shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Credit Counter */}
        {!collapsed && (
          <div className="border-t border-slate-200">
            <CreditCounter />
          </div>
        )}

        {/* User section */}
        <div className="p-3 border-t border-slate-200">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`flex items-center gap-3 px-3 py-2 rounded-lg w-full hover:bg-slate-50 transition-colors ${
                  collapsed ? 'justify-center px-0' : ''
                }`}
              >
                <Avatar className="w-7 h-7">
                  <AvatarFallback className="bg-blue-100 text-blue-600 text-xs font-bold">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-xs font-medium text-slate-900 truncate">
                      {user?.name || 'User'}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Gói {user?.plan || 'Starter'}
                    </p>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Tài khoản</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/settings')}>
                <User className="mr-2 h-4 w-4" />
                Hồ sơ
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/pricing')}>
                <Sparkles className="mr-2 h-4 w-4" />
                Nâng cấp
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Đăng xuất
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6 sticky top-0 z-10">
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              onClick={() => router.push('/pricing')}
              className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-medium hover:opacity-90"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Nâng cấp
            </Button>
          </div>
        </header>

        <div className="p-6">
          <PlanErrorProvider>
            {children}
          </PlanErrorProvider>
        </div>
      </main>
    </div>
  )
}
