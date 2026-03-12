'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react'

interface KpiCardProps {
  title: string
  value: string | number
  trend?: number        // percentage change, positive = up, negative = down
  trendLabel?: string   // e.g. "vs last month"
  icon: LucideIcon
  accentColor?: string  // tailwind bg class e.g. "bg-nb-yellow"
  prefix?: string
  suffix?: string
}

export function KpiCard({
  title,
  value,
  trend,
  trendLabel = 'vs last month',
  icon: Icon,
  accentColor = 'bg-nb-yellow',
  prefix = '',
  suffix = '',
}: KpiCardProps) {
  const prefersReduced = useReducedMotion()
  const isUp = trend !== undefined && trend > 0
  const isDown = trend !== undefined && trend < 0
  const isFlat = trend === 0

  return (
    <motion.div
      className="nb-card p-5 bg-nb-bg flex flex-col gap-3 cursor-default"
      initial={prefersReduced ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      whileHover={prefersReduced ? undefined : { x: -2, y: -2 }}
      style={{
        fontFamily: 'var(--nb-font-body)',
      }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-[#0D0D0D] uppercase tracking-wide leading-tight">
          {title}
        </p>
        <div
          className={`${accentColor} w-10 h-10 rounded-lg border-[3px] border-black flex items-center justify-center shrink-0`}
          style={{ boxShadow: '2px 2px 0 #000' }}
        >
          <Icon className="w-5 h-5 text-black" aria-hidden="true" />
        </div>
      </div>

      {/* Value */}
      <p
        className="text-3xl font-bold text-[#0D0D0D] leading-none"
        style={{ fontFamily: 'var(--nb-font-heading)' }}
      >
        {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
      </p>

      {/* Trend */}
      {trend !== undefined && (
        <div className="flex items-center gap-1.5 mt-auto">
          <span
            className={`nb-badge text-xs font-bold ${
              isUp
                ? 'bg-green-200 border-green-700 text-green-800'
                : isDown
                ? 'bg-red-200 border-red-700 text-red-800'
                : 'bg-gray-200 border-gray-600 text-gray-700'
            }`}
          >
            {isUp && <TrendingUp className="w-3 h-3 mr-0.5 inline" />}
            {isDown && <TrendingDown className="w-3 h-3 mr-0.5 inline" />}
            {isFlat && <Minus className="w-3 h-3 mr-0.5 inline" />}
            {isUp ? '+' : ''}{trend}%
          </span>
          <span className="text-xs text-gray-500 font-medium">{trendLabel}</span>
        </div>
      )}
    </motion.div>
  )
}
