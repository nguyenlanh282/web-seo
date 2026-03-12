'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Search, Sparkles, LogOut, User } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/lib/auth-context'

export function DashboardTopNav() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  return (
    <header
      className="h-14 flex items-center gap-3 px-4 shrink-0"
      style={{ backgroundColor: '#FFFEF0', borderBottom: '3px solid #000' }}
    >
      {/* Search input */}
      <div className="flex-1 max-w-xs relative">
        <Search
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="search"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="nb-input w-full pl-8 pr-3 py-1.5 text-sm"
          style={{ fontFamily: 'var(--nb-font-body)' }}
          aria-label="Search"
        />
      </div>

      <div className="flex-1" />

      {/* Upgrade CTA */}
      <button
        onClick={() => router.push('/pricing')}
        className="nb-btn px-3 py-1.5 bg-nb-cta text-black text-sm flex items-center gap-1.5"
        aria-label="Upgrade plan"
      >
        <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
        <span className="hidden sm:inline font-bold" style={{ fontFamily: 'var(--nb-font-heading)' }}>
          Upgrade
        </span>
      </button>

      {/* Notifications bell */}
      <button
        className="nb-btn relative w-9 h-9 bg-white flex items-center justify-center"
        aria-label="Notifications — 3 unread"
      >
        <Bell className="w-4 h-4 text-[#0D0D0D]" aria-hidden="true" />
        <span
          className="absolute top-1 right-1 w-2 h-2 bg-nb-red rounded-full border border-black"
          aria-hidden="true"
        />
      </button>

      {/* Avatar dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="nb-btn w-9 h-9 rounded-lg bg-nb-primary text-white flex items-center justify-center font-bold text-sm cursor-pointer"
            style={{ fontFamily: 'var(--nb-font-heading)' }}
            aria-label="User menu"
          >
            {initials}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-48 border-[2px] border-black"
          style={{ boxShadow: '4px 4px 0 #000' }}
        >
          <DropdownMenuLabel style={{ fontFamily: 'var(--nb-font-heading)' }}>
            {user?.name || 'User'}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer" onClick={() => router.push('/settings')}>
            <User className="mr-2 h-4 w-4" /> Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer text-red-600" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
