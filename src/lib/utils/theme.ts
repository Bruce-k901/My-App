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
  planly: {
    primary: 'bg-[#14B8A6] hover:bg-[#0D9488] focus:ring-[#14B8A6]',
    primaryText: 'text-[#14B8A6]',
    light: 'bg-teal-50',
    border: 'border-teal-200',
    ring: 'ring-[#14B8A6]',
    badge: 'bg-teal-100 text-teal-800',
    badgeRed: 'bg-red-100 text-red-800',
    badgeYellow: 'bg-yellow-100 text-yellow-800',
    badgeGreen: 'bg-green-100 text-green-800',
    badgeGray: 'bg-gray-100 text-gray-800',
  },
  assetly: {
    primary: 'bg-[#F59E0B] hover:bg-[#D97706] focus:ring-[#F59E0B]',
    primaryText: 'text-[#F59E0B]',
    light: 'bg-amber-50',
    border: 'border-amber-200',
    ring: 'ring-[#F59E0B]',
    badge: 'bg-amber-100 text-amber-800',
    badgeRed: 'bg-red-100 text-red-800',
    badgeYellow: 'bg-yellow-100 text-yellow-800',
    badgeGreen: 'bg-green-100 text-green-800',
    badgeGray: 'bg-gray-100 text-gray-800',
  },
} as const;

export function getThemeClasses(theme: ModuleTheme) {
  return moduleThemes[theme];
}

