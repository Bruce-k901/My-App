'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { getMenuItemsByRole, COLORS } from './navigation'

interface BurgerMenuProps {
  isOpen: boolean
  onClose: () => void
  userRole: 'admin' | 'manager' | 'team'
}

export function BurgerMenu({
  isOpen,
  onClose,
  userRole
}: BurgerMenuProps) {
  const router = useRouter()
  const menuSections = getMenuItemsByRole(userRole)

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  const handleNavigation = (path: string) => {
    if (path === '/') {
      // Handle sign out - navigate to marketing homepage
      router.push('/')
    } else {
      router.push(path)
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Menu Panel */}
      <div
        className="fixed top-[60px] right-0 bottom-0 w-full max-w-sm z-50 border-l shadow-2xl"
        style={{
          backgroundColor: COLORS.background.dark,
          borderLeftColor: COLORS.border,
          transform: 'translateX(0)',
          transition: 'transform 200ms ease'
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Menu Content */}
        <div className="pt-16 pb-8 overflow-y-auto h-full">
          {menuSections.map((section, sectionIndex) => (
            <div key={section.id}>
              {/* Section Header */}
              <div
                className="px-6 py-2 text-xs font-semibold uppercase tracking-wider"
                style={{ 
                  color: COLORS.text.tertiary,
                  marginTop: sectionIndex === 0 ? 0 : 16
                }}
              >
                {section.label}
              </div>

              {/* Section Items */}
              <div className="px-2">
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item.path)}
                    className="w-full px-4 py-3 text-sm font-normal text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all duration-150 text-left rounded-md mx-2"
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Divider */}
              {sectionIndex < menuSections.length - 1 && (
                <div
                  className="h-px mx-6 my-2"
                  style={{ backgroundColor: COLORS.border }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
