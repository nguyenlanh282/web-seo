# SEOPen — Design Guidelines
> Hệ thống thiết kế cho nền tảng viết bài SEO/AEO SaaS tiếng Việt
> Phiên bản 1.0 | Cập nhật: Tháng 3 năm 2026

---

## 1. Triết lý thiết kế

**Nguyên tắc cốt lõi:**
- **Clarity First** — Giao diện rõ ràng. Người dùng biết mình đang ở đâu, cần làm gì.
- **AI-Augmented** — Tính năng AI được đánh dấu rõ ràng bằng màu tím (#8B5CF6).
- **Performance Trust** — Điểm SEO hiển thị trực quan, tạo niềm tin với dữ liệu thực.
- **Vietnamese Native** — Font, cách viết, và UX được tối ưu cho người dùng Việt Nam.

---

## 2. Bảng màu (Color Palette)

### Màu chính

| Tên | Hex | Sử dụng |
|-----|-----|---------|
| Primary Blue | `#3B82F6` | Nút chính, link, trạng thái active, SEO score 70-89 |
| Primary Dark | `#2563EB` | Hover state cho blue |
| Primary Light | `#EFF6FF` | Background badge, card highlight |
| AI Purple | `#8B5CF6` | Tất cả tính năng AI, badge AI, gradient |
| Purple Dark | `#6D28D9` | Hover state, text trên nền tím nhạt |
| Purple Light | `#F5F3FF` | Background badge AI, card AI |

### Màu trạng thái

| Tên | Hex | Sử dụng |
|-----|-----|---------|
| Success | `#22C55E` | Hoàn thành, kết nối OK, SEO score 90-100 |
| Success Light | `#F0FDF4` | Background success badge |
| Warning | `#F59E0B` | Cảnh báo, SEO score 50-69 |
| Warning Light | `#FFFBEB` | Background warning badge |
| Error | `#EF4444` | Lỗi, SEO score 0-49, mất kết nối |
| Error Light | `#FEF2F2` | Background error badge |

### Màu nền & bề mặt

| Tên | Hex | Sử dụng |
|-----|-----|---------|
| Background | `#F8FAFC` | Nền trang chính, sidebar hover |
| Surface | `#FFFFFF` | Card, modal, sidebar, header |
| Border | `#E2E8F0` | Đường viền mặc định |
| Text Primary | `#0F172A` | Tiêu đề, nội dung chính |
| Text Secondary | `#64748B` | Mô tả, placeholder, label phụ |
| Text Disabled | `#94A3B8` | Tính năng tắt, placeholder |

### SEO Score Color Mapping

```
90 – 100  →  #22C55E  (Xanh lá — Tuyệt vời)
70 – 89   →  #3B82F6  (Xanh dương — Tốt)
50 – 69   →  #F59E0B  (Cam — Cần cải thiện)
0  – 49   →  #EF4444  (Đỏ — Yếu)
```

---

## 3. Typography

### Font Stack

```css
--font-heading: 'Plus Jakarta Sans', system-ui, sans-serif;
--font-body:    'DM Sans', system-ui, sans-serif;
--font-mono:    'JetBrains Mono', 'Fira Code', monospace;
```

### Google Fonts (Vietnamese subset)

```html
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700&family=DM+Sans:ital,wght@0,400;0,500&family=JetBrains+Mono:wght@400;500&subset=latin-ext,vietnamese&display=swap" rel="stylesheet">
```

### Font Scale

| Token | px | Sử dụng |
|-------|----|---------|
| xs | 12px | Badge, meta label, caption |
| sm | 14px | Body text, nav item, button |
| base | 16px | Editor paragraph |
| lg | 18px | Tiêu đề card nhỏ, input title |
| xl | 20px | Section heading |
| 2xl | 24px | Page title |
| 3xl | 28px | Article H1 |
| 4xl | 32px | Hero heading |
| 5xl | 40px | Price display |
| 6xl | 48px | Marketing hero |

### Font Weights

| Token | Value | Sử dụng |
|-------|-------|---------|
| regular | 400 | Body text |
| medium | 500 | Label, active nav |
| semibold | 600 | Sub-heading, button |
| bold | 700 | Page title, logo |

---

## 4. Spacing & Grid

### Spacing Scale (base 8px)

```
4px   — Icon gap, micro spacing
8px   — Inline gap, badge padding
12px  — Item padding
16px  — Component padding
20px  — Section padding
24px  — Card padding, modal body
28px  — Page padding vertical
32px  — Page padding horizontal
48px  — Section gap
```

### Layout Dimensions

| Thành phần | Kích thước |
|------------|------------|
| Sidebar mở | 240px |
| Sidebar thu | 64px |
| Header | 56px (sticky) |
| Editor max-width | 800px (centered) |
| SEO Panel phải | 320px |
| Modal max-width | 480–520px |
| Desktop | 1280px |
| Mobile breakpoint | 768px |

### Border Radius

| Token | Value | Sử dụng |
|-------|-------|---------|
| sm | 4px | Badge, tag nhỏ |
| md | 6px | Input, button, nav item |
| lg | 8px | Card nhỏ |
| xl | 12px | Card chính, modal |
| 2xl | 16px | Pricing card |
| full | 9999px | Pill badge, toggle |

### Shadows

```css
--shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
--shadow-md: 0 4px 6px -1px rgba(0,0,0,0.10), 0 2px 4px -1px rgba(0,0,0,0.06);
--shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.10), 0 4px 6px -2px rgba(0,0,0,0.05);
```

---

## 5. Components

### 5.1 Buttons

**Variants:**
- `primary` — Blue (#3B82F6), white text, shadow-sm
- `secondary` — White bg, border #E2E8F0, dark text
- `ai` — Gradient purple (#8B5CF6 to #6D28D9), white text
- `danger` — White bg, red text, red border on hover
- `ghost` — Transparent bg, colored text

**Sizes:**
- `sm` — padding: 6px 10px, font: 12px
- `md` — padding: 8px 14px, font: 13-14px (default)
- `lg` — padding: 11px 24px, font: 15px, radius: 8px

**States:**
```css
:hover primary  { background: #2563EB; box-shadow: var(--shadow-md); }
:focus          { box-shadow: 0 0 0 3px rgba(59,130,246,0.3); }
:disabled       { opacity: 0.5; cursor: not-allowed; }
```

### 5.2 Badges & Status Chips

```css
/* Base pill badge */
display: inline-flex; align-items: center; gap: 5px;
padding: 4px 10px; border-radius: 9999px;
font-size: 12px; font-weight: 600;

/* Variants */
.published   { bg: #F0FDF4; color: #15803D }
.draft       { bg: #F1F5F9; color: #475569 }
.writing     { bg: #FFFBEB; color: #B45309 }
.analyzed    { bg: #EFF6FF; color: #1D4ED8 }
.outlined    { bg: #F5F3FF; color: #6D28D9 }
.error       { bg: #FEF2F2; color: #B91C1C }
```

### 5.3 Cards

```css
/* Standard Card */
background: #FFFFFF;
border: 1px solid #E2E8F0;
border-radius: 12px;
padding: 20-28px;
box-shadow: 0 1px 2px rgba(0,0,0,0.05);
transition: box-shadow 200ms, transform 200ms;

/* Hover (project cards) */
box-shadow: 0 4px 6px -1px rgba(0,0,0,0.10);
transform: translateY(-2px);

/* AI Feature Card */
border-left: 3px solid #8B5CF6;
background: linear-gradient(135deg, #FAFAFA, #FFFFFF);

/* Stat Card — top colored border */
border-top: 3px solid [theme-color];
```

### 5.4 Form Inputs

```css
/* Base */
padding: 10px 14px;
border: 1.5px solid #E2E8F0;
border-radius: 6px;
font-family: 'DM Sans'; font-size: 14px;
background: #FFFFFF;
transition: border-color 150ms, box-shadow 150ms;

/* Focus */
border-color: #3B82F6;
box-shadow: 0 0 0 3px rgba(59,130,246,0.12);

/* Error */
border-color: #EF4444;
box-shadow: 0 0 0 3px rgba(239,68,68,0.12);
```

Form label: `font-size: 13px; font-weight: 600; margin-bottom: 6px;`
Form hint: `font-size: 12px; color: #64748B; margin-top: 4px;`

### 5.5 Tables

```css
/* Header row */
background: #F8FAFC;
padding: 10px 16px;
font-size: 11px; font-weight: 600;
color: #64748B;
text-transform: uppercase; letter-spacing: 0.06em;
border-bottom: 1px solid #E2E8F0;

/* Data row */
padding: 12-14px 16px;
font-size: 13-14px;
border-bottom: 1px solid #F1F5F9;

/* Row hover */
background: #F8FAFC;
transition: background 100ms;
```

### 5.6 SEO Score Gauge (SVG Circular)

```
Radius (r) = 46px
Circumference = 2 * pi * 46 = ~289px

dashoffset = 289 * (1 - score/100)

Score 95 → dashoffset = 14   (color: #22C55E)
Score 78 → dashoffset = 64   (color: #3B82F6)
Score 62 → dashoffset = 110  (color: #F59E0B)
Score 40 → dashoffset = 173  (color: #EF4444)
```

### 5.7 Progress Bars

```css
/* Track */
height: 6px; background: #E2E8F0;
border-radius: 9999px; overflow: hidden;

/* Fill */
height: 100%; border-radius: 9999px;
transition: width 600ms ease;

/* Color by value */
/* 90-100: #22C55E | 70-89: #3B82F6 | 50-69: #F59E0B | 0-49: #EF4444 */
```

---

## 6. Icon System

Wireframe dùng emoji Unicode. Production dùng **Lucide Icons** (MIT).

| Feature | Emoji | Lucide |
|---------|-------|--------|
| Dashboard | 🏠 | `LayoutDashboard` |
| Bài viết | 📄 | `FileText` |
| Dự án | 📁 | `Folder` |
| Từ khóa | 🔍 | `Search` |
| WordPress | 🌐 | `Globe` |
| AI/Tự động | ⚡ | `Zap` |
| SEO Score | 📈 | `TrendingUp` |
| OK/Pass | ✅ | `CheckCircle2` |
| Warning | ⚠️ | `AlertTriangle` |
| Error | ❌ | `XCircle` |
| Thông báo | 🔔 | `Bell` |
| Xuất bài | 📤 | `Upload` |

---

## 7. Animation & Transitions

### Thời gian chuẩn

| Token | Duration | Sử dụng |
|-------|----------|---------|
| fast | 100ms | Hover icon, color |
| normal | 150ms | Button, input, nav |
| moderate | 200ms | Card hover, badge |
| slow | 300ms | Accordion, tab |
| entrance | 200ms ease-back | Modal, dropdown |

### Loading States

```css
/* Spinner */
@keyframes spin { to { transform: rotate(360deg); } }
.spinner {
  width: 40px; height: 40px;
  border: 3px solid #E2E8F0;
  border-top-color: #3B82F6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* Skeleton */
background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%);
background-size: 200% 100%;
animation: skeleton 1.5s ease infinite;

/* Modal entrance */
@keyframes modalIn {
  from { opacity: 0; transform: scale(0.97) translateY(8px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}

/* Step panel fade */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

### AI Loading Messages (Tiếng Việt)

```
"Đang phân tích SERP... (~20 giây)"
"AI đang tạo đề cương... (~15 giây)"
"AI đang viết nội dung... (~30 giây)"
"Đang tính điểm SEO..."
"Đang đồng bộ với WordPress..."
```

---

## 8. Article Status Flow

```
DRAFT → KEYWORD_ANALYZED → OUTLINE_DONE → WRITING → SEO_CHECKED → PUBLISHED
```

| Status | Badge | Màu |
|--------|-------|-----|
| DRAFT | Nháp | #F1F5F9 / #475569 |
| KEYWORD_ANALYZED | Đã phân tích | #EFF6FF / #1D4ED8 |
| OUTLINE_DONE | Có đề cương | #F5F3FF / #6D28D9 |
| WRITING | Đang viết | #FFFBEB / #B45309 |
| SEO_CHECKED | Đã kiểm tra | #EFF6FF / #1D4ED8 |
| PUBLISHED | Đã đăng | #F0FDF4 / #15803D |

---

## 9. Responsive Design

### Breakpoints

```css
/* Desktop (default) */  @media (min-width: 1280px) { }
/* Laptop */             @media (max-width: 1279px) { }
/* Tablet */             @media (max-width: 1023px) { }
/* Mobile */             @media (max-width: 768px)  { }
```

### Mobile Adaptations

- Sidebar: ẩn → hamburger toggle
- Projects grid: 3 cols → 1 col
- Stats cards: 4 cols → 2 cols
- SEO Panel: ẩn → floating button
- Editor toolbar: scroll ngang
- Tables: scroll ngang, sticky column đầu

---

## 10. Vietnamese-specific Design Notes

### Font
- Luôn dùng `subset=latin-ext,vietnamese` khi load Google Fonts
- Fallback: `system-ui` hỗ trợ dấu tốt trên macOS/Windows
- Tiêu đề Việt dài hơn Anh ~15-20% — dùng `min-width` thay `fixed-width` cho button

### Formats
- Ngày: `DD/MM/YYYY` — không dùng `MM/DD/YYYY`
- Số lớn: `3.520 từ` (dấu chấm ngàn) — không dùng dấu phẩy
- Tiền: `$49/tháng` hoặc `490.000 ₫/tháng`

### UX Text
- Hành động: Động từ đứng đầu — "Tạo bài viết", "Phân tích SERP"
- Xác nhận: "Bạn có chắc muốn xóa bài này?"
- Thành công: "Đã lưu thành công!" / "Kết nối thành công!"
- Lỗi: Nêu nguyên nhân — "Lỗi 401: Application Password không đúng"
- Placeholder: Dùng ví dụ cụ thể — "VD: chiến lược content marketing 2024"
- Hint inline quan trọng hơn documentation (người dùng VN ít đọc docs)

---

*Source of truth cho frontend developers và designers. Cập nhật khi có thay đổi.*
