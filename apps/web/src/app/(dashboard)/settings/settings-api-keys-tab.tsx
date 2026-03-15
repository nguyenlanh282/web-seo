'use client'

import { useState, useEffect } from 'react'
import { usersApi } from '@/lib/api'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Key, Check } from 'lucide-react'

export function ApiKeysTab() {
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
    <div className="nb-card p-6 bg-white space-y-5">
      <h2
        className="text-base font-bold text-[#0D0D0D] border-b-[2px] border-black pb-2 mb-4"
        style={{ fontFamily: 'var(--nb-font-heading)' }}
      >
        API Keys
      </h2>
      <p className="text-sm text-[#0D0D0D]/60 -mt-2">
        Quản lý API keys cho dịch vụ bên ngoài. Keys được mã hóa AES-256 trước khi lưu.
      </p>

      <div>
        <div className="flex items-center gap-2">
          <Label htmlFor="anthropic-key" className="font-semibold text-[#0D0D0D]">Anthropic API Key</Label>
          {!loading && hasAnthropicKey && (
            <span className="nb-badge bg-green-300 text-[#0D0D0D] border-green-700">
              <Check className="h-3 w-3 mr-1" />
              Đã thiết lập
            </span>
          )}
        </div>
        <Input
          id="anthropic-key"
          type="password"
          className="nb-input w-full px-3 py-2 mt-1.5"
          value={anthropicKey}
          onChange={(e) => setAnthropicKey(e.target.value)}
          placeholder={hasAnthropicKey ? '••••••••••••••••' : 'sk-ant-...'}
        />
        <p className="text-xs text-[#0D0D0D]/50 mt-1">
          Dùng cho AI content generation. Để trống nếu không muốn thay đổi.
        </p>
      </div>

      <div>
        <div className="flex items-center gap-2">
          <Label htmlFor="serp-key" className="font-semibold text-[#0D0D0D]">SerpAPI Key</Label>
          {!loading && hasSerpApiKey && (
            <span className="nb-badge bg-green-300 text-[#0D0D0D] border-green-700">
              <Check className="h-3 w-3 mr-1" />
              Đã thiết lập
            </span>
          )}
        </div>
        <Input
          id="serp-key"
          type="password"
          className="nb-input w-full px-3 py-2 mt-1.5"
          value={serpApiKey}
          onChange={(e) => setSerpApiKey(e.target.value)}
          placeholder={hasSerpApiKey ? '••••••••••••••••' : 'Nhập SerpAPI key'}
        />
        <p className="text-xs text-[#0D0D0D]/50 mt-1">
          Dùng cho phân tích từ khóa SERP. Để trống nếu không muốn thay đổi.
        </p>
      </div>

      <button
        className="nb-btn px-4 py-2 bg-nb-primary text-white flex items-center gap-1.5"
        onClick={handleSave}
        disabled={saving || (!anthropicKey && !serpApiKey)}
      >
        <Key className="w-4 h-4" />
        {saving ? 'Đang lưu...' : 'Lưu API Keys'}
      </button>
    </div>
  )
}
