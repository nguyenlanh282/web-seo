'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts'

const data = [
  { month: 'Aug', revenue: 4200 },
  { month: 'Sep', revenue: 5800 },
  { month: 'Oct', revenue: 5100 },
  { month: 'Nov', revenue: 7400 },
  { month: 'Dec', revenue: 6900 },
  { month: 'Jan', revenue: 8200 },
  { month: 'Feb', revenue: 9100 },
  { month: 'Mar', revenue: 11400 },
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
        ${payload[0].value.toLocaleString()}
      </p>
    </div>
  )
}

export function RevenueChart() {
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
            Revenue
          </h3>
          <p className="text-xs text-gray-500 font-medium mt-0.5">Last 8 months</p>
        </div>
        <span
          className="nb-badge bg-nb-primary text-white border-black text-xs font-bold"
        >
          +39% YoY
        </span>
      </div>

      {/* Chart */}
      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2196F3" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#2196F3" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke="#E2E8F0" />
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
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#2196F3"
              strokeWidth={3}
              fill="url(#revenueGrad)"
              dot={{ fill: '#2196F3', stroke: '#000', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#000', strokeWidth: 2, fill: '#FFEB3B' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
