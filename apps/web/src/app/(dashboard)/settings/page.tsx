'use client'

import { useAuth } from '@/lib/auth-context'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { User, Shield, Key } from 'lucide-react'
import { ProfileTab } from './settings-profile-tab'
import { SecurityTab } from './settings-security-tab'
import { ApiKeysTab } from './settings-api-keys-tab'

export default function SettingsPage() {
  const { user, refresh } = useAuth()

  return (
    <div className="max-w-2xl">
      <h1
        className="text-2xl font-bold text-[#0D0D0D] mb-6"
        style={{ fontFamily: 'var(--nb-font-heading)' }}
      >
        Cài đặt
      </h1>

      <Tabs defaultValue="profile">
        <TabsList
          className="flex gap-1 border-[3px] border-black rounded-lg p-1 bg-nb-bg mb-6 h-auto"
          style={{ boxShadow: '3px 3px 0 #000' }}
        >
          <TabsTrigger
            value="profile"
            className="flex items-center gap-1.5 px-4 py-2 rounded font-bold text-sm data-[state=active]:bg-nb-primary data-[state=active]:text-white data-[state=active]:border-[2px] data-[state=active]:border-black cursor-pointer"
          >
            <User className="w-4 h-4" />
            Hồ sơ
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="flex items-center gap-1.5 px-4 py-2 rounded font-bold text-sm data-[state=active]:bg-nb-primary data-[state=active]:text-white data-[state=active]:border-[2px] data-[state=active]:border-black cursor-pointer"
          >
            <Shield className="w-4 h-4" />
            Bảo mật
          </TabsTrigger>
          <TabsTrigger
            value="api-keys"
            className="flex items-center gap-1.5 px-4 py-2 rounded font-bold text-sm data-[state=active]:bg-nb-primary data-[state=active]:text-white data-[state=active]:border-[2px] data-[state=active]:border-black cursor-pointer"
          >
            <Key className="w-4 h-4" />
            API Keys
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab user={user} refresh={refresh} />
        </TabsContent>

        <TabsContent value="security">
          <SecurityTab user={user} />
        </TabsContent>

        <TabsContent value="api-keys">
          <ApiKeysTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
