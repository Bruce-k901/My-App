'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createPortal } from 'react-dom'
import { useAppContext } from '@/context/AppContext'
import {
  X,
  Building,
  FileText,
  Shield,
  Target,
  Bell,
  BarChart,
  TrendingUp,
  Settings,
  CreditCard,
  HelpCircle,
  LogOut,
  ChevronRight,
  User,
} from 'lucide-react'

interface MobileBurgerMenuProps {
  isOpen: boolean
  onClose: () => void
  user: { name: string; email: string; role: string }
  onSignOut: () => void
}

export function MobileBurgerMenu({
  isOpen,
  onClose,
  user,
  onSignOut,
}: MobileBurgerMenuProps) {
  const pathname = usePathname()
  const { profile, user: contextUser, signOut } = useAppContext()
  const [mounted, setMounted] = useState(false)
  
  // Get user info
  const userName = user?.name || 
    profile?.full_name || 
    (profile?.first_name && profile?.last_name 
      ? `${profile.first_name} ${profile.last_name}` 
      : profile?.email?.split('@')[0] || 'User')
  const userEmail = user?.email || profile?.email || contextUser?.email || ''
  const userRole = user?.role || 'Team'
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Close menu on escape key
  useEffect(() => {
    if (!isOpen) return
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])
  
  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])
  
  if (!mounted || !isOpen) return null
  
  const handleSignOut = async () => {
    onClose()
    if (onSignOut) {
      await onSignOut()
    } else {
      await signOut()
    }
  }

  const menuContent = (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Menu */}
      <div 
        className="fixed inset-y-0 left-0 w-[280px] bg-[#1a1a1a] z-50 overflow-y-auto"
        style={{
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 200ms ease'
        }}
      >
        {/* Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-white/[0.06]">
          <h2 className="text-white font-semibold text-lg">Menu</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/[0.06] transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>
        
        {/* Navigation Sections */}
        <div className="p-4">
          
          {/* ORGANIZATION */}
          <NavSection title="ORGANIZATION">
            <NavItem
              icon={<Building className="w-5 h-5" />}
              label="Sites"
              href="/dashboard/organization/sites"
              active={pathname.startsWith('/dashboard/organization/sites') || pathname.startsWith('/dashboard/sites')}
              onClick={onClose}
            />
            <NavItem
              icon={<Target className="w-5 h-5" />}
              label="Business Setup"
              href="/dashboard/organization/setup"
              active={pathname.startsWith('/dashboard/organization/setup') || pathname.startsWith('/dashboard/business')}
              onClick={onClose}
            />
            <NavItem
              icon={<FileText className="w-5 h-5" />}
              label="Documents"
              href="/dashboard/organization/documents"
              active={pathname.startsWith('/dashboard/organization/documents') || pathname.startsWith('/dashboard/documents')}
              onClick={onClose}
            />
            <NavItem
              icon={<Shield className="w-5 h-5" />}
              label="Users & Roles"
              href="/dashboard/organization/users"
              active={pathname.startsWith('/dashboard/organization/users') || pathname.startsWith('/dashboard/users')}
              onClick={onClose}
            />
          </NavSection>
          
          {/* INSIGHTS & REPORTS */}
          <NavSection title="INSIGHTS & REPORTS">
            <NavItem
              icon={<BarChart className="w-5 h-5" />}
              label="Reports"
              href="/dashboard/reports"
              active={pathname.startsWith('/dashboard/reports')}
              onClick={onClose}
            />
            <NavItem
              icon={<TrendingUp className="w-5 h-5" />}
              label="Analytics"
              href="/dashboard/analytics"
              active={pathname.startsWith('/dashboard/analytics')}
              onClick={onClose}
            />
            <NavItem
              icon={<Bell className="w-5 h-5" />}
              label="Reminders"
              href="/dashboard/reminders"
              active={pathname.startsWith('/dashboard/reminders')}
              onClick={onClose}
            />
          </NavSection>
          
          {/* MODULE SETTINGS */}
          <NavSection title="MODULE SETTINGS">
            <NavItem
              icon={<Settings className="w-5 h-5" />}
              label="Checkly Settings"
              href="/dashboard/checkly/settings"
              color="#EC4899"
              active={pathname.startsWith('/dashboard/checkly/settings')}
              onClick={onClose}
            />
            <NavItem
              icon={<Settings className="w-5 h-5" />}
              label="Stockly Settings"
              href="/dashboard/stockly/settings"
              color="#10B981"
              active={pathname.startsWith('/dashboard/stockly/settings')}
              onClick={onClose}
            />
            <NavItem
              icon={<Settings className="w-5 h-5" />}
              label="Teamly Settings"
              href="/dashboard/people/settings"
              color="#2563EB"
              active={pathname.startsWith('/dashboard/people/settings')}
              onClick={onClose}
            />
            <NavItem
              icon={<Settings className="w-5 h-5" />}
              label="Assetly Settings"
              href="/dashboard/assetly/settings"
              color="#0284C7"
              active={pathname.startsWith('/dashboard/assetly/settings')}
              onClick={onClose}
            />
            <NavItem
              icon={<Settings className="w-5 h-5" />}
              label="Planly Settings"
              href="/dashboard/planly/settings"
              color="#14B8A6"
              active={pathname.startsWith('/dashboard/planly/settings')}
              onClick={onClose}
            />
          </NavSection>
          
          {/* SYSTEM */}
          <NavSection title="SYSTEM">
            <NavItem
              icon={<Settings className="w-5 h-5" />}
              label="System Settings"
              href="/dashboard/settings"
              active={pathname.startsWith('/dashboard/settings')}
              onClick={onClose}
            />
            <NavItem
              icon={<CreditCard className="w-5 h-5" />}
              label="Billing & Plan"
              href="/dashboard/billing"
              active={pathname.startsWith('/dashboard/billing')}
              onClick={onClose}
            />
            <NavItem
              icon={<HelpCircle className="w-5 h-5" />}
              label="Help & Support"
              href="/dashboard/help"
              active={pathname.startsWith('/dashboard/help') || pathname.startsWith('/dashboard/support')}
              onClick={onClose}
            />
          </NavSection>
          
          {/* Divider */}
          <div className="my-4 border-t border-white/[0.06]" />
          
          {/* User Info Block */}
          <div className="px-3 py-3 rounded-lg bg-white/[0.03] mb-2">
            <div className="text-white font-medium text-sm mb-1">{userName}</div>
            <div className="text-white/60 text-xs">{userEmail}</div>
            <div className="text-white/60 text-xs mt-0.5">{userRole}</div>
          </div>
          
          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors text-white/80 hover:text-white"
          >
            <LogOut className="w-5 h-5 text-red-400" />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </div>
    </>
  )
  
  return createPortal(menuContent, document.body)
}

// NavSection Component
function NavSection({ 
  title, 
  children 
}: { 
  title: string
  children: React.ReactNode 
}) {
  return (
    <div className="mb-6">
      <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2 px-3">
        {title}
      </h3>
      <div className="space-y-1">
        {children}
      </div>
    </div>
  )
}

// NavItem Component
interface NavItemProps {
  icon: React.ReactNode
  label: string
  href: string
  color?: string
  active?: boolean
  onClick?: () => void
}

function NavItem({
  icon,
  label,
  href,
  color,
  active,
  onClick
}: NavItemProps) {
  const content = (
    <>
      <div 
        className="w-5 h-5 flex items-center justify-center flex-shrink-0"
        style={active && color ? { color } : {}}
      >
        {icon}
      </div>
      <span className="flex-1 text-sm font-medium">
        {label}
      </span>
      <ChevronRight className="w-4 h-4 text-white/40" />
    </>
  )
  
  const className = `
    flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all
    ${active ? 'bg-white/[0.06] text-white' : 'text-white/80 hover:bg-white/[0.03] hover:text-white'}
  `
  
  return (
    <Link href={href} className={className} onClick={onClick}>
      {content}
    </Link>
  )
}
