import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/lib/providers'

export const metadata: Metadata = {
  title: 'SEOPen - AI-Powered SEO Writing Platform',
  description: 'Viet bai blog chuan SEO + AEO voi AI. Phan tich SERP, tao noi dung E-E-A-T, kiem tra SEO realtime.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
