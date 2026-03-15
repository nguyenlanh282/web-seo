'use client'

import { useState } from 'react'
import { usersApi } from '@/lib/api'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Save } from 'lucide-react'

interface ProfileTabProps {
  user: any
  refresh: () => Promise<void>
}

export function ProfileTab({ user, refresh }: ProfileTabProps) {
  const [name, setName] = useState(user?.name || '')
  const [saving, setSaving] = useState(false)

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      await usersApi.update({ name })
      await refresh()
      toast.success('Đã lưu hồ sơ')
    } catch {
      toast.error('Không thể lưu hồ sơ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="nb-card p-6 bg-white space-y-5">
      <h2
        className="text-base font-bold text-[#0D0D0D] border-b-[2px] border-black pb-2 mb-4"
        style={{ fontFamily: 'var(--nb-font-heading)' }}
      >
        Thông tin cá nhân
      </h2>
      <p className="text-sm text-[#0D0D0D]/60 -mt-2">Cập nhật thông tin hồ sơ của bạn</p>

      <div>
        <Label htmlFor="profile-email" className="font-semibold text-[#0D0D0D]">Email</Label>
        <Input
          id="profile-email"
          value={user?.email || ''}
          disabled
          className="nb-input w-full px-3 py-2 mt-1.5 bg-nb-bg opacity-60"
        />
        <p className="text-xs text-[#0D0D0D]/50 mt-1">Email không thể thay đổi</p>
      </div>

      <div>
        <Label htmlFor="profile-name" className="font-semibold text-[#0D0D0D]">Tên</Label>
        <Input
          id="profile-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nhập tên của bạn"
          className="nb-input w-full px-3 py-2 mt-1.5"
        />
      </div>

      <div>
        <Label className="font-semibold text-[#0D0D0D]">Gói dịch vụ</Label>
        <div className="mt-1.5">
          <span className="nb-badge bg-nb-yellow text-[#0D0D0D]">{user?.plan || 'STARTER'}</span>
        </div>
      </div>

      <button
        className="nb-btn px-4 py-2 bg-nb-primary text-white flex items-center gap-1.5"
        onClick={handleSaveProfile}
        disabled={saving}
      >
        <Save className="w-4 h-4" />
        {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
      </button>
    </div>
  )
}
