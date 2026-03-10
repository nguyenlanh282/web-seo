'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { usersApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { User, Shield, Key, Save, Check, Eye, EyeOff } from 'lucide-react'

export default function SettingsPage() {
  const { user, refresh } = useAuth()

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold font-heading text-slate-900 mb-6">Cài đặt</h1>

      <Tabs defaultValue="profile">
        <TabsList className="mb-6">
          <TabsTrigger value="profile">
            <User className="w-4 h-4 mr-1.5" />
            Hồ sơ
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="w-4 h-4 mr-1.5" />
            Bảo mật
          </TabsTrigger>
          <TabsTrigger value="api-keys">
            <Key className="w-4 h-4 mr-1.5" />
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

// ============================================================================
// Profile Tab
// ============================================================================

function ProfileTab({ user, refresh }: { user: any; refresh: () => Promise<void> }) {
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
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Thông tin cá nhân</CardTitle>
        <CardDescription>Cập nhật thông tin hồ sơ của bạn</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Email</Label>
          <Input value={user?.email || ''} disabled className="mt-1.5 bg-slate-50" />
          <p className="text-xs text-slate-500 mt-1">Email không thể thay đổi</p>
        </div>
        <div>
          <Label>Tên</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nhập tên của bạn"
            className="mt-1.5"
          />
        </div>
        <div>
          <Label>Gói dịch vụ</Label>
          <div className="mt-1.5">
            <Badge variant="secondary">{user?.plan || 'STARTER'}</Badge>
          </div>
        </div>
        <Button onClick={handleSaveProfile} disabled={saving}>
          <Save className="w-4 h-4 mr-1.5" />
          {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
        </Button>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Security Tab — Change Password
// ============================================================================

function SecurityTab({ user }: { user: any }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)

  // Google-only users can't change password
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
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Bảo mật</CardTitle>
          <CardDescription>Quản lý bảo mật tài khoản</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            Tài khoản của bạn đăng nhập qua Google. Không cần thiết lập mật khẩu riêng.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Đổi mật khẩu</CardTitle>
        <CardDescription>Cập nhật mật khẩu đăng nhập</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Mật khẩu hiện tại</Label>
          <div className="relative mt-1.5">
            <Input
              type={showCurrent ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div>
          <Label>Mật khẩu mới</Label>
          <div className="relative mt-1.5">
            <Input
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Tối thiểu 8 ký tự"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {newPassword && newPassword.length < 8 && (
            <p className="text-xs text-red-500 mt-1">Tối thiểu 8 ký tự</p>
          )}
        </div>
        <div>
          <Label>Xác nhận mật khẩu</Label>
          <Input
            type="password"
            className="mt-1.5"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Nhập lại mật khẩu mới"
          />
          {confirmPassword && confirmPassword !== newPassword && (
            <p className="text-xs text-red-500 mt-1">Mật khẩu xác nhận không khớp</p>
          )}
        </div>
        <Button
          onClick={handleChangePassword}
          disabled={saving || !currentPassword || !newPassword || newPassword !== confirmPassword}
        >
          <Shield className="w-4 h-4 mr-1.5" />
          {saving ? 'Đang xử lý...' : 'Đổi mật khẩu'}
        </Button>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// API Keys Tab
// ============================================================================

function ApiKeysTab() {
  const [anthropicKey, setAnthropicKey] = useState('')
  const [serpApiKey, setSerpApiKey] = useState('')
  const [hasAnthropicKey, setHasAnthropicKey] = useState(false)
  const [hasSerpApiKey, setHasSerpApiKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    usersApi
      .getApiKeyStatus()
      .then((status: any) => {
        setHasAnthropicKey(status.hasAnthropicKey)
        setHasSerpApiKey(status.hasSerpApiKey)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const data: { anthropicKey?: string; serpApiKey?: string } = {}
      if (anthropicKey) data.anthropicKey = anthropicKey
      if (serpApiKey) data.serpApiKey = serpApiKey

      if (!data.anthropicKey && !data.serpApiKey) {
        toast.error('Nhập ít nhất 1 API key')
        setSaving(false)
        return
      }

      await usersApi.saveApiKeys(data)
      toast.success('API keys đã được lưu và mã hóa')

      // Refresh status
      if (anthropicKey) setHasAnthropicKey(true)
      if (serpApiKey) setHasSerpApiKey(true)
      setAnthropicKey('')
      setSerpApiKey('')
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error?.message ||
        'Không thể lưu API keys'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">API Keys</CardTitle>
        <CardDescription>
          Quản lý API keys cho dịch vụ bên ngoài. Keys được mã hóa AES-256 trước khi lưu.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <Label>Anthropic API Key</Label>
            {!loading && hasAnthropicKey && (
              <Badge variant="outline" className="text-xs text-green-600 border-green-200 bg-green-50">
                <Check className="h-3 w-3 mr-1" />
                Đã thiết lập
              </Badge>
            )}
          </div>
          <Input
            type="password"
            className="mt-1.5"
            value={anthropicKey}
            onChange={(e) => setAnthropicKey(e.target.value)}
            placeholder={hasAnthropicKey ? '••••••••••••••••' : 'sk-ant-...'}
          />
          <p className="text-xs text-slate-500 mt-1">
            Dùng cho AI content generation. Để trống nếu không muốn thay đổi.
          </p>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <Label>SerpAPI Key</Label>
            {!loading && hasSerpApiKey && (
              <Badge variant="outline" className="text-xs text-green-600 border-green-200 bg-green-50">
                <Check className="h-3 w-3 mr-1" />
                Đã thiết lập
              </Badge>
            )}
          </div>
          <Input
            type="password"
            className="mt-1.5"
            value={serpApiKey}
            onChange={(e) => setSerpApiKey(e.target.value)}
            placeholder={hasSerpApiKey ? '••••••••••••••••' : 'Nhập SerpAPI key'}
          />
          <p className="text-xs text-slate-500 mt-1">
            Dùng cho phân tích từ khóa SERP. Để trống nếu không muốn thay đổi.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving || (!anthropicKey && !serpApiKey)}
        >
          <Key className="w-4 h-4 mr-1.5" />
          {saving ? 'Đang lưu...' : 'Lưu API Keys'}
        </Button>
      </CardContent>
    </Card>
  )
}
