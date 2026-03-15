'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, UserPlus } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const { register } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!email || !password) {
      toast.error('Vui lòng nhập email và mật khẩu')
      return
    }

    if (password.length < 8) {
      toast.error('Mật khẩu phải có tối thiểu 8 ký tự')
      return
    }

    setIsLoading(true)
    try {
      await register(email, password, name || undefined)
      toast.success('Đăng ký thành công! Vui lòng đăng nhập.')
      router.push('/login')
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Đăng ký thất bại. Vui lòng thử lại.'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-nb-bg px-4">
      <div className="w-full max-w-[420px]">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-3">
            <div
              className="w-10 h-10 bg-nb-primary rounded-xl border-[2px] border-black flex items-center justify-center"
              style={{ boxShadow: '2px 2px 0 #000' }}
            >
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span
              className="text-2xl font-bold text-[#0D0D0D]"
              style={{ fontFamily: 'var(--nb-font-heading)' }}
            >
              SEOPen
            </span>
          </div>
          <p className="text-[#0D0D0D]/60 text-sm font-medium">
            Bắt đầu viết content SEO chuyên nghiệp với AI
          </p>
        </div>

        <div className="nb-card p-8 bg-white">
          <div className="mb-6">
            <h1
              className="text-xl font-bold text-[#0D0D0D] text-center"
              style={{ fontFamily: 'var(--nb-font-heading)' }}
            >
              Tạo tài khoản
            </h1>
            <p className="text-center text-[#0D0D0D]/60 text-sm mt-1">
              Điền thông tin bên dưới để đăng ký
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-[13px] font-semibold text-[#0D0D0D]">
                Họ và tên
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="VD: Nguyễn Văn A"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                autoComplete="name"
                autoFocus
                className="nb-input w-full px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[13px] font-semibold text-[#0D0D0D]">
                Email <span className="text-nb-red">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="VD: name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                autoComplete="email"
                required
                className="nb-input w-full px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[13px] font-semibold text-[#0D0D0D]">
                Mật khẩu <span className="text-nb-red">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Tối thiểu 8 ký tự"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="new-password"
                required
                minLength={8}
                className="nb-input w-full px-3 py-2 text-sm"
              />
              <p className="text-xs text-[#0D0D0D]/40 mt-1">Mật khẩu cần có ít nhất 8 ký tự</p>
            </div>

            <button
              type="submit"
              className="nb-btn w-full px-4 py-2.5 bg-nb-primary text-white flex items-center justify-center gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              {isLoading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-[#0D0D0D]/60">
            Đã có tài khoản?{' '}
            <Link
              href="/login"
              className="text-nb-primary font-bold hover:underline"
            >
              Đăng nhập
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-[#0D0D0D]/40 mt-6">
          © 2026 SEOPen. Nền tảng viết bài SEO/AEO hàng đầu Việt Nam.
        </p>
      </div>
    </div>
  )
}
