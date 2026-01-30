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
    { id: 'templates', label: 'Templates', path: '/dashboard/tasks/templates' },
    { id: 'compliance', label: 'Compliance Tasks', path: '/dashboard/tasks/compliance' }
  ],
  todayChecks: [
    { id: 'still-to-do', label: 'Still to Do', path: '/dashboard/tasks/scheduled' },
    { id: 'done', label: 'Done', path: '/dashboard/tasks/completed' },
    { id: 'add', label: 'Add', path: '/dashboard/tasks/settings' }
  ]
}

// Burger menu sections
export const BURGER_MENU_SECTIONS: MenuSection[] = [
  {
    id: 'organization',
    label: 'ORGANIZATION',
    items: [
      { id: 'sites', label: 'Sites', path: '/dashboard/sites' },
      { id: 'documents', label: 'Documents', path: '/dashboard/documents' },
      { id: 'users', label: 'Users & Roles', path: '/dashboard/users' },
      { id: 'companies', label: 'Companies & Brands', path: '/settings/companies' },
      { id: 'business-setup', label: 'Business Setup', path: '/dashboard/business' },
      { id: 'setup-guide', label: 'Setup Guide', path: '/dashboard/organization/onboarding' },
      { id: 'emergency-contacts', label: 'Emergency Contacts', path: '/dashboard/organization/emergency-contacts' },
      { id: 'training-matrix', label: 'Training Matrix', path: '/dashboard/training' },
    ]
  },
  {
    id: 'workspace',
    label: 'WORKSPACE',
    items: [
      { id: 'messages', label: 'Messages', path: '/dashboard/messaging' },
      { id: 'reports', label: 'Reports', path: '/dashboard/reports' },
      { id: 'eho-readiness', label: 'EHO Readiness', path: '/dashboard/eho-report' },
      { id: 'archive', label: 'Archive Center', path: '/dashboard/archive' },
    ]
  },
  {
    id: 'tasks',
    label: 'TASKS',
    items: [
      { id: 'todays-tasks', label: "Today's Tasks", path: '/dashboard/todays_tasks' },
      { id: 'incidents', label: 'Incidents', path: '/dashboard/incidents' },
    ]
  },
  {
    id: 'modules',
    label: 'MODULES',
    items: [
      { id: 'checkly', label: 'Checkly', path: '/dashboard' },
      { id: 'assetly', label: 'Assetly', path: '/dashboard/assets' },
      { id: 'teamly', label: 'Teamly', path: '/dashboard/people' },
      { id: 'stockly', label: 'Stockly', path: '/dashboard/stockly' },
      { id: 'planly', label: 'Planly', path: '/dashboard/planly' },
    ]
  },
  {
    id: 'settings',
    label: 'SETTINGS',
    items: [
      { id: 'settings', label: 'Settings', path: '/dashboard/settings' },
      { id: 'billing', label: 'Billing & Plan', path: '/dashboard/billing' },
      { id: 'help', label: 'Help & Support', path: '/dashboard/support' }
    ]
  },
  {
    id: 'account',
    label: 'ACCOUNT',
    items: [
      { id: 'profile', label: 'My Profile', path: '/dashboard/settings' },
      { id: 'password', label: 'Change Password', path: '/dashboard/settings' },
      { id: 'signout', label: 'Sign Out', path: '/' }
    ]
  }
]

// Role-based menu filtering
export const getMenuItemsByRole = (role: 'admin' | 'manager' | 'team'): MenuSection[] => {
  const allSections = [...BURGER_MENU_SECTIONS]
  
  if (role === 'admin') {
    return allSections
  }
  
  if (role === 'manager') {
    return allSections.map(section => {
      if (section.id === 'organization') {
        return {
          ...section,
          items: section.items.filter(item => 
            ['sites', 'documents', 'users', 'companies', 'business-setup', 'setup-guide', 'emergency-contacts', 'training-matrix'].includes(item.id)
          )
        }
      }
      if (section.id === 'workspace') {
        return {
          ...section,
          items: section.items.filter(item =>
            ['messages', 'reports', 'eho-readiness', 'archive'].includes(item.id)
          )
        }
      }
      // Settings section - no filter, show all (billing, settings, help)
      return section
    })
  }
  
  // Team role - minimal access
  return allSections.map(section => {
    // Organization section - show limited items for team role
    if (section.id === 'organization') {
      return {
        ...section,
        items: section.items.filter(item => 
          ['setup-guide', 'documents'].includes(item.id) // Team can access setup guide and documents
        )
      }
    }
    if (section.id === 'workspace') {
      return {
        ...section,
        items: section.items.filter(item => 
          ['messages'].includes(item.id)
        )
      }
    }
    if (section.id === 'tasks') {
      return {
        ...section,
        items: section.items.filter(item => 
          ['todays-tasks'].includes(item.id)
        )
      }
    }
    if (section.id === 'modules') {
      return {
        ...section,
        items: []
      }
    }
    if (section.id === 'settings') {
      return {
        ...section,
        items: section.items.filter(item => 
          ['settings', 'billing', 'help'].includes(item.id)
        )
      }
    }
    return section
  }).filter(section => section.items.length > 0)
}

// Tab types
export type ActiveTab = 'edit-tasks' | 'today-checks'

// Color palette
export const COLORS = {
  background: {
    dark: '#09090B',
    light: '#141419',
    hover: '#1A1A20'
  },
  border: '#2A2A2F',
  text: {
    primary: '#FFFFFF',
    secondary: '#A3A3A3',
    tertiary: '#717171'
  },
  accent: '#FF006E',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#FF4040'
}
