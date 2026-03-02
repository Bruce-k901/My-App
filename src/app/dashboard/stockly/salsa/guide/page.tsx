// @salsa - SALSA Compliance: How-to guide page wrapper
'use client'

import { BookOpen, Printer } from '@/components/ui/icons'
import SALSAGuideContent from '@/components/guides/SALSAGuideContent'

export default function SALSAGuidePage() {
  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 guide-no-print">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-stockly/20 border border-stockly/30">
            <BookOpen className="w-5 h-5 text-stockly dark:text-stockly" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-theme-primary">SALSA Compliance Guide</h1>
            <p className="text-sm text-theme-tertiary">Stockly &mdash; How to use the SALSA system</p>
          </div>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-theme-muted/30 hover:bg-theme-muted/50 text-theme-secondary transition-colors"
        >
          <Printer className="w-4 h-4" />
          <span className="hidden sm:inline">Print / Save PDF</span>
        </button>
      </div>

      {/* Guide Content */}
      <SALSAGuideContent />
    </div>
  )
}
