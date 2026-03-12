'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

const data = [
  { month: 'Aug', users: 320 },
  { month: 'Sep', users: 480 },
  { month: 'Oct', users: 410 },
  { month: 'Nov', users: 620 },
  { month: 'Dec', users: 580 },
  { month: 'Jan', users: 710 },
  { month: 'Feb', users: 830 },
  { month: 'Mar', users: 1040 },
]

const ACCENT_COLORS = [
  '#FFEB3B', '#2196F3', '#FF5252', '#00C853',
  '#AA00FF', '#F59E0B', '#FF4081', '#2196F3',
]

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="bg-white border-[3px] border-black rounded-lg px-3 py-2"
      style={{ boxShadow: '4px 4px 0 #000', fontFamily: 'var(--nb-font-heading)' }}
    >
      <p className="text-xs font-bold text-gray-500 uppercase">{label}</p>
      <p className="text-lg font-bold text-[#0D0D0D]">
        {payload[0].value.toLocaleString()} users
      </p>
    </div>
  )
}

export function UserGrowthChart() {
  return (
    <div
      className="nb-card-static bg-nb-bg p-5 flex flex-col gap-4"
      style={{ fontFamily: 'var(--nb-font-body)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3
            className="text-base font-bold text-[#0D0D0D] uppercase tracking-wide"
            style={{ fontFamily: 'var(--nb-font-heading)' }}
          >
            User Growth
          </h3>
          <p className="text-xs text-gray-500 font-medium mt-0.5">New signups per month</p>
        </div>
        <span className="nb-badge bg-nb-yellow border-black text-[#0D0D0D] text-xs font-bold">
          +1,040 this month
        </span>
      </div>

      {/* Chart */}
      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barCategoryGap="28%">
            <CartesianGrid strokeDasharray="4 4" stroke="#E2E8F0" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fontFamily: 'Fira Code', fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fontFamily: 'Fira Code', fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
            <Bar dataKey="users" radius={[4, 4, 0, 0]}>
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={ACCENT_COLORS[index % ACCENT_COLORS.length]}
                  stroke="#000"
                  strokeWidth={2}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
