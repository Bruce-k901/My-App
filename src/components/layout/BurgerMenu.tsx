'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { X, Building2, FileText, ShieldCheck, BarChart3, Settings, User, CreditCard, LogOut, Users, MapPin, Target, Archive } from 'lucide-react'
import { useAppContext } from '@/context/AppContext'
import { getMenuItemsByRole, COLORS } from './navigation'

interface BurgerMenuProps {
  isOpen: boolean
  onClose: () => void
  userRole?: 'admin' | 'manager' | 'team' // Optional - will be calculated from profile if not provided
}

// Icon mapping for the 12 menu items
const iconMap: Record<string, any> = {
  // Organization (5 items)
  sites: MapPin,
  users: Users,
  companies: Building2,
  'business-setup': Target,
  documents: FileText,
  // Workspace (3 items)
  reports: BarChart3,
  'eho-readiness': ShieldCheck,
  archive: Archive,
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
  userRole
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
        className={`hidden lg:flex fixed top-0 right-0 bottom-0 w-[320px] max-w-[90vw] z-50 shadow-2xl flex-col bg-gray-50 dark:bg-[#09090B] transition-transform duration-200 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-white dark:bg-transparent border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-fuchsia-500/20 flex items-center justify-center">
              <User className="w-5 h-5 text-fuchsia-500 dark:text-fuchsia-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {profile?.full_name || 'User'}
              </div>
              <div className="text-xs text-gray-500 dark:text-white/60 capitalize">
                {userRole}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-900 dark:text-white/60 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
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
              className="bg-white dark:bg-white/[0.03] rounded-xl border border-gray-200 dark:border-white/[0.06] shadow-sm dark:shadow-none overflow-hidden"
            >
              {/* Section Header */}
              <div className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-white/40 border-b border-gray-100 dark:border-white/[0.04]">
                {section.label}
              </div>

              {/* Section Items */}
              <div className="py-1">
                {section.items.map((item) => {
                  const Icon = iconMap[item.id] || FileText
                  const active = isActive(item.path)

                  const isSignOut = item.id === 'signout'

                  return (
                    <button
                      key={item.id}
                      onClick={() => isSignOut ? handleSignOut() : handleNavigation(item.path)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-150 text-left ${
                        active
                          ? 'bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300 shadow-[inset_0_0_12px_rgba(217,70,239,0.12)]'
                          : isSignOut
                            ? 'text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 hover:shadow-[inset_0_0_12px_rgba(239,68,68,0.08)]'
                            : 'text-gray-600 dark:text-white/70 hover:text-fuchsia-600 dark:hover:text-fuchsia-300 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-500/10 hover:shadow-[inset_0_0_12px_rgba(217,70,239,0.12)]'
                      }`}
                    >
                      <Icon className={`w-4 h-4 flex-shrink-0 transition-colors duration-150 ${active ? 'text-fuchsia-500 dark:text-fuchsia-400' : isSignOut ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-white/50'}`} />
                      <span className="font-medium truncate">{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="bg-white dark:bg-transparent border-t border-gray-200 dark:border-white/10 p-4 flex-shrink-0">
          <div className="text-xs text-gray-400 dark:text-white/40 text-center">
            Opsly © {new Date().getFullYear()}
          </div>
        </div>
      </div>
    </>
  )
}
