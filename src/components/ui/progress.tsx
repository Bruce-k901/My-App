'use client'

interface ProgressProps {
  value: number
  max?: number
  className?: string
  barClassName?: string
}

export function Progress({ value, max = 100, className = '', barClassName = '' }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div className={`w-full bg-gray-200 dark:bg-white/[0.06] rounded-full h-2 overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${barClassName || 'bg-emerald-500'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
