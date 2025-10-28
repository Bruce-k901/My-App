// Global color constants for consistent theming
export const COLORS = {
  accent: '#FF006E',        // Our magenta (use everywhere)
  accentHover: '#E60060',   // Darker on hover
  accentGlow: 'rgba(255, 0, 110, 0.3)',  // Glow shadow
  accentGlowStrong: 'rgba(255, 0, 110, 0.5)',  // Stronger glow
  
  // Background colors
  background: {
    primary: '#141419',
    secondary: '#1A1A20',
    hover: '#1A1A20',
  },
  
  // Text colors
  text: {
    primary: '#FFFFFF',
    secondary: '#A3A3A3',
    tertiary: '#717171',
  },
  
  // Border colors
  border: {
    primary: '#2A2A2F',
    secondary: '#3A3A3F',
  },
  
  // Status colors
  status: {
    active: '#10B981',
    draft: '#F59E0B',
    archived: '#FF4040',
    error: '#FF4040',
  },
  
  // Category colors
  category: {
    'custom': '#8B5CF6',
    'food-safety': '#10B981',
    'fire-security': '#F59E0B',
    'health-safety': '#3B82F6',
    'cleaning': '#8B5CF6',
    'compliance': '#EC4899',
  }
} as const

export type ColorKey = keyof typeof COLORS
export type CategoryKey = keyof typeof COLORS.category
