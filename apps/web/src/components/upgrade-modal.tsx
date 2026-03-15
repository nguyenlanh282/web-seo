'use client'

import { useRouter } from 'next/navigation'
import { Dialog, DialogContent } from '@/components/ui/dialog'
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
    iconBg: 'bg-nb-primary/10',
    iconColor: 'text-nb-primary',
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
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
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
    iconBg: 'bg-nb-cta/20',
    iconColor: 'text-nb-cta',
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
        <div
          className="px-6 pt-6 pb-4 bg-nb-yellow border-b-[3px] border-black"
        >
          <h2
            className="text-xl font-bold text-[#0D0D0D]"
            style={{ fontFamily: 'var(--nb-font-heading)' }}
          >
            Nâng cấp gói dịch vụ
          </h2>
          {reason && (
            <p className="text-sm text-[#0D0D0D]/70 mt-1">{reason}</p>
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
                  className="nb-card-static p-4 bg-white relative"
                  style={plan.popular ? { boxShadow: '5px 5px 0 #2196F3' } : undefined}
                >
                  {plan.popular && (
                    <span className="nb-badge bg-nb-primary text-white absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                      Phổ biến nhất
                    </span>
                  )}

                  <div className="flex items-center gap-2 mb-3">
                    <div className={`p-1.5 rounded-lg border-[1.5px] border-black ${plan.iconBg}`}>
                      <Icon className={`h-4 w-4 ${plan.iconColor}`} />
                    </div>
                    <span className="font-semibold text-[#0D0D0D]">{plan.name}</span>
                    {isCurrent && (
                      <span className="nb-badge bg-nb-yellow text-[#0D0D0D] ml-auto text-[9px]">
                        Hiện tại
                      </span>
                    )}
                  </div>

                  <div className="mb-3">
                    <span
                      className="text-2xl font-bold text-[#0D0D0D]"
                      style={{ fontFamily: 'var(--nb-font-heading)' }}
                    >
                      ${plan.price}
                    </span>
                    <span className="text-sm text-[#0D0D0D]/60">/tháng</span>
                  </div>

                  <ul className="space-y-1.5 mb-4">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-1.5 text-xs text-[#0D0D0D]">
                        <Check className="h-3.5 w-3.5 text-green-600 mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                    {plan.limits.map((f) => (
                      <li key={f} className="flex items-start gap-1.5 text-xs text-[#0D0D0D]/40">
                        <X className="h-3.5 w-3.5 text-[#0D0D0D]/30 mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    className={`nb-btn w-full py-1.5 text-xs ${
                      isCurrent
                        ? 'bg-nb-yellow text-[#0D0D0D]'
                        : 'bg-nb-primary text-white'
                    }`}
                    disabled={isCurrent}
                    onClick={() => {
                      onClose()
                      router.push('/pricing')
                    }}
                  >
                    {isCurrent ? 'Gói hiện tại' : 'Chọn gói này'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
