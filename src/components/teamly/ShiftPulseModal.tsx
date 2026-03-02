'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SmileyAngry, Frown, Meh, Smile, SmileyWink } from '@/components/ui/icons'
import { toast } from 'sonner'

interface ShiftPulseModalProps {
  isOpen: boolean
  onSubmitAndClockOut: () => void
  onSkipAndClockOut: () => void
  siteId: string | null
  shiftId?: string | null
}

const RATINGS = [
  { value: 1, label: 'Awful', icon: SmileyAngry, colour: '#EF4444' },
  { value: 2, label: 'Bad', icon: Frown, colour: '#F97316' },
  { value: 3, label: 'Okay', icon: Meh, colour: '#EAB308' },
  { value: 4, label: 'Good', icon: Smile, colour: '#22C55E' },
  { value: 5, label: 'Great', icon: SmileyWink, colour: '#10B981' },
] as const

export default function ShiftPulseModal({
  isOpen,
  onSubmitAndClockOut,
  onSkipAndClockOut,
  siteId,
  shiftId,
}: ShiftPulseModalProps) {
  const [selected, setSelected] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = useCallback(async () => {
    if (selected === null || !siteId) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/teamly/shift-pulse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: selected,
          site_id: siteId,
          shift_id: shiftId || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        // Don't block clock-out on rating failure
        console.warn('[ShiftPulse] Rating submit failed:', data.error)
      }

      toast.success('Thanks for your feedback!', { duration: 1500 })
    } catch (err) {
      // Don't block clock-out on network error
      console.warn('[ShiftPulse] Rating submit error:', err)
    } finally {
      setSubmitting(false)
      setSelected(null)
      onSubmitAndClockOut()
    }
  }, [selected, siteId, shiftId, onSubmitAndClockOut])

  const handleSkip = useCallback(() => {
    setSelected(null)
    onSkipAndClockOut()
  }, [onSkipAndClockOut])

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ minHeight: '100vh' }}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70"
            onClick={handleSkip}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative bg-theme-surface border border-theme rounded-xl shadow-xl max-w-md w-full mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <h2 className="text-lg font-semibold text-theme-primary text-center mb-1">
              How was your shift?
            </h2>
            <p className="text-sm text-theme-tertiary text-center mb-6">
              Tap to rate your shift
            </p>

            {/* Rating icons */}
            <div className="flex items-center justify-center gap-3">
              {RATINGS.map((r) => {
                const Icon = r.icon
                const isSelected = selected === r.value
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setSelected(r.value)}
                    className="flex flex-col items-center gap-1.5 rounded-xl p-2 transition-all duration-150 cursor-pointer"
                    style={{
                      minWidth: 48,
                      minHeight: 48,
                      backgroundColor: isSelected ? `${r.colour}15` : 'transparent',
                      transform: isSelected ? 'scale(1.2)' : 'scale(1)',
                    }}
                  >
                    <Icon
                      weight="duotone"
                      className={`transition-colors duration-150 ${isSelected ? '' : 'text-theme-tertiary'}`}
                      style={{
                        width: 36,
                        height: 36,
                        color: isSelected ? r.colour : undefined,
                      }}
                    />
                    {isSelected && (
                      <span
                        className="text-xs font-medium"
                        style={{ color: r.colour }}
                      >
                        {r.label}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-8">
              <button
                type="button"
                onClick={handleSkip}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 text-sm text-theme-tertiary hover:text-theme-secondary transition-colors rounded-lg"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={selected === null || submitting}
                className={`flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  selected !== null ? 'bg-[#D37E91] hover:bg-[#c46d80]' : 'bg-theme-muted'
                }`}
              >
                {submitting ? 'Submitting...' : 'Submit & Clock Out'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
