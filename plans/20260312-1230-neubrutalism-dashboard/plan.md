# Neubrutalism SaaS Dashboard — Implementation Plan
**Date:** 2026-03-12 | **Priority:** Medium | **Status:** In Progress

## Overview
Redesign the existing `apps/web` dashboard with a Bold & Playful Neubrutalism design system, adding charts (Recharts) and enhanced data visualizations while preserving all existing API integrations.

## Phases

| # | Phase | Status | File |
|---|-------|--------|------|
| 1 | Dependencies | ✅ Done | — |
| 2 | Plan | ✅ Done | this file |
| 3 | Layout (sidebar + topnav) | 🔄 In Progress | [phase-03](./phase-03-layout.md) |
| 4 | Dashboard components | ⏳ Pending | [phase-04](./phase-04-components.md) |
| 5 | Dashboard page | ⏳ Pending | [phase-05](./phase-05-page.md) |
| 6 | Typecheck + polish | ⏳ Pending | [phase-06](./phase-06-polish.md) |

## Design System
- **Style:** Neubrutalism — `border: 3px solid #000`, `box-shadow: 5px 5px 0 #000`
- **Colors:** `#2196F3` primary, `#FFEB3B` yellow, `#FF5252` red, `#FFFEF0` bg, `#F59E0B` CTA
- **Fonts:** Fira Code (headings/numbers) + Fira Sans (body) via Google Fonts
- **Icons:** `lucide-react` only
- **Charts:** `recharts`
- **Animation:** `framer-motion` with `prefers-reduced-motion` support

## Files Modified
- `apps/web/src/app/(dashboard)/layout.tsx`
- `apps/web/src/app/(dashboard)/dashboard/page.tsx`
- `apps/web/src/app/globals.css`
- `apps/web/tailwind.config.ts`

## Files Created
- `apps/web/src/components/dashboard/kpi-card.tsx`
- `apps/web/src/components/dashboard/revenue-chart.tsx`
- `apps/web/src/components/dashboard/user-growth-chart.tsx`
- `apps/web/src/components/dashboard/activity-feed.tsx`
- `apps/web/src/components/dashboard/data-table.tsx`
