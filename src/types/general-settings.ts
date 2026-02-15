export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
export type TimeFormat = '12h' | '24h';
export type WeekStartDay = 'Monday' | 'Sunday';
export type PayPeriodType = 'weekly' | 'fortnightly' | 'monthly';
export type PayDay = 'last_friday' | 'last_monday' | 'last_wednesday' | 'last_day' | 'specific_day';
export type CurrencyCode = 'GBP' | 'USD' | 'EUR' | 'CAD' | 'AUD';
export type CurrencyFormat = 'symbol_before' | 'symbol_after';

export interface BusinessHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

export interface DayHours {
  open?: string; // HH:mm format
  close?: string; // HH:mm format
  closed: boolean;
}

export interface GeneralSettings {
  id: string;
  company_id: string;
  
  // Company Info
  company_name?: string;
  company_logo_url?: string;
  company_address?: string;
  company_city?: string;
  company_postcode?: string;
  company_country?: string;
  company_phone?: string;
  company_email?: string;
  company_website?: string;
  
  // Time & Locale
  timezone?: string;
  date_format?: DateFormat;
  time_format?: TimeFormat;
  week_start_day?: WeekStartDay;
  
  // Working Hours
  default_business_hours?: BusinessHours;
  standard_shift_length_hours?: number;
  
  // Pay Periods
  pay_period_type?: PayPeriodType;
  pay_day?: PayDay;
  pay_day_specific?: number;
  
  // Currency
  currency_code?: CurrencyCode;
  currency_symbol?: string;
  currency_format?: CurrencyFormat;
  
  // Fiscal Year
  fiscal_year_start_month?: number;
  
  created_at?: string;
  updated_at?: string;
}

export const DEFAULT_GENERAL_SETTINGS: Partial<GeneralSettings> = {
  timezone: 'Europe/London',
  date_format: 'DD/MM/YYYY',
  time_format: '24h',
  week_start_day: 'Monday',
  default_business_hours: {
    monday: { open: '09:00', close: '17:00', closed: false },
    tuesday: { open: '09:00', close: '17:00', closed: false },
    wednesday: { open: '09:00', close: '17:00', closed: false },
    thursday: { open: '09:00', close: '17:00', closed: false },
    friday: { open: '09:00', close: '17:00', closed: false },
    saturday: { closed: true },
    sunday: { closed: true },
  },
  standard_shift_length_hours: 8.0,
  pay_period_type: 'monthly',
  pay_day: 'last_friday',
  currency_code: 'GBP',
  currency_symbol: '£',
  currency_format: 'symbol_before',
  fiscal_year_start_month: 4,
  company_country: 'United Kingdom',
};

