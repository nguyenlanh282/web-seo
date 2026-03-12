'use client'

import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

type SortDir = 'asc' | 'desc' | null

interface Transaction {
  id: string
  user: string
  plan: string
  amount: number
  status: 'paid' | 'pending' | 'failed'
  date: string
}

const SAMPLE_DATA: Transaction[] = [
  { id: 'TXN-001', user: 'Nguyen Van A', plan: 'Pro', amount: 29, status: 'paid', date: '2026-03-12' },
  { id: 'TXN-002', user: 'Tran Thi B', plan: 'Starter', amount: 9, status: 'paid', date: '2026-03-11' },
  { id: 'TXN-003', user: 'Le Van C', plan: 'Enterprise', amount: 99, status: 'pending', date: '2026-03-11' },
  { id: 'TXN-004', user: 'Pham Thi D', plan: 'Pro', amount: 29, status: 'paid', date: '2026-03-10' },
  { id: 'TXN-005', user: 'Hoang Van E', plan: 'Pro', amount: 29, status: 'failed', date: '2026-03-10' },
  { id: 'TXN-006', user: 'Vu Thi F', plan: 'Starter', amount: 9, status: 'paid', date: '2026-03-09' },
  { id: 'TXN-007', user: 'Dang Van G', plan: 'Enterprise', amount: 99, status: 'paid', date: '2026-03-09' },
  { id: 'TXN-008', user: 'Bui Thi H', plan: 'Pro', amount: 29, status: 'pending', date: '2026-03-08' },
]

const STATUS_CONFIG = {
  paid:    { label: 'Paid',    bg: 'bg-green-200 border-green-700 text-green-800' },
  pending: { label: 'Pending', bg: 'bg-yellow-200 border-yellow-600 text-yellow-800' },
  failed:  { label: 'Failed',  bg: 'bg-red-200 border-red-700 text-red-800' },
}

type SortKey = keyof Transaction

function SortIcon({ dir }: { dir: SortDir }) {
  if (dir === 'asc') return <ChevronUp className="w-3.5 h-3.5" />
  if (dir === 'desc') return <ChevronDown className="w-3.5 h-3.5" />
  return <ChevronsUpDown className="w-3.5 h-3.5 opacity-40" />
}

export function DataTable() {
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : d === 'desc' ? null : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = useMemo(() => {
    if (!sortDir) return SAMPLE_DATA
    return [...SAMPLE_DATA].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av
      }
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av))
    })
  }, [sortKey, sortDir])

  const columns: { key: SortKey; label: string; align?: 'right' }[] = [
    { key: 'id',     label: 'ID' },
    { key: 'user',   label: 'User' },
    { key: 'plan',   label: 'Plan' },
    { key: 'amount', label: 'Amount', align: 'right' },
    { key: 'status', label: 'Status' },
    { key: 'date',   label: 'Date' },
  ]

  return (
    <div
      className="nb-card-static bg-nb-bg p-5 flex flex-col gap-4"
      style={{ fontFamily: 'var(--nb-font-body)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3
          className="text-base font-bold text-[#0D0D0D] uppercase tracking-wide"
          style={{ fontFamily: 'var(--nb-font-heading)' }}
        >
          Recent Transactions
        </h3>
        <span
          className="nb-badge bg-nb-primary text-white border-black text-xs font-bold"
        >
          {SAMPLE_DATA.length} records
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-5 px-5">
        <table className="w-full text-sm border-collapse" role="table">
          <thead>
            <tr className="border-b-[3px] border-black">
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`pb-2 pr-4 text-xs font-bold uppercase tracking-wide text-[#0D0D0D] whitespace-nowrap cursor-pointer select-none hover:text-nb-primary transition-colors duration-150 ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                  onClick={() => handleSort(col.key)}
                  style={{ fontFamily: 'var(--nb-font-heading)' }}
                  aria-sort={
                    sortKey === col.key
                      ? sortDir === 'asc' ? 'ascending' : sortDir === 'desc' ? 'descending' : 'none'
                      : 'none'
                  }
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    <SortIcon dir={sortKey === col.key ? sortDir : null} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr
                key={row.id}
                className={`border-b border-black/10 hover:bg-nb-yellow/20 transition-colors duration-150 ${i % 2 === 0 ? '' : 'bg-black/[0.02]'}`}
              >
                <td className="py-2.5 pr-4 font-mono text-xs text-gray-500">{row.id}</td>
                <td className="py-2.5 pr-4 font-semibold text-[#0D0D0D] whitespace-nowrap">{row.user}</td>
                <td className="py-2.5 pr-4">
                  <span className="nb-badge bg-nb-primary/10 border-nb-primary text-nb-primary text-xs font-bold">
                    {row.plan}
                  </span>
                </td>
                <td className="py-2.5 pr-4 text-right font-bold" style={{ fontFamily: 'var(--nb-font-heading)' }}>
                  ${row.amount}
                </td>
                <td className="py-2.5 pr-4">
                  <span className={`nb-badge text-xs font-bold ${STATUS_CONFIG[row.status].bg}`}>
                    {STATUS_CONFIG[row.status].label}
                  </span>
                </td>
                <td className="py-2.5 font-mono text-xs text-gray-500">{row.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
