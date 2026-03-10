'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
        <h1 className="text-3xl font-bold font-heading text-slate-900 mb-2">Chọn gói phù hợp</h1>
        <p className="text-slate-500">Nâng cấp để mở khóa tất cả tính năng AI</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const isCurrent = user?.plan?.toUpperCase() === plan.name.toUpperCase()
          return (
            <Card
              key={plan.name}
              className={`relative ${
                plan.popular
                  ? 'border-blue-500 border-2 shadow-lg'
                  : 'border-slate-200'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-blue-600">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Phổ biến nhất
                  </Badge>
                </div>
              )}
              <CardHeader className="text-center pt-8">
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <div className="mt-2">
                  <span className="text-4xl font-bold text-slate-900">{plan.price}</span>
                  <span className="text-slate-500">{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature.label} className="flex items-center gap-2 text-sm">
                      {feature.included ? (
                        <Check className="w-4 h-4 text-green-500 shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-slate-300 shrink-0" />
                      )}
                      <span className={feature.included ? 'text-slate-700' : 'text-slate-400'}>
                        {feature.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className={`w-full ${
                    plan.popular
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : ''
                  }`}
                  variant={isCurrent ? 'outline' : plan.popular ? 'default' : 'outline'}
                  disabled={isCurrent}
                >
                  {isCurrent ? 'Gói hiện tại' : 'Chọn gói này'}
                </Button>
              </CardFooter>
            </Card>
          )
        })}
      </div>

      <p className="text-center text-sm text-slate-500 mt-8">
        Cần gói tùy chỉnh? Liên hệ{' '}
        <a href="mailto:hello@seopen.dev" className="text-blue-600 hover:underline">
          hello@seopen.dev
        </a>
      </p>
    </div>
  )
}
