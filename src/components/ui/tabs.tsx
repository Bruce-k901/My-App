'use client'

import React from 'react'

interface TabsProps {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
  className?: string
}

export function Tabs({ value, onValueChange, children, className = '' }: TabsProps) {
  return (
    <div className={className} data-active-tab={value}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, { _activeTab: value, _onTabChange: onValueChange })
        }
        return child
      })}
    </div>
  )
}

interface TabsListProps {
  children: React.ReactNode
  className?: string
  _activeTab?: string
  _onTabChange?: (value: string) => void
}

export function TabsList({ children, className = '', _activeTab, _onTabChange }: TabsListProps) {
  return (
    <div className={`flex gap-1 rounded-lg bg-gray-100 dark:bg-white/[0.05] p-1 ${className}`}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, { _activeTab, _onTabChange })
        }
        return child
      })}
    </div>
  )
}

interface TabsTriggerProps {
  value: string
  children: React.ReactNode
  className?: string
  _activeTab?: string
  _onTabChange?: (value: string) => void
}

export function TabsTrigger({ value, children, className = '', _activeTab, _onTabChange }: TabsTriggerProps) {
  const isActive = _activeTab === value
  return (
    <button
      type="button"
      onClick={() => _onTabChange?.(value)}
      className={`
        px-3 py-1.5 text-sm font-medium rounded-md transition-colors
        ${isActive
          ? 'bg-white dark:bg-white/[0.1] text-theme-primary shadow-sm'
          : 'text-theme-tertiary hover:text-theme-secondary dark:hover:text-theme-secondary'
        }
        ${className}
      `}
    >
      {children}
    </button>
  )
}

interface TabsContentProps {
  value: string
  children: React.ReactNode
  className?: string
  _activeTab?: string
}

export function TabsContent({ value, children, className = '', _activeTab }: TabsContentProps) {
  if (_activeTab !== value) return null
  return <div className={className}>{children}</div>
}
