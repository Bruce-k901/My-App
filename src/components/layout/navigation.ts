/**
 * Navigation configuration for the header system
 * Defines menu structure and routing paths
 */

export interface MenuItem {
  id: string
  label: string
  path: string
  icon?: string
}

export interface MenuSection {
  id: string
  label: string
  items: MenuItem[]
}

// Left sidebar menu items based on active tab
export const SIDEBAR_MENUS = {
  editTasks: [
    { id: 'my-tasks', label: 'My Tasks', path: '/dashboard/tasks/my-tasks' },
    { id: 'templates', label: 'Custom Templates', path: '/dashboard/tasks/templates' },
    { id: 'compliance', label: 'Compliance Tasks', path: '/dashboard/tasks/compliance' }
  ],
  todayChecks: [
    { id: 'still-to-do', label: 'Still to Do', path: '/dashboard/tasks/scheduled' },
    { id: 'done', label: 'Done', path: '/dashboard/tasks/completed' },
    { id: 'add', label: 'Add', path: '/dashboard/tasks/settings' }
  ]
}

// Burger menu sections - Slimmed down to 12 items across 4 sections
export const BURGER_MENU_SECTIONS: MenuSection[] = [
  {
    id: 'organization',
    label: 'ORGANIZATION',
    items: [
      { id: 'business-setup', label: 'Getting Started', path: '/dashboard/business', icon: 'Rocket' },
      { id: 'sites', label: 'Sites', path: '/dashboard/sites', icon: 'MapPin' },
      { id: 'users', label: 'Users & Roles', path: '/dashboard/users', icon: 'Users' },
      { id: 'companies', label: 'Companies & Brands', path: '/settings/companies', icon: 'Building2' },
      { id: 'documents', label: 'Documents', path: '/dashboard/documents', icon: 'FileText' },
    ]
  },
  {
    id: 'workspace',
    label: 'WORKSPACE',
    items: [
      { id: 'reports', label: 'Reports', path: '/dashboard/reports', icon: 'BarChart3' },
      { id: 'eho-readiness', label: 'EHO Readiness', path: '/dashboard/eho-report', icon: 'ShieldCheck' },
      { id: 'my-tickets', label: 'My Tickets', path: '/dashboard/support/my-tickets', icon: 'LifeBuoy' },
      { id: 'archive', label: 'Archive Center', path: '/dashboard/archive', icon: 'Archive' },
      { id: 'guide-manager', label: 'Manager Guide', path: '/dashboard/guide/manager', icon: 'BookOpen' },
      { id: 'guide-staff', label: 'Staff Guide', path: '/dashboard/guide/staff', icon: 'BookOpen' },
    ]
  },
  {
    id: 'settings',
    label: 'SETTINGS',
    items: [
      { id: 'settings', label: 'Settings', path: '/dashboard/settings', icon: 'Settings' },
      { id: 'billing', label: 'Billing & Plan', path: '/dashboard/billing', icon: 'CreditCard' },
    ]
  },
  {
    id: 'account',
    label: 'ACCOUNT',
    items: [
      { id: 'profile', label: 'My Profile', path: '/dashboard/profile', icon: 'User' },
      { id: 'signout', label: 'Sign Out', path: '/', icon: 'LogOut' },
    ]
  }
]

// Role-based menu filtering
// - admin: All 4 sections (Organization, Workspace, Settings, Account)
// - manager: Workspace, Settings (minus Billing), Account
// - team: Workspace (Reports, EHO Readiness, Archive Center), Account
export const getMenuItemsByRole = (role: 'admin' | 'manager' | 'team'): MenuSection[] => {
  const allSections = [...BURGER_MENU_SECTIONS]

  if (role === 'admin') {
    // Admin sees everything
    return allSections
  }

  if (role === 'manager') {
    // Manager: Workspace, Settings (minus Billing), Account
    return allSections
      .filter(section => ['workspace', 'settings', 'account'].includes(section.id))
      .map(section => {
        if (section.id === 'settings') {
          return {
            ...section,
            items: section.items.filter(item => item.id !== 'billing')
          }
        }
        return section
      })
  }

  // Team role: Workspace (Reports, EHO Readiness, My Tickets, Archive Center, Staff Guide), Account
  return allSections
    .filter(section => ['workspace', 'account'].includes(section.id))
    .map(section => {
      if (section.id === 'workspace') {
        return {
          ...section,
          items: section.items.filter(item =>
            ['reports', 'eho-readiness', 'my-tickets', 'archive', 'guide-staff'].includes(item.id)
          )
        }
      }
      return section
    })
}

// Tab types
export type ActiveTab = 'edit-tasks' | 'today-checks'

