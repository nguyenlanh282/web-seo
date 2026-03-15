'use client'

import { useState } from 'react'
import { usersApi } from '@/lib/api'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Shield, Eye, EyeOff } from 'lucide-react'

interface SecurityTabProps {
  user: any
}

export function SecurityTab({ user }: SecurityTabProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)

  const isGoogleOnly = user?.googleId && !user?.hasPassword

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      toast.error('Mật khẩu mới phải có ít nhất 8 ký tự')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp')
      return
    }

    setSaving(true)
    try {
      await usersApi.changePassword({ currentPassword, newPassword })
      toast.success('Đổi mật khẩu thành công')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error?.message ||
        'Không thể đổi mật khẩu'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  if (isGoogleOnly) {
    return (
      <div className="nb-card p-6 bg-white space-y-5">
        <h2
          className="text-base font-bold text-[#0D0D0D] border-b-[2px] border-black pb-2 mb-4"
          style={{ fontFamily: 'var(--nb-font-heading)' }}
        >
          Bảo mật
        </h2>
        <p className="text-sm text-[#0D0D0D]/60">
          Tài khoản của bạn đăng nhập qua Google. Không cần thiết lập mật khẩu riêng.
        </p>
      </div>
    )
  }

  return (
    <div className="nb-card p-6 bg-white space-y-5">
      <h2
        className="text-base font-bold text-[#0D0D0D] border-b-[2px] border-black pb-2 mb-4"
        style={{ fontFamily: 'var(--nb-font-heading)' }}
      >
        Đổi mật khẩu
      </h2>
      <p className="text-sm text-[#0D0D0D]/60 -mt-2">Cập nhật mật khẩu đăng nhập</p>

      <div>
        <Label htmlFor="current-password" className="font-semibold text-[#0D0D0D]">Mật khẩu hiện tại</Label>
        <div className="relative mt-1.5">
          <Input
            id="current-password"
            type={showCurrent ? 'text' : 'password'}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
            className="nb-input w-full px-3 py-2"
          />
          <button
            type="button"
            onClick={() => setShowCurrent(!showCurrent)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0D0D0D]/40 hover:text-[#0D0D0D]"
          >
            {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div>
        <Label htmlFor="new-password" className="font-semibold text-[#0D0D0D]">Mật khẩu mới</Label>
        <div className="relative mt-1.5">
          <Input
            id="new-password"
            type={showNew ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Tối thiểu 8 ký tự"
            className="nb-input w-full px-3 py-2"
          />
          <button
            type="button"
            onClick={() => setShowNew(!showNew)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0D0D0D]/40 hover:text-[#0D0D0D]"
          >
            {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {newPassword && newPassword.length < 8 && (
          <p className="text-xs text-nb-red mt-1">Tối thiểu 8 ký tự</p>
        )}
      </div>

      <div>
        <Label htmlFor="confirm-password" className="font-semibold text-[#0D0D0D]">Xác nhận mật khẩu</Label>
        <Input
          id="confirm-password"
          type="password"
          className="nb-input w-full px-3 py-2 mt-1.5"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Nhập lại mật khẩu mới"
        />
        {confirmPassword && confirmPassword !== newPassword && (
          <p className="text-xs text-nb-red mt-1">Mật khẩu xác nhận không khớp</p>
        )}
      </div>

      <button
        className="nb-btn px-4 py-2 bg-nb-yellow text-[#0D0D0D] flex items-center gap-1.5"
        onClick={handleChangePassword}
        disabled={saving || !currentPassword || !newPassword || newPassword !== confirmPassword}
      >
        <Shield className="w-4 h-4" />
        {saving ? 'Đang xử lý...' : 'Đổi mật khẩu'}
      </button>
    </div>
  )
}
