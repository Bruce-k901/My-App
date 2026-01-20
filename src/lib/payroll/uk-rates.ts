// UK Payroll Tax Rates and Constants
// Update annually - current rates for 2024/25

export const UK_TAX_RATES_2024_25 = {
  // Personal Allowance
  personalAllowance: 12570,
  
  // Income Tax Bands (Annual)
  incomeTax: {
    basicRate: 0.20,           // 20% on £12,571 - £50,270
    higherRate: 0.40,          // 40% on £50,271 - £125,140
    additionalRate: 0.45,      // 45% above £125,140
    basicRateLimit: 37700,     // (£50,270 - £12,570)
    higherRateLimit: 125140,
  },
  
  // National Insurance (Employee)
  employeeNI: {
    primaryThreshold: 12570,   // Annual (£242/week)
    upperEarningsLimit: 50270, // Annual (£967/week)
    mainRate: 0.08,            // 8% between thresholds (reduced from 12% in Jan 2024)
    upperRate: 0.02,           // 2% above UEL
  },
  
  // National Insurance (Employer)
  employerNI: {
    secondaryThreshold: 9100,  // Annual (£175/week) - changing April 2025!
    rate: 0.138,               // 13.8% (increasing to 15% April 2025)
    employmentAllowance: 5000, // If eligible
  },
  
  // Pension Auto-Enrollment
  pension: {
    qualifyingEarningsLower: 6240,   // Annual
    qualifyingEarningsUpper: 50270,  // Annual
    minEmployeeContribution: 0.05,   // 5%
    minEmployerContribution: 0.03,   // 3%
  },
  
  // Student Loans (Monthly thresholds)
  studentLoans: {
    plan1Threshold: 22015 / 12,      // £1,834.58/month
    plan2Threshold: 27295 / 12,      // £2,274.58/month
    plan4Threshold: 27660 / 12,      // £2,305/month (Scotland)
    plan5Threshold: 25000 / 12,      // £2,083.33/month
    postgraduateThreshold: 21000 / 12, // £1,750/month
    rate: 0.09,                      // 9% of earnings above threshold
    postgraduateRate: 0.06,          // 6% for postgraduate
  },
  
  // Holiday Accrual
  holidayAccrual: {
    irregularHoursRate: 0.1207,      // 12.07% for irregular hours workers
    statutoryMinWeeks: 5.6,          // 28 days for 5-day week
  },
  
  // Minimum Wage (April 2024)
  minimumWage: {
    age21Plus: 11.44,
    age18To20: 8.60,
    under18: 6.40,
    apprentice: 6.40,
  },
};

// 2025/26 Changes (apply from April 2025)
export const UK_TAX_RATES_2025_26 = {
  ...UK_TAX_RATES_2024_25,
  employerNI: {
    secondaryThreshold: 5000,        // Reduced from £9,100!
    rate: 0.15,                      // Increased from 13.8%!
    employmentAllowance: 10500,      // Increased from £5,000
  },
  minimumWage: {
    age21Plus: 12.21,                // Increased
    age18To20: 10.00,
    under18: 7.55,
    apprentice: 7.55,
  },
};

// Get current rates based on date
export function getCurrentRates(date: Date = new Date()): typeof UK_TAX_RATES_2024_25 {
  const april2025 = new Date('2025-04-01');
  return date >= april2025 ? UK_TAX_RATES_2025_26 : UK_TAX_RATES_2024_25;
}

