'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { X, Building2, FileText, ShieldCheck, BarChart3, Settings, User, CreditCard, LogOut, Users, MapPin, Rocket, Archive, Shield, LifeBuoy, BookOpen } from '@/components/ui/icons'
import { useAppContext } from '@/context/AppContext'
import { getMenuItemsByRole, COLORS } from './navigation'

interface BurgerMenuProps {
  isOpen: boolean
  onClose: () => void
  userRole?: 'admin' | 'manager' | 'team' // Optional - will be calculated from profile if not provided
  unreadTicketCount?: number // Optional - unread ticket notifications count
}

// Icon mapping for the 13 menu items
const iconMap: Record<string, any> = {
  // Organization (5 items)
  sites: MapPin,
  users: Users,
  companies: Building2,
  'business-setup': Rocket,
  documents: FileText,
  // Workspace (4 items)
  reports: BarChart3,
  'eho-readiness': ShieldCheck,
  'my-tickets': LifeBuoy,
  archive: Archive,
  'guide-manager': BookOpen,
  'guide-staff': BookOpen,
  // Settings (2 items)
  settings: Settings,
  billing: CreditCard,
  // Account (2 items)
  profile: User,
  signout: LogOut,
}

export function BurgerMenu({
  isOpen,
  onClose,
  userRole,
  unreadTicketCount = 0
}: BurgerMenuProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { profile, signOut, role } = useAppContext()
  
  // Calculate role from profile if not provided or if provided role is 'team' but profile says otherwise
  // This ensures we use the most up-to-date role information
  const effectiveRole = profile?.app_role || role || 'Staff';
  const calculatedUserRole = (effectiveRole === 'Admin' || effectiveRole === 'Owner' ? 'admin' : effectiveRole === 'Manager' ? 'manager' : 'team') as 'admin' | 'manager' | 'team';
  
  // Use provided userRole if it's not 'team', otherwise use calculated role
  // This allows DashboardHeader to override, but falls back to profile if timing is off
  const finalUserRole = (userRole && userRole !== 'team') ? userRole : calculatedUserRole;
  
  const menuSections = getMenuItemsByRole(finalUserRole)

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  const handleNavigation = (path: string) => {
    if (path === '/') {
      router.push('/')
    } else {
      router.push(path)
    }
    onClose()
  }

  const handleSignOut = async () => {
    onClose()
    try {
      await signOut()
    } catch (error) {
      console.error('Logout error:', error)
      // Fallback: redirect to login
      router.push('/login')
    }
  }

  if (!isOpen) return null

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/')

  return (
    <>
      {/* Overlay */}
      <div
        className="hidden lg:block fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Menu Panel - Desktop only */}
      <div
        className={`hidden lg:flex fixed top-0 right-0 bottom-0 w-[320px] max-w-[90vw] z-50 shadow-2xl flex-col bg-gray-50 dark:bg-[#0c0a09] transition-transform duration-200 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-white dark:bg-transparent border-b border-theme">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teamly/20 flex items-center justify-center">
              <User className="w-5 h-5 text-teamly dark:text-teamly" />
            </div>
            <div>
              <div className="text-sm font-medium text-theme-primary">
                {profile?.full_name || 'User'}
              </div>
              <div className="text-xs text-theme-tertiary capitalize">
                {userRole}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-theme-tertiary hover:text-theme-primary/60 hover:bg-theme-muted rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 min-h-0 space-y-3">
          {menuSections.map((section) => (
            <div
              key={section.id}
              className="bg-theme-surface rounded-xl border border-theme shadow-sm dark:shadow-none overflow-hidden"
            >
              {/* Section Header */}
              <div className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-theme-tertiary border-b border-gray-100 dark:border-white/[0.04]">
                {section.label}
              </div>

              {/* Section Items */}
              <div className="py-1">
                {section.items.map((item) => {
                  const Icon = iconMap[item.id] || FileText
                  const active = isActive(item.path)

                  const isSignOut = item.id === 'signout'
                  const isMyTickets = item.id === 'my-tickets'
                  const showTicketBadge = isMyTickets && unreadTicketCount > 0

                  const isGuide = item.id === 'guide-manager' || item.id === 'guide-staff'

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (isSignOut) {
                          handleSignOut()
                        } else if (isGuide) {
                          window.open(item.path, '_blank')
                          onClose()
                        } else {
                          handleNavigation(item.path)
                        }
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-150 text-left relative ${
                        active
                          ? 'bg-teamly/15 text-teamly dark:text-teamly/30 shadow-[inset_0_0_12px_rgba(211,126,145,0.12)]'
                          : isSignOut
                            ? 'text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 hover:shadow-[inset_0_0_12px_rgba(239,68,68,0.08)]'
                            : 'text-theme-secondary hover:text-teamly dark:hover:text-teamly/30 hover:bg-teamly/5 dark:hover:bg-teamly/10 hover:shadow-[inset_0_0_12px_rgba(211,126,145,0.12)]'
                      }`}
                    >
                      <Icon className={`w-4 h-4 flex-shrink-0 transition-colors duration-150 ${active ? 'text-teamly dark:text-teamly' : isSignOut ? 'text-red-500 dark:text-red-400' : 'text-theme-tertiary'}`} />
                      <span className="font-medium truncate">{item.label}</span>
                      {isGuide && (
                        <span className="ml-auto text-theme-tertiary opacity-60">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </span>
                      )}
                      {showTicketBadge && (
                        <span className="ml-auto px-2 py-0.5 text-xs font-bold bg-[#D37E91] text-white rounded-full min-w-[20px] text-center">
                          {unreadTicketCount > 99 ? '99+' : unreadTicketCount}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Admin Portal - Only for platform admins */}
          {profile?.is_platform_admin && (
            <div className="bg-theme-surface rounded-xl border border-theme shadow-sm dark:shadow-none overflow-hidden">
              <div className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-theme-tertiary border-b border-gray-100 dark:border-white/[0.04]">
                PLATFORM
              </div>
              <div className="py-1">
                <button
                  onClick={() => handleNavigation('/admin')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-150 text-left ${
                    isActive('/admin')
                      ? 'bg-teamly/15 text-teamly dark:text-teamly/30 shadow-[inset_0_0_12px_rgba(211,126,145,0.12)]'
                      : 'text-theme-secondary hover:text-teamly dark:hover:text-teamly/30 hover:bg-teamly/5 dark:hover:bg-teamly/10 hover:shadow-[inset_0_0_12px_rgba(211,126,145,0.12)]'
                  }`}
                >
                  <Shield className={`w-4 h-4 flex-shrink-0 transition-colors duration-150 ${isActive('/admin') ? 'text-teamly dark:text-teamly' : 'text-theme-tertiary'}`} />
                  <span className="font-medium truncate">Admin Portal</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-white dark:bg-transparent border-t border-theme p-4 flex-shrink-0">
          <div className="text-xs text-theme-tertiary text-center">
            Opsly © {new Date().getFullYear()}
          </div>
        </div>
      </div>
    </>
  )
}
