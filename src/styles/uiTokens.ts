/**
 * UI Design Tokens and Component Variants
 * 
 * Centralized styling patterns to maintain consistency across the application.
 * These tokens define the standard button styles, colors, and effects used throughout.
 */

// Color Palette
export const colors = {
  primary: {
    magenta: '#EC4899',
    magentaRgba: '236,72,153',
  },
  secondary: {
    orange: '#F97316', 
    orangeRgba: '249,115,22',
  },
  neutral: {
    dark: '#151518',
    border: 'rgba(255,255,255,0.1)',
    text: '#gray-100',
    label: '#neutral-400',
  }
} as const;

// Button Variants
export const buttonVariants = {
  // Primary magenta buttons (Save, Cancel, Generate, PIN toggle)
  primary: 'border border-[#EC4899] text-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] rounded-lg p-2 bg-transparent transition-all duration-200',

  // Primary magenta with glass effect (Generate button)
  primaryGlass: 'border border-[#EC4899] text-[#EC4899] bg-white/5 backdrop-blur-sm hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] rounded-xl px-4 py-2 transition-all duration-200',

  // Archive/Orange buttons
  archive: 'border border-[#F97316] text-[#F97316] hover:shadow-[0_0_12px_rgba(249,115,22,0.7)] rounded-lg p-2 bg-transparent transition-all duration-200',
} as const;

// Input Field Variants
export const inputVariants = {
  default: 'w-full h-10 rounded-lg bg-[#151518] border border-white/10 px-3 text-gray-100',
  withIcon: 'w-full h-10 rounded-lg bg-[#151518] border border-white/10 px-3 pr-10 text-gray-100',
} as const;

// Layout Utilities
export const layout = {
  separator: 'border-t border-[#1F2937]',
  cardPadding: 'p-4',
  buttonGroup: 'flex justify-between items-center pt-4 relative',
  pinFieldContainer: 'flex gap-2 items-center',
  pinFieldWidth: 'flex-1 max-w-[200px]',
} as const;

// Icon Button Utilities
export const iconButton = {
  absolute: 'absolute right-2 top-1/2 -translate-y-1/2',
  archivePosition: 'absolute bottom-0 right-0',
} as const;

// Utility function to combine classes
export const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};

// Pre-built component class combinations
export const components = {
  saveButton: buttonVariants.primary,
  cancelButton: buttonVariants.primary,
  generateButton: buttonVariants.primaryGlass,
  archiveButton: `${buttonVariants.archive} ${iconButton.archivePosition}`,
  pinToggleButton: `text-[#EC4899] hover:text-[#ff5faf] ${iconButton.absolute}`,
  pinField: inputVariants.withIcon,
  standardInput: inputVariants.default,
} as const;