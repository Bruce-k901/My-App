import { ModuleTheme } from '@/types/library.types';

export const moduleThemes = {
  checkly: {
    primary: 'bg-[#EC4899] hover:bg-[#DB2777] focus:ring-[#EC4899]',
    primaryText: 'text-[#EC4899]',
    light: 'bg-pink-50',
    border: 'border-pink-200',
    ring: 'ring-[#EC4899]',
    badge: 'bg-pink-100 text-pink-800',
    badgeRed: 'bg-red-100 text-red-800',
    badgeYellow: 'bg-yellow-100 text-yellow-800',
    badgeGreen: 'bg-green-100 text-green-800',
    badgeGray: 'bg-gray-100 text-gray-800',
  },
  stockly: {
    primary: 'bg-[#10B981] hover:bg-[#059669] focus:ring-[#10B981]',
    primaryText: 'text-[#10B981]',
    light: 'bg-emerald-50',
    border: 'border-emerald-200',
    ring: 'ring-[#10B981]',
    badge: 'bg-emerald-100 text-emerald-800',
    badgeRed: 'bg-red-100 text-red-800',
    badgeYellow: 'bg-yellow-100 text-yellow-800',
    badgeGreen: 'bg-green-100 text-green-800',
    badgeGray: 'bg-gray-100 text-gray-800',
  },
  teamly: {
    primary: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    primaryText: 'text-blue-600',
    light: 'bg-blue-50',
    border: 'border-blue-200',
    ring: 'ring-blue-500',
    badge: 'bg-blue-100 text-blue-800',
    badgeRed: 'bg-red-100 text-red-800',
    badgeYellow: 'bg-yellow-100 text-yellow-800',
    badgeGreen: 'bg-green-100 text-green-800',
    badgeGray: 'bg-gray-100 text-gray-800',
  },
} as const;

export function getThemeClasses(theme: ModuleTheme) {
  return moduleThemes[theme];
}

