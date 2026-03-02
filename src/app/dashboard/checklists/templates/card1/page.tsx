'use client'

import { useState } from 'react'
import { ChevronLeft, Save, Calendar, Clock, Thermometer, Camera } from '@/components/ui/icons'
import { useRouter } from 'next/navigation'

const DAYPARTS = [
  { value: 'before_open', label: 'Before Open', times: ['06:00', '07:00', '08:00', '08:30', '09:00'] },
  { value: 'during_service', label: 'During Service', times: ['11:00', '12:00', '13:00', '14:00', '15:00'] },
  { value: 'afternoon', label: 'Afternoon', times: ['15:00', '16:00', '17:00'] },
  { value: 'after_service', label: 'After Service', times: ['21:00', '22:00', '23:00'] },
  { value: 'anytime', label: 'Anytime', times: ['10:00-11:00', 'Flexible'] }
]

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' }
]

const MONTHS = [
  { value: 'jan', label: 'January' },
  { value: 'feb', label: 'February' },
  { value: 'mar', label: 'March' },
  { value: 'apr', label: 'April' },
  { value: 'may', label: 'May' },
  { value: 'jun', label: 'June' },
  { value: 'jul', label: 'July' },
  { value: 'aug', label: 'August' },
  { value: 'sep', label: 'September' },
  { value: 'oct', label: 'October' },
  { value: 'nov', label: 'November' },
  { value: 'dec', label: 'December' }
]

export default function Card1ConfigPage() {
  const router = useRouter()
  
  const [frequency, setFrequency] = useState('daily')
  const [selectedDays, setSelectedDays] = useState<string[]>(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
  const [selectedDayparts, setSelectedDayparts] = useState<string[]>(['before_open', 'during_service', 'afternoon'])
  const [daypartTimes, setDaypartTimes] = useState<Record<string, string>>({
    before_open: '06:00',
    during_service: '13:00',
    afternoon: '17:00'
  })
  const [selectedMonths, setSelectedMonths] = useState<string[]>(MONTHS.map(m => m.value))
  const [repeatableItems, setRepeatableItems] = useState([
    'Walk-in Chiller',
    'Display Fridge A',
    'Display Fridge B',
    'Reach-in Fridge',
    'Freezer 1'
  ])

  const toggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    )
  }

  const toggleDaypart = (daypart: string) => {
    setSelectedDayparts(prev => 
      prev.includes(daypart)
        ? prev.filter(d => d !== daypart)
        : [...prev, daypart]
    )
  }

  const setDaypartTime = (daypart: string, time: string) => {
    setDaypartTimes(prev => ({ ...prev, [daypart]: time }))
  }

  const toggleMonth = (month: string) => {
    setSelectedMonths(prev =>
      prev.includes(month)
        ? prev.filter(m => m !== month)
        : [...prev, month]
    )
  }

  const addRepeatableItem = () => {
    setRepeatableItems(prev => [...prev, 'New Fridge'])
  }

  const removeRepeatableItem = (index: number) => {
    setRepeatableItems(prev => prev.filter((_, i) => i !== index))
  }

  const updateRepeatableItem = (index: number, value: string) => {
    setRepeatableItems(prev => prev.map((item, i) => i === index ? value : item))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="text-theme-tertiary hover:text-white transition-all"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-module-fg/[0.25] to-blue-600/20 bg-clip-text text-transparent">
            Configure: Fridge & Freezer Temperature Check
          </h1>
          <p className="text-theme-tertiary mt-1">Card 1 - Cold Hold Compliance</p>
        </div>
      </div>

      {/* Frequency Selection */}
      <div className="bg-neutral-800/50 border border-theme rounded-lg p-6">
        <h2 className="text-lg font-semibold text-theme-primary mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-theme-tertiary" />
          Frequency
        </h2>
        <div className="flex gap-2">
          {['daily', 'weekly', 'monthly', 'custom'].map(freq => (
            <button
              key={freq}
              onClick={() => setFrequency(freq)}
              className={`px-4 py-2 rounded-lg transition-all ${
                frequency === freq
                  ? 'bg-gradient-to-r from-module-fg/[0.70] to-assetly-dark/70 text-white'
                  : 'bg-neutral-700 text-theme-tertiary hover:bg-neutral-600'
              }`}
            >
              {freq.charAt(0).toUpperCase() + freq.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Days of Week Selection */}
      <div className="bg-neutral-800/50 border border-theme rounded-lg p-6">
        <h2 className="text-lg font-semibold text-theme-primary mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-theme-tertiary" />
          Days of Week
        </h2>
        <div className="flex flex-wrap gap-2">
          {DAYS_OF_WEEK.map(day => (
            <button
              key={day.value}
              onClick={() => toggleDay(day.value)}
              className={`px-3 py-2 rounded-lg transition-all ${
                selectedDays.includes(day.value)
                  ? 'bg-module-fg/[0.70] text-white'
                  : 'bg-neutral-700 text-theme-tertiary hover:bg-neutral-600'
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setSelectedDays(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])}
            className="text-sm text-theme-tertiary hover:text-theme-tertiary"
          >
            Weekdays
          </button>
          <button
            onClick={() => setSelectedDays(['saturday', 'sunday'])}
            className="text-sm text-theme-tertiary hover:text-theme-tertiary"
          >
            Weekends
          </button>
          <button
            onClick={() => setSelectedDays(DAYS_OF_WEEK.map(d => d.value))}
            className="text-sm text-theme-tertiary hover:text-theme-tertiary"
          >
            All Days
          </button>
        </div>
      </div>

      {/* Dayparts & Times */}
      <div className="bg-neutral-800/50 border border-theme rounded-lg p-6">
        <h2 className="text-lg font-semibold text-theme-primary mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-theme-tertiary" />
          Dayparts & Times
        </h2>
        <div className="space-y-4">
          {DAYPARTS.map(daypart => (
            <div key={daypart.value} className="border border-theme rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedDayparts.includes(daypart.value)}
                    onChange={() => toggleDaypart(daypart.value)}
                    className="rounded border-neutral-600"
                  />
                  <span className="text-theme-primary font-medium">{daypart.label}</span>
                </label>
                {selectedDayparts.includes(daypart.value) && (
                  <select
                    value={daypartTimes[daypart.value] || daypart.times[0]}
                    onChange={(e) => setDaypartTime(daypart.value, e.target.value)}
                    className="px-3 py-1 bg-neutral-700 border border-neutral-600 rounded text-theme-primary text-sm focus:outline-none focus:border-module-fg"
                  >
                    {daypart.times.map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Month/Year Selection */}
      <div className="bg-neutral-800/50 border border-theme rounded-lg p-6">
        <h2 className="text-lg font-semibold text-theme-primary mb-4">Month/Year</h2>
        <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
          {MONTHS.map(month => (
            <button
              key={month.value}
              onClick={() => toggleMonth(month.value)}
              className={`px-3 py-2 rounded-lg transition-all text-sm ${
                selectedMonths.includes(month.value)
                  ? 'bg-module-fg/[0.70] text-white'
                  : 'bg-neutral-700 text-theme-tertiary hover:bg-neutral-600'
              }`}
            >
              {month.label}
            </button>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setSelectedMonths(MONTHS.map(m => m.value))}
            className="text-sm text-theme-tertiary hover:text-theme-tertiary"
          >
            Year-round
          </button>
          <button
            onClick={() => setSelectedMonths(['may', 'jun', 'jul', 'aug', 'sep'])}
            className="text-sm text-theme-tertiary hover:text-theme-tertiary"
          >
            Summer (May-Sept)
          </button>
          <button
            onClick={() => setSelectedMonths(['oct', 'nov', 'dec', 'jan', 'feb', 'mar', 'apr'])}
            className="text-sm text-theme-tertiary hover:text-theme-tertiary"
          >
            Winter (Oct-Apr)
          </button>
        </div>
      </div>

      {/* Repeatable Items */}
      <div className="bg-neutral-800/50 border border-theme rounded-lg p-6">
        <h2 className="text-lg font-semibold text-theme-primary mb-4 flex items-center gap-2">
          <Thermometer className="h-5 w-5 text-theme-tertiary" />
          Fridge Names (Repeatable)
        </h2>
        <div className="space-y-2">
          {repeatableItems.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={item}
                onChange={(e) => updateRepeatableItem(index, e.target.value)}
                className="flex-1 px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-theme-primary placeholder-neutral-500 focus:outline-none focus:border-module-fg"
                placeholder="Fridge name"
              />
              <button
                onClick={() => removeRepeatableItem(index)}
                className="px-3 py-2 bg-red-600/20 text-red-400 rounded hover:bg-red-600/30 transition-all"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addRepeatableItem}
          className="mt-4 px-4 py-2 bg-neutral-700 text-theme-tertiary rounded-lg hover:bg-neutral-600 transition-all"
        >
          + Add Fridge
        </button>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <button
          onClick={() => router.back()}
          className="px-6 py-3 bg-neutral-700 text-theme-primary rounded-lg hover:bg-neutral-600 transition-all"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            console.log('Saving configuration:', {
              frequency,
              selectedDays,
              selectedDayparts,
              daypartTimes,
              selectedMonths,
              repeatableItems
            })
            // TODO: Save to database
          }}
          className="px-6 py-3 bg-gradient-to-r from-module-fg/[0.70] to-assetly-dark/70 text-white rounded-lg hover:shadow-lg hover:shadow-module-fg/[0.30] transition-all font-medium flex items-center gap-2"
        >
          <Save className="h-5 w-5" />
          Save Configuration
        </button>
      </div>
    </div>
  )
}
