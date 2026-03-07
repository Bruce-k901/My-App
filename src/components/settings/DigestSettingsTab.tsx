"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAppContext } from '@/context/AppContext'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Mail, CheckCircle, AlertCircle, Save, Loader2 } from '@/components/ui/icons'

interface DigestPreferences {
  digest_enabled: boolean
  digest_include_compliance: boolean
  digest_include_staff: boolean
  digest_include_stock: boolean
  digest_include_assets: boolean
  digest_include_calendar: boolean
}

const SECTION_DESCRIPTIONS = {
  compliance: 'Compliance rate, missed tasks, overdue items, temperature failures, incidents',
  staff: 'Sickness, holiday requests, upcoming reviews, unfilled shifts, pending training',
  stock: 'Expiring items, sales revenue, GP, top sellers, revenue streams',
  assets: 'Pending callouts, out of commission equipment',
  calendar: 'Today\'s meetings, reviews, and scheduled events',
}

export function DigestSettingsTab() {
  const { profile, userId } = useAppContext()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [preferences, setPreferences] = useState<DigestPreferences>({
    digest_enabled: true,
    digest_include_compliance: true,
    digest_include_staff: true,
    digest_include_stock: true,
    digest_include_assets: true,
    digest_include_calendar: true,
  })

  useEffect(() => {
    if (profile) {
      setPreferences({
        digest_enabled: profile.digest_enabled ?? true,
        digest_include_compliance: profile.digest_include_compliance ?? true,
        digest_include_staff: profile.digest_include_staff ?? true,
        digest_include_stock: profile.digest_include_stock ?? true,
        digest_include_assets: profile.digest_include_assets ?? true,
        digest_include_calendar: profile.digest_include_calendar ?? true,
      })
      setLoading(false)
    }
  }, [profile])

  const handleSave = async () => {
    if (!userId) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update(preferences)
        .eq('auth_user_id', userId)

      if (error) throw error

      toast.success('Digest preferences saved')
    } catch (err: any) {
      console.error('Failed to save digest preferences:', err)
      toast.error('Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  const toggleSection = (section: keyof DigestPreferences) => {
    setPreferences(prev => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  const enabledSections = [
    preferences.digest_include_compliance,
    preferences.digest_include_staff,
    preferences.digest_include_stock,
    preferences.digest_include_assets,
    preferences.digest_include_calendar,
  ].filter(Boolean).length

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-theme-text mb-2">Daily Ops Summary</h2>
        <p className="text-theme-text-muted text-sm">
          Customize what you receive in your daily operations summary email.
          This email is sent every morning with yesterday's activity and today's priorities.
        </p>
      </div>

      {/* Master toggle */}
      <div className="bg-theme-surface border border-theme rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-theme-text mb-1">Receive Daily Summary</h3>
              <p className="text-sm text-theme-text-muted">
                Get a daily operations summary email every morning at 6:00 AM UTC
              </p>
            </div>
          </div>
          <button
            onClick={() => toggleSection('digest_enabled')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              preferences.digest_enabled ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                preferences.digest_enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {preferences.digest_enabled && (
          <div className="mt-4 pt-4 border-t border-theme">
            <div className="flex items-center gap-2 text-sm text-theme-text-muted">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Enabled • {enabledSections} section{enabledSections !== 1 ? 's' : ''} active</span>
            </div>
          </div>
        )}
      </div>

      {/* Section toggles */}
      {preferences.digest_enabled && (
        <div className="space-y-3">
          <h3 className="font-semibold text-theme-text text-sm uppercase tracking-wide">
            Email Sections
          </h3>

          {/* Compliance */}
          <div className="bg-theme-surface border border-theme rounded-lg p-4 hover:border-checkly/30 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full bg-checkly" />
                  <h4 className="font-semibold text-theme-text">Compliance</h4>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-medium">
                    Critical
                  </span>
                </div>
                <p className="text-sm text-theme-text-muted ml-5">
                  {SECTION_DESCRIPTIONS.compliance}
                </p>
              </div>
              <button
                onClick={() => toggleSection('digest_include_compliance')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  preferences.digest_include_compliance ? 'bg-checkly' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    preferences.digest_include_compliance ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Staff */}
          <div className="bg-theme-surface border border-theme rounded-lg p-4 hover:border-teamly/30 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full bg-teamly" />
                  <h4 className="font-semibold text-theme-text">People</h4>
                </div>
                <p className="text-sm text-theme-text-muted ml-5">
                  {SECTION_DESCRIPTIONS.staff}
                </p>
              </div>
              <button
                onClick={() => toggleSection('digest_include_staff')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  preferences.digest_include_staff ? 'bg-teamly' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    preferences.digest_include_staff ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Stock & Sales */}
          <div className="bg-theme-surface border border-theme rounded-lg p-4 hover:border-stockly/30 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full bg-stockly" />
                  <h4 className="font-semibold text-theme-text">Stock & Sales</h4>
                </div>
                <p className="text-sm text-theme-text-muted ml-5">
                  {SECTION_DESCRIPTIONS.stock}
                </p>
              </div>
              <button
                onClick={() => toggleSection('digest_include_stock')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  preferences.digest_include_stock ? 'bg-stockly' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    preferences.digest_include_stock ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Assets */}
          <div className="bg-theme-surface border border-theme rounded-lg p-4 hover:border-assetly/30 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full bg-assetly" />
                  <h4 className="font-semibold text-theme-text">Assets</h4>
                </div>
                <p className="text-sm text-theme-text-muted ml-5">
                  {SECTION_DESCRIPTIONS.assets}
                </p>
              </div>
              <button
                onClick={() => toggleSection('digest_include_assets')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  preferences.digest_include_assets ? 'bg-assetly' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    preferences.digest_include_assets ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Calendar */}
          <div className="bg-theme-surface border border-theme rounded-lg p-4 hover:border-gray-400/30 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full bg-gray-500" />
                  <h4 className="font-semibold text-theme-text">Your Schedule</h4>
                </div>
                <p className="text-sm text-theme-text-muted ml-5">
                  {SECTION_DESCRIPTIONS.calendar}
                </p>
              </div>
              <button
                onClick={() => toggleSection('digest_include_calendar')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  preferences.digest_include_calendar ? 'bg-gray-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    preferences.digest_include_calendar ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview info */}
      {preferences.digest_enabled && enabledSections === 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-900 dark:text-amber-200 mb-1">
                No sections enabled
              </h4>
              <p className="text-sm text-amber-800 dark:text-amber-300">
                You'll receive an email, but it will only show "All Clear" if there's no activity.
                Enable at least one section to see relevant data.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Save button */}
      <div className="flex items-center justify-between pt-4 border-t border-theme">
        <p className="text-sm text-theme-text-muted">
          Changes take effect from tomorrow's digest
        </p>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Preferences
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
