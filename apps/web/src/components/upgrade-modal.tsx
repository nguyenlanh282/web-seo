'use client'

import { useRouter } from 'next/navigation'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, X, Sparkles, Zap, Crown } from 'lucide-react'

interface UpgradeModalProps {
  open: boolean
  onClose: () => void
  currentPlan?: string
  reason?: string
}

const PLANS = [
  {
    key: 'STARTER',
    name: 'Starter',
    price: 19,
    icon: Zap,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    features: [
      '30 bài viết/tháng',
      '2 dự án',
      'AI viết bài cơ bản',
      'SEO Checker',
      'Xuất HTML',
    ],
    limits: ['Không có Content Gap', 'Không có WordPress', 'Không có Internal Links'],
  },
  {
    key: 'PRO',
    name: 'Pro',
    price: 49,
    icon: Sparkles,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-400',
    popular: true,
    features: [
      '100 bài viết/tháng',
      '10 dự án',
      'AI viết bài nâng cao',
      'Content Gap Analysis',
      '1 WordPress site',
      'Internal Links gợi ý',
    ],
    limits: [],
  },
  {
    key: 'AGENCY',
    name: 'Agency',
    price: 149,
    icon: Crown,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-400',
    features: [
      '500 bài viết/tháng',
      'Dự án không giới hạn',
      'Mọi tính năng AI',
      '50 WordPress sites',
      'Internal Links tự động',
      'Ưu tiên hỗ trợ',
    ],
    limits: [],
  },
]

export function UpgradeModal({ open, onClose, currentPlan = 'STARTER', reason }: UpgradeModalProps) {
  const router = useRouter()

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 bg-gradient-to-r from-violet-50 to-blue-50 border-b">
          <h2 className="text-xl font-bold text-slate-900">Nâng cấp gói dịch vụ</h2>
          {reason && (
            <p className="text-sm text-slate-600 mt-1">{reason}</p>
          )}
        </div>

        {/* Plans */}
        <div className="p-6">
          <div className="grid grid-cols-3 gap-4">
            {PLANS.map((plan) => {
              const isCurrent = currentPlan?.toUpperCase() === plan.key
              const Icon = plan.icon

              return (
                <div
                  key={plan.key}
                  className={`rounded-xl border-2 p-4 relative transition-all ${
                    plan.popular
                      ? `${plan.border} shadow-md`
                      : isCurrent
                        ? 'border-slate-300 bg-slate-50'
                        : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {plan.popular && (
                    <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-violet-600 text-[10px]">
                      Phổ biến nhất
                    </Badge>
                  )}

                  <div className="flex items-center gap-2 mb-3">
                    <div className={`p-1.5 rounded-lg ${plan.bg}`}>
                      <Icon className={`h-4 w-4 ${plan.color}`} />
                    </div>
                    <span className="font-semibold text-slate-900">{plan.name}</span>
                    {isCurrent && (
                      <Badge variant="secondary" className="text-[9px] ml-auto">
                        Hiện tại
                      </Badge>
                    )}
                  </div>

                  <div className="mb-3">
                    <span className="text-2xl font-bold text-slate-900">${plan.price}</span>
                    <span className="text-sm text-slate-500">/tháng</span>
                  </div>

                  <ul className="space-y-1.5 mb-4">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-1.5 text-xs text-slate-700">
                        <Check className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                    {plan.limits.map((f) => (
                      <li key={f} className="flex items-start gap-1.5 text-xs text-slate-400">
                        <X className="h-3.5 w-3.5 text-slate-300 mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    size="sm"
                    className="w-full"
                    variant={isCurrent ? 'outline' : plan.popular ? 'default' : 'outline'}
                    disabled={isCurrent}
                    onClick={() => {
                      onClose()
                      router.push('/pricing')
                    }}
                  >
                    {isCurrent ? 'Gói hiện tại' : 'Chọn gói này'}
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
