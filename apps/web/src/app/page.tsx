import Link from 'next/link'
import {
  FileText,
  Search,
  Zap,
  BarChart2,
  CheckCircle,
  ArrowRight,
  Globe,
  TrendingUp,
  Shield,
  Layers,
} from 'lucide-react'

const NAV_LINKS = [
  { label: 'Tính năng', href: '#features' },
  { label: 'Cách dùng', href: '#how-it-works' },
  { label: 'Bảng giá', href: '/pricing' },
]

const FEATURES = [
  {
    icon: Search,
    title: 'Phân tích SERP thực chiến',
    desc: 'Lấy dữ liệu top 10 Google cho từ khóa bất kỳ. Hiểu rõ đối thủ đang làm gì để vượt qua họ.',
    color: '#2196F3',
  },
  {
    icon: FileText,
    title: 'Viết nội dung E-E-A-T',
    desc: 'AI tạo bài viết theo chuẩn E-E-A-T của Google. Cấu trúc heading, outline, và nội dung hoàn chỉnh.',
    color: '#FF5252',
  },
  {
    icon: Zap,
    title: 'Kiểm tra SEO realtime',
    desc: 'Chấm điểm SEO ngay khi viết. Gợi ý tối ưu on-page tức thì — mật độ từ khóa, meta, heading.',
    color: '#FFEB3B',
  },
  {
    icon: BarChart2,
    title: 'Tracking từ khóa',
    desc: 'Theo dõi thứ hạng từ khóa hàng ngày. Biểu đồ xu hướng giúp bạn biết bài nào đang lên/xuống.',
    color: '#4CAF50',
  },
  {
    icon: Globe,
    title: 'Đăng WordPress 1 click',
    desc: 'Kết nối trực tiếp với WordPress. Xuất bài viết hoàn chỉnh với ảnh, meta SEO, và slug tối ưu.',
    color: '#9C27B0',
  },
  {
    icon: Shield,
    title: 'Nội dung AEO-ready',
    desc: 'Tối ưu cho Answer Engine Optimization. Bài viết được AI Answer Boxes ưu tiên trích dẫn.',
    color: '#F59E0B',
  },
]

const STEPS = [
  {
    step: '01',
    title: 'Nhập từ khóa',
    desc: 'Nhập từ khóa mục tiêu. SEOPen phân tích SERP và hiểu ý định tìm kiếm của người dùng.',
  },
  {
    step: '02',
    title: 'AI tạo outline',
    desc: 'Nhận outline bài viết chuẩn SEO dựa trên phân tích 10 bài top Google hiện tại.',
  },
  {
    step: '03',
    title: 'Viết & tối ưu',
    desc: 'Viết nội dung với gợi ý realtime. Điểm SEO tăng ngay khi bạn điều chỉnh.',
  },
  {
    step: '04',
    title: 'Xuất bản',
    desc: 'Đăng trực tiếp lên WordPress hoặc xuất HTML/Markdown. Xong trong vài phút.',
  },
]

const STATS = [
  { value: '10,000+', label: 'Bài viết đã tạo' },
  { value: '3x', label: 'Nhanh hơn viết tay' },
  { value: '94%', label: 'Điểm SEO trung bình' },
  { value: '500+', label: 'Người dùng tin tưởng' },
]

export default function LandingPage() {
  return (
    <div
      className="min-h-screen antialiased"
      style={{
        backgroundColor: 'var(--nb-color-bg)',
        fontFamily: 'var(--nb-font-body)',
        color: 'var(--nb-color-text)',
      }}
    >
      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 border-b-[3px] border-black bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg border-[3px] border-black font-bold text-white"
              style={{ backgroundColor: 'var(--nb-color-primary)', fontFamily: 'var(--nb-font-heading)', boxShadow: '3px 3px 0 #000' }}
            >
              S
            </div>
            <span className="text-xl font-bold" style={{ fontFamily: 'var(--nb-font-heading)' }}>
              SEOPen
            </span>
          </Link>

          <div className="hidden items-center gap-6 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium transition-colors duration-150 hover:text-blue-600"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden text-sm font-semibold transition-colors hover:text-blue-600 md:block"
            >
              Đăng nhập
            </Link>
            <Link
              href="/register"
              className="nb-btn px-4 py-2 text-sm"
              style={{ backgroundColor: 'var(--nb-color-cta)', fontFamily: 'var(--nb-font-heading)' }}
            >
              Dùng miễn phí
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="mx-auto max-w-6xl px-4 py-16 lg:px-8 lg:py-24">
        <div className="flex flex-col items-center gap-10 lg:flex-row lg:gap-16">
          {/* Left copy */}
          <div className="flex-1 text-center lg:text-left">
            <div
              className="nb-badge mb-5 inline-flex"
              style={{ backgroundColor: 'var(--nb-color-yellow)' }}
            >
              <Zap className="mr-1.5 h-3.5 w-3.5" />
              AI-Powered SEO Writing
            </div>

            <h1
              className="mb-5 text-4xl font-bold leading-tight lg:text-5xl xl:text-6xl"
              style={{ fontFamily: 'var(--nb-font-heading)' }}
            >
              Viết bài SEO{' '}
              <span
                className="inline-block -rotate-1 rounded px-2"
                style={{ backgroundColor: 'var(--nb-color-yellow)' }}
              >
                chuẩn Google
              </span>{' '}
              <br className="hidden lg:block" />
              nhanh gấp 3 lần
            </h1>

            <p className="mb-8 max-w-lg text-lg leading-relaxed text-slate-600 lg:mx-0">
              Phân tích SERP thực chiến, tạo nội dung E-E-A-T, kiểm tra SEO realtime.
              Từ từ khóa đến bài viết hoàn chỉnh — chỉ trong vài phút.
            </p>

            <div className="flex flex-col items-center gap-3 sm:flex-row lg:items-start">
              <Link
                href="/register"
                className="nb-btn flex items-center gap-2 px-6 py-3 text-base"
                style={{ backgroundColor: 'var(--nb-color-cta)', fontFamily: 'var(--nb-font-heading)' }}
              >
                Bắt đầu miễn phí
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#how-it-works"
                className="nb-btn bg-white px-6 py-3 text-base"
                style={{ fontFamily: 'var(--nb-font-heading)' }}
              >
                Xem cách hoạt động
              </Link>
            </div>

            <p className="mt-4 text-sm text-slate-500">
              Không cần thẻ tín dụng · 5 bài miễn phí mỗi tháng
            </p>
          </div>

          {/* Right — mock editor */}
          <div className="w-full max-w-lg flex-1">
            <div className="nb-card-static overflow-hidden">
              {/* Editor toolbar */}
              <div
                className="flex items-center justify-between border-b-[3px] border-black px-4 py-3"
                style={{ backgroundColor: 'var(--nb-color-primary)' }}
              >
                <span
                  className="text-sm font-bold text-white"
                  style={{ fontFamily: 'var(--nb-font-heading)' }}
                >
                  SEOPen Editor
                </span>
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full border-2 border-black bg-red-400" />
                  <div className="h-3 w-3 rounded-full border-2 border-black bg-yellow-400" />
                  <div className="h-3 w-3 rounded-full border-2 border-black bg-green-400" />
                </div>
              </div>
              {/* SEO score bar */}
              <div className="flex items-center gap-3 border-b-[3px] border-black bg-slate-50 px-4 py-2.5">
                <span className="text-xs font-semibold text-slate-600">Điểm SEO</span>
                <div className="flex-1 rounded-full border-2 border-black bg-white">
                  <div
                    className="h-3 rounded-full border-r-2 border-black"
                    style={{ width: '91%', backgroundColor: '#4CAF50' }}
                  />
                </div>
                <span
                  className="text-sm font-bold"
                  style={{ fontFamily: 'var(--nb-font-heading)' }}
                >
                  91/100
                </span>
              </div>
              {/* Fake content lines */}
              <div className="space-y-3 p-5">
                <div
                  className="h-5 w-4/5 rounded border-[2px] border-black"
                  style={{ backgroundColor: 'var(--nb-color-yellow)' }}
                />
                <div className="h-3 w-full rounded border-[2px] border-black bg-slate-200" />
                <div className="h-3 w-11/12 rounded border-[2px] border-black bg-slate-200" />
                <div className="h-3 w-3/4 rounded border-[2px] border-black bg-slate-200" />
                <div className="mt-4 h-4 w-2/5 rounded border-[2px] border-black bg-blue-200" />
                <div className="h-3 w-full rounded border-[2px] border-black bg-slate-200" />
                <div className="h-3 w-5/6 rounded border-[2px] border-black bg-slate-200" />
                <div className="flex items-center gap-2 pt-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-xs font-medium text-green-700">Từ khóa chính xuất hiện đủ mật độ</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-xs font-medium text-green-700">Meta description tối ưu</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-medium text-blue-700">Gợi ý: thêm 1 internal link</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section style={{ backgroundColor: 'var(--nb-color-primary)' }}>
        <div className="mx-auto max-w-6xl px-4 py-10 lg:px-8">
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <div
                  className="text-3xl font-bold text-white lg:text-4xl"
                  style={{ fontFamily: 'var(--nb-font-heading)' }}
                >
                  {stat.value}
                </div>
                <div className="mt-1 text-sm text-blue-200">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-16 lg:px-8 lg:py-24">
        <div className="mb-12 text-center">
          <h2
            className="mb-3 text-3xl font-bold lg:text-4xl"
            style={{ fontFamily: 'var(--nb-font-heading)' }}
          >
            Mọi thứ bạn cần để{' '}
            <span
              className="inline-block -rotate-1 rounded px-2"
              style={{ backgroundColor: 'var(--nb-color-red)', color: '#fff' }}
            >
              thống trị SERP
            </span>
          </h2>
          <p className="mx-auto max-w-xl text-slate-600">
            Bộ công cụ SEO toàn diện được thiết kế cho content creator và SEO chuyên nghiệp tại Việt Nam.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feat) => (
            <div key={feat.title} className="nb-card p-6 cursor-pointer">
              <div
                className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border-[3px] border-black"
                style={{ backgroundColor: feat.color }}
              >
                <feat.icon className="h-6 w-6 text-white" strokeWidth={2.5} />
              </div>
              <h3
                className="mb-2 text-lg font-bold"
                style={{ fontFamily: 'var(--nb-font-heading)' }}
              >
                {feat.title}
              </h3>
              <p className="text-sm leading-relaxed text-slate-600">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section
        id="how-it-works"
        className="border-y-[3px] border-black py-16 lg:py-24"
        style={{ backgroundColor: 'var(--nb-color-yellow)' }}
      >
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          <div className="mb-12 text-center">
            <h2
              className="mb-3 text-3xl font-bold lg:text-4xl"
              style={{ fontFamily: 'var(--nb-font-heading)' }}
            >
              4 bước từ từ khóa đến bài đăng
            </h2>
            <p className="text-slate-700">Quy trình tối ưu, lặp lại được, không tốn công sức.</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <div key={s.step} className="relative">
                <div className="nb-card-static bg-white p-6">
                  <div
                    className="mb-4 text-4xl font-bold"
                    style={{ fontFamily: 'var(--nb-font-heading)', color: 'var(--nb-color-primary)' }}
                  >
                    {s.step}
                  </div>
                  <h3 className="mb-2 font-bold" style={{ fontFamily: 'var(--nb-font-heading)' }}>
                    {s.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-600">{s.desc}</p>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="absolute -right-4 top-1/2 z-10 hidden -translate-y-1/2 lg:block">
                    <ArrowRight className="h-6 w-6" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Integrations strip ── */}
      <section className="mx-auto max-w-6xl px-4 py-12 lg:px-8">
        <p className="mb-6 text-center text-sm font-semibold uppercase tracking-widest text-slate-500">
          Tích hợp với công cụ bạn đang dùng
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          {['WordPress', 'Google Search Console', 'Google Analytics', 'Semrush', 'Ahrefs'].map((tool) => (
            <div key={tool} className="nb-badge bg-white">
              <Layers className="mr-1.5 h-3.5 w-3.5" />
              {tool}
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="mx-auto max-w-6xl px-4 pb-20 lg:px-8">
        <div
          className="nb-card-static p-10 text-center lg:p-16"
          style={{ backgroundColor: 'var(--nb-color-primary)' }}
        >
          <h2
            className="mb-4 text-3xl font-bold text-white lg:text-4xl"
            style={{ fontFamily: 'var(--nb-font-heading)' }}
          >
            Sẵn sàng viết bài SEO hiệu quả hơn?
          </h2>
          <p className="mx-auto mb-8 max-w-lg text-blue-200">
            Tham gia cùng 500+ content creator đang dùng SEOPen mỗi ngày. Bắt đầu miễn phí, không cần thẻ tín dụng.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="nb-btn flex items-center gap-2 px-8 py-3 text-base"
              style={{ backgroundColor: 'var(--nb-color-cta)', fontFamily: 'var(--nb-font-heading)' }}
            >
              Tạo tài khoản miễn phí
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="nb-btn bg-white px-8 py-3 text-base"
              style={{ fontFamily: 'var(--nb-font-heading)' }}
            >
              Đăng nhập
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t-[3px] border-black bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg border-[3px] border-black font-bold text-white"
                style={{ backgroundColor: 'var(--nb-color-primary)', fontFamily: 'var(--nb-font-heading)' }}
              >
                S
              </div>
              <span className="font-bold" style={{ fontFamily: 'var(--nb-font-heading)' }}>
                SEOPen
              </span>
            </div>
            <p className="text-sm text-slate-500">© 2025 SEOPen. AI-Powered SEO Writing Platform.</p>
            <div className="flex gap-4 text-sm">
              <Link href="/pricing" className="text-slate-500 hover:text-slate-900 transition-colors">
                Bảng giá
              </Link>
              <Link href="/login" className="text-slate-500 hover:text-slate-900 transition-colors">
                Đăng nhập
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
