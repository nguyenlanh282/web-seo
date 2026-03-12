'use client'

import { useState } from 'react'
import { DashboardSidebar } from '@/components/dashboard/sidebar'
import { DashboardTopNav } from '@/components/dashboard/topnav'
import { PlanErrorProvider } from '@/components/plan-error-provider'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ backgroundColor: 'var(--nb-color-bg)', fontFamily: 'var(--nb-font-body)' }}
    >
      <DashboardSidebar
        collapsed={sidebarCollapsed}
        onCollapse={setSidebarCollapsed}
      />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <DashboardTopNav />
        <main className="flex-1 overflow-auto p-5 md:p-6">
          <PlanErrorProvider>
            {children}
          </PlanErrorProvider>
        </main>
      </div>
    </div>
  )
}
