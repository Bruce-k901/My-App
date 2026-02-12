// Template configuration and utility functions for reviews

import { ReviewTemplateType } from '@/types/reviews';
import { 
  Users, Calendar, BarChart, Award, Heart, UserCheck, UserMinus, 
  MessageCircle, Search, Gavel, FileText, Scale, AlertCircle, FileEdit,
  ClipboardList, AlertTriangle, UserPlus
} from '@/components/ui/icons';

export const TEMPLATE_TYPE_CONFIG: Record<string, {
  label: string;
  shortLabel: string;
  category: 'performance' | 'disciplinary' | 'onboarding' | 'offboarding';
  color: string;
  bgColor: string;
  borderColor: string;
  icon: typeof Users;
}> = {
  // Performance Reviews
  one_to_one: {
    label: '1-2-1 Meeting',
    shortLabel: '1-2-1',
    category: 'performance',
    color: 'text-blue-400',
    bgColor: 'bg-blue-600/20',
    borderColor: 'border-blue-600/30',
    icon: Users
  },
  monthly_review: {
    label: 'Monthly Review',
    shortLabel: 'Monthly',
    category: 'performance',
    color: 'text-blue-400',
    bgColor: 'bg-blue-600/20',
    borderColor: 'border-blue-600/30',
    icon: Calendar
  },
  quarterly_review: {
    label: 'Quarterly Review',
    shortLabel: 'Quarterly',
    category: 'performance',
    color: 'text-blue-400',
    bgColor: 'bg-blue-600/20',
    borderColor: 'border-blue-600/30',
    icon: BarChart
  },
  annual_appraisal: {
    label: 'Annual Appraisal',
    shortLabel: 'Annual',
    category: 'performance',
    color: 'text-purple-400',
    bgColor: 'bg-purple-600/20',
    borderColor: 'border-purple-600/30',
    icon: Award
  },
  mid_year_review: {
    label: 'Mid-Year Review',
    shortLabel: 'Mid-Year',
    category: 'performance',
    color: 'text-blue-400',
    bgColor: 'bg-blue-600/20',
    borderColor: 'border-blue-600/30',
    icon: BarChart
  },
  values_review: {
    label: 'Values Review',
    shortLabel: 'Values',
    category: 'performance',
    color: 'text-[#D37E91]',
    bgColor: 'bg-[#D37E91]/25',
    borderColor: 'border-[#D37E91]/30',
    icon: Heart
  },
  performance_improvement: {
    label: 'Performance Improvement',
    shortLabel: 'PIP',
    category: 'performance',
    color: 'text-orange-400',
    bgColor: 'bg-orange-600/20',
    borderColor: 'border-orange-600/30',
    icon: AlertTriangle
  },
  promotion_review: {
    label: 'Promotion Review',
    shortLabel: 'Promotion',
    category: 'performance',
    color: 'text-purple-400',
    bgColor: 'bg-purple-600/20',
    borderColor: 'border-purple-600/30',
    icon: Award
  },
  
  // Onboarding
  onboarding_check_in: {
    label: 'Onboarding Check-in',
    shortLabel: 'Onboarding',
    category: 'onboarding',
    color: 'text-green-400',
    bgColor: 'bg-green-600/20',
    borderColor: 'border-green-600/30',
    icon: UserPlus
  },
  probation_review: {
    label: 'Probation Review',
    shortLabel: 'Probation',
    category: 'onboarding',
    color: 'text-green-400',
    bgColor: 'bg-green-600/20',
    borderColor: 'border-green-600/30',
    icon: UserCheck
  },
  return_to_work: {
    label: 'Return to Work',
    shortLabel: 'Return',
    category: 'onboarding',
    color: 'text-green-400',
    bgColor: 'bg-green-600/20',
    borderColor: 'border-green-600/30',
    icon: UserCheck
  },
  
  // Offboarding
  exit_interview: {
    label: 'Exit Interview',
    shortLabel: 'Exit',
    category: 'offboarding',
    color: 'text-theme-tertiary',
    bgColor: 'bg-gray-600/20',
    borderColor: 'border-gray-600/30',
    icon: UserMinus
  },
  
  // Disciplinary & Grievance
  informal_discussion: {
    label: 'Informal Discussion',
    shortLabel: 'Informal',
    category: 'disciplinary',
    color: 'text-orange-400',
    bgColor: 'bg-orange-600/20',
    borderColor: 'border-orange-600/30',
    icon: MessageCircle
  },
  investigation_meeting: {
    label: 'Investigation Meeting',
    shortLabel: 'Investigation',
    category: 'disciplinary',
    color: 'text-red-400',
    bgColor: 'bg-red-600/20',
    borderColor: 'border-red-600/30',
    icon: Search
  },
  disciplinary_hearing: {
    label: 'Disciplinary Hearing',
    shortLabel: 'Hearing',
    category: 'disciplinary',
    color: 'text-red-400',
    bgColor: 'bg-red-600/20',
    borderColor: 'border-red-600/30',
    icon: Gavel
  },
  disciplinary_outcome: {
    label: 'Disciplinary Outcome',
    shortLabel: 'Outcome',
    category: 'disciplinary',
    color: 'text-red-400',
    bgColor: 'bg-red-600/20',
    borderColor: 'border-red-600/30',
    icon: FileText
  },
  appeal_hearing: {
    label: 'Appeal Hearing',
    shortLabel: 'Appeal',
    category: 'disciplinary',
    color: 'text-amber-400',
    bgColor: 'bg-amber-600/20',
    borderColor: 'border-amber-600/30',
    icon: Scale
  },
  grievance_meeting: {
    label: 'Grievance Meeting',
    shortLabel: 'Grievance',
    category: 'disciplinary',
    color: 'text-orange-400',
    bgColor: 'bg-orange-600/20',
    borderColor: 'border-orange-600/30',
    icon: AlertCircle
  },
  
  // Default
  custom: {
    label: 'Custom Template',
    shortLabel: 'Custom',
    category: 'performance',
    color: 'text-theme-tertiary',
    bgColor: 'bg-gray-600/20',
    borderColor: 'border-gray-600/30',
    icon: FileEdit
  }
};

export const TEMPLATE_CATEGORIES = {
  performance: {
    label: 'Performance Reviews',
    description: 'Regular check-ins, appraisals, and development reviews',
    icon: ClipboardList,
    color: 'blue'
  },
  disciplinary: {
    label: 'Disciplinary & Grievance',
    description: 'Formal HR processes for conduct and complaints',
    icon: AlertTriangle,
    color: 'red'
  },
  onboarding: {
    label: 'Onboarding & Probation',
    description: 'New starter and probation reviews',
    icon: UserPlus,
    color: 'green'
  },
  offboarding: {
    label: 'Offboarding',
    description: 'Exit interviews and leaving processes',
    icon: UserMinus,
    color: 'gray'
  }
};

export function getTemplateConfig(templateType: string) {
  return TEMPLATE_TYPE_CONFIG[templateType] || TEMPLATE_TYPE_CONFIG.custom;
}

export function isDisciplinaryTemplate(templateType: string): boolean {
  return ['informal_discussion', 'investigation_meeting', 'disciplinary_hearing', 
          'disciplinary_outcome', 'appeal_hearing', 'grievance_meeting'].includes(templateType);
}

