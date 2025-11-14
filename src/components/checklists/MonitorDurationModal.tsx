'use client'

import { useState } from 'react'
import { X, Clock, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface MonitorDurationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (durationMinutes: number) => void
  assetName?: string
}

export default function MonitorDurationModal({
  isOpen,
  onClose,
  onConfirm
}: MonitorDurationModalProps) {
  const [selectedDuration, setSelectedDuration] = useState<number>(30)

  if (!isOpen) return null

  // Generate time options: 30min, 1hr, 1.5hr, 2hr (in minutes)
  const durationOptions = [30, 60, 90, 120]

  const formatDuration = (minutes: number) => {
    if (minutes === 30) return '30 minutes'
    if (minutes === 60) return '1 hour'
    if (minutes === 90) return '1.5 hours'
    if (minutes === 120) return '2 hours'
    return `${minutes} minutes`
  }

  const handleConfirm = () => {
    onConfirm(selectedDuration)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 border border-white/[0.06] rounded-xl max-w-md w-full">
        {/* Header */}
        <div className="border-b border-white/[0.06] p-4 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <Clock className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Schedule Monitoring</h2>
              <p className="text-sm text-neutral-400 mt-1">
                Set follow-up check duration
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-white mb-4">
              Re-evaluation Required In:
            </label>
            <div className="grid grid-cols-2 gap-3">
              {durationOptions.map((duration) => (
                <button
                  key={duration}
                  onClick={() => setSelectedDuration(duration)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    selectedDuration === duration
                      ? 'border-orange-500 bg-orange-500/10'
                      : 'border-white/[0.06] bg-white/[0.03] hover:border-orange-500/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{formatDuration(duration)}</p>
                    </div>
                    {selectedDuration === duration && (
                      <Check className="h-5 w-5 text-orange-400" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-4">
            <p className="text-sm text-orange-300/80">
              A monitoring task will be created for today. You'll be notified when it's due for re-evaluation.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/[0.06] p-4 sm:p-6 flex gap-3">
          <Button
            onClick={handleConfirm}
            className="flex-1 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
          >
            <Check className="h-5 w-5" />
            Confirm & Create Task
          </Button>
          <Button
            onClick={onClose}
            className="px-6 py-3 bg-white/[0.03] border border-white/[0.06] text-white/90 rounded-lg hover:bg-white/[0.06] transition-all"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}

