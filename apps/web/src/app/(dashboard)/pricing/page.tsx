'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Check, X, Sparkles } from 'lucide-react'

const PLANS = [
  {
    name: 'Starter',
    price: '$19',
    period: '/tháng',
    features: [
      { label: '30 bài viết/tháng', included: true },
      { label: '2 dự án', included: true },
      { label: 'AI viết bài', included: true },
      { label: 'SEO Checker', included: true },
      { label: 'Xuất HTML', included: true },
      { label: 'Content Gap Analysis', included: false },
      { label: 'WordPress Export', included: false },
      { label: 'Internal Links tự động', included: false },
    ],
  },
  {
    name: 'Pro',
    price: '$49',
    period: '/tháng',
    popular: true,
    features: [
      { label: '100 bài viết/tháng', included: true },
      { label: '10 dự án', included: true },
      { label: 'AI viết bài', included: true },
      { label: 'SEO Checker', included: true },
      { label: 'Xuất HTML', included: true },
      { label: 'Content Gap Analysis', included: true },
      { label: '1 WordPress site', included: true },
      { label: 'Internal Links gợi ý', included: true },
    ],
  },
  {
    name: 'Agency',
    price: '$149',
    period: '/tháng',
    features: [
      { label: '500 bài viết/tháng', included: true },
      { label: 'Dự án không giới hạn', included: true },
      { label: 'AI viết bài', included: true },
      { label: 'SEO Checker', included: true },
      { label: 'Xuất HTML', included: true },
      { label: 'Content Gap Analysis', included: true },
      { label: '50 WordPress sites', included: true },
      { label: 'Internal Links tự động', included: true },
    ],
  },
]

export default function PricingPage() {
  const { user } = useAuth()
  const router = useRouter()

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1
          className="text-3xl font-bold text-[#0D0D0D] mb-2"
          style={{ fontFamily: 'var(--nb-font-heading)' }}
        >
          Chọn gói phù hợp
        </h1>
        <p className="text-[#0D0D0D]/60">Nâng cấp để mở khóa tất cả tính năng AI</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const isCurrent = user?.plan?.toUpperCase() === plan.name.toUpperCase()
          return (
            <div
              key={plan.name}
              className="nb-card p-5 bg-white relative flex flex-col gap-4"
              style={plan.popular ? { boxShadow: '6px 6px 0 #2196F3' } : undefined}
            >
              {plan.popular && (
                <span className="nb-badge bg-nb-primary text-white border-nb-primary absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Phổ biến nhất
                </span>
              )}

              <div className="text-center pt-4">
                <h2
                  className="text-lg font-bold text-[#0D0D0D]"
                  style={{ fontFamily: 'var(--nb-font-heading)' }}
                >
                  {plan.name}
                </h2>
                <div className="mt-2">
                  <span
                    className="text-4xl font-bold text-[#0D0D0D]"
                    style={{ fontFamily: 'var(--nb-font-heading)' }}
                  >
                    {plan.price}
                  </span>
                  <span className="text-[#0D0D0D]/60">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-3 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature.label} className="flex items-center gap-2 text-sm">
                    {feature.included ? (
                      <div className="w-5 h-5 rounded border-[1.5px] border-black bg-green-300 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-[#0D0D0D]" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded border-[1.5px] border-black bg-gray-200 flex items-center justify-center shrink-0">
                        <X className="w-3 h-3 text-[#0D0D0D]/50" />
                      </div>
                    )}
                    <span className={feature.included ? 'text-[#0D0D0D]' : 'text-[#0D0D0D]/40'}>
                      {feature.label}
                    </span>
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <button
                  className="nb-btn w-full py-2.5 bg-nb-yellow text-[#0D0D0D]"
                  disabled
                >
                  ✓ Gói hiện tại
                </button>
              ) : (
                <button
                  className={`nb-btn w-full py-2.5 ${
                    plan.popular
                      ? 'bg-nb-primary text-white'
                      : 'bg-white text-[#0D0D0D]'
                  }`}
                  onClick={() => router.push('/pricing')}
                >
                  Chọn gói này
                </button>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-center text-sm text-[#0D0D0D]/50 mt-8">
        Cần gói tùy chỉnh? Liên hệ{' '}
        <a href="mailto:hello@seopen.dev" className="text-nb-primary font-bold hover:underline">
          hello@seopen.dev
        </a>
      </p>
    </div>
  )
}
