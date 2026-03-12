'use client'

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  FileText,
  CheckCircle2,
  User,
  Zap,
  Globe,
  Star,
} from 'lucide-react'

interface ActivityItem {
  id: string
  type: 'article' | 'user' | 'publish' | 'upgrade' | 'integration' | 'milestone'
  title: string
  description: string
  time: string
}

const SAMPLE_ACTIVITIES: ActivityItem[] = [
  {
    id: '1',
    type: 'article',
    title: 'New article created',
    description: '"10 Best SEO Practices for 2026"',
    time: '2 min ago',
  },
  {
    id: '2',
    type: 'user',
    title: 'New user signed up',
    description: 'nguyen.thi.lan@example.com',
    time: '8 min ago',
  },
  {
    id: '3',
    type: 'publish',
    title: 'Article published',
    description: '"AI Writing Tools: Complete Guide"',
    time: '23 min ago',
  },
  {
    id: '4',
    type: 'upgrade',
    title: 'Plan upgraded',
    description: 'user@startup.io → Pro plan',
    time: '1 hr ago',
  },
  {
    id: '5',
    type: 'integration',
    title: 'WordPress connected',
    description: 'myblog.wordpress.com',
    time: '2 hr ago',
  },
  {
    id: '6',
    type: 'milestone',
    title: '1,000 articles milestone!',
    description: 'Platform reached 1,000 published articles',
    time: '3 hr ago',
  },
]

const TYPE_CONFIG = {
  article: { icon: FileText, bg: 'bg-nb-primary', color: 'text-white' },
  user: { icon: User, bg: 'bg-nb-yellow', color: 'text-black' },
  publish: { icon: CheckCircle2, bg: 'bg-green-400', color: 'text-black' },
  upgrade: { icon: Zap, bg: 'bg-nb-cta', color: 'text-black' },
  integration: { icon: Globe, bg: 'bg-purple-400', color: 'text-black' },
  milestone: { icon: Star, bg: 'bg-nb-red', color: 'text-white' },
}

export function ActivityFeed() {
  const prefersReduced = useReducedMotion()

  return (
    <div
      className="nb-card-static bg-nb-bg p-5 flex flex-col gap-4 h-full"
      style={{ fontFamily: 'var(--nb-font-body)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3
          className="text-base font-bold text-[#0D0D0D] uppercase tracking-wide"
          style={{ fontFamily: 'var(--nb-font-heading)' }}
        >
          Activity Feed
        </h3>
        <span className="nb-badge bg-nb-green border-black text-black text-xs font-bold">
          Live
        </span>
      </div>

      {/* Feed */}
      <ol className="flex flex-col gap-0 flex-1 overflow-y-auto" aria-label="Recent activity">
        <AnimatePresence initial={false}>
          {SAMPLE_ACTIVITIES.map((item, i) => {
            const cfg = TYPE_CONFIG[item.type]
            const Icon = cfg.icon
            return (
              <motion.li
                key={item.id}
                className="flex gap-3 group"
                initial={prefersReduced ? false : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: prefersReduced ? 0 : i * 0.05, duration: 0.2 }}
              >
                {/* Timeline line + dot */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-lg border-[2px] border-black flex items-center justify-center shrink-0 ${cfg.bg}`}
                    style={{ boxShadow: '2px 2px 0 #000' }}
                  >
                    <Icon className={`w-4 h-4 ${cfg.color}`} aria-hidden="true" />
                  </div>
                  {i < SAMPLE_ACTIVITIES.length - 1 && (
                    <div className="w-0.5 flex-1 bg-gray-200 my-1" />
                  )}
                </div>

                {/* Content */}
                <div className="pb-4 flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#0D0D0D] leading-snug">
                    {item.title}
                  </p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {item.description}
                  </p>
                  <p className="text-[10px] font-mono text-gray-400 mt-1">{item.time}</p>
                </div>
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ol>
    </div>
  )
}
