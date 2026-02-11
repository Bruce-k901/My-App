'use client';

import { Building2 } from '@/components/ui/icons';
import Link from 'next/link';
import { SitePayroll } from '../lib/payroll-types';

interface Props {
  site: SitePayroll;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}

function formatHours(hours: number): string {
  return `${hours.toFixed(1)}h`;
}

export default function SitePayrollTable({ site }: Props) {
  return (
    <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl mb-4 overflow-hidden">
      {/* Site Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-white/[0.05]">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-gray-900 dark:text-white/60" />
          <span className="font-medium text-gray-900 dark:text-white">{site.siteName}</span>
        </div>
        <span className="text-sm text-gray-900 dark:text-white/60">
          {site.employees.length} {site.employees.length === 1 ? 'employee' : 'employees'}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-gray-900 dark:text-white/60 text-xs uppercase">
            <tr className="border-b border-gray-200 dark:border-white/[0.06]">
              <th className="text-left px-4 py-3 font-medium">Employee</th>
              <th className="text-left px-4 py-3 font-medium">Pay Type</th>
              <th className="text-right px-4 py-3 font-medium">Worked Hours</th>
              <th className="text-right px-4 py-3 font-medium">Holiday Hours</th>
              <th className="text-right px-4 py-3 font-medium">Rate</th>
              <th className="text-right px-4 py-3 font-medium">Gross Pay</th>
              <th className="text-right px-4 py-3 font-medium">PAYE</th>
              <th className="text-right px-4 py-3 font-medium">NI</th>
              <th className="text-right px-4 py-3 font-medium">Est. Net Pay</th>
              <th className="text-right px-4 py-3 font-medium">Employer Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-white/[0.06]">
            {site.employees.map(emp => (
              <tr key={emp.employeeId} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                  <Link 
                    href={`/dashboard/people/${emp.employeeId}`}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-600 dark:text-blue-400/80 hover:underline transition-colors"
                  >
                    {emp.fullName}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className={`
                    px-2 py-0.5 rounded text-xs
                    ${emp.payType === 'salaried' 
                      ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400' 
                      : 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                    }
                  `}>
                    {emp.payType === 'salaried' ? 'Salaried' : 'Hourly'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-gray-900 dark:text-white/60">
                  {formatHours(emp.hoursWorked)}
                </td>
                <td className="px-4 py-3 text-right text-gray-900 dark:text-white/60">
                  {emp.holidayHours > 0 ? formatHours(emp.holidayHours) : '—'}
                </td>
                <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                  {emp.payType === 'salaried' 
                    ? formatCurrency(emp.annualSalary || 0)
                    : `${formatCurrency(emp.hourlyRate || 0)}/hr`
                  }
                </td>
                <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                  {formatCurrency(emp.grossPay)}
                </td>
                <td className="px-4 py-3 text-right text-gray-900 dark:text-white/60">
                  {formatCurrency(emp.estimatedPaye)}
                </td>
                <td className="px-4 py-3 text-right text-gray-900 dark:text-white/60">
                  {formatCurrency(emp.estimatedNi)}
                </td>
                <td className="px-4 py-3 text-right font-medium text-blue-600 dark:text-blue-400">
                  {formatCurrency(emp.estimatedNetPay)}
                </td>
                <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                  {formatCurrency(emp.totalEmployerCost)}
                </td>
              </tr>
            ))}
          </tbody>
          
          {/* Site Totals */}
          <tfoot className="bg-gray-50 dark:bg-white/[0.05] font-medium">
            <tr>
              <td className="px-4 py-3 text-gray-900 dark:text-white" colSpan={2}>Site Total:</td>
              <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                {formatHours(site.employees.reduce((sum, e) => sum + e.hoursWorked, 0))}
              </td>
              <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                {formatHours(site.employees.reduce((sum, e) => sum + e.holidayHours, 0))}
              </td>
              <td className="px-4 py-3 text-right text-gray-900 dark:text-white/60">—</td>
              <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{formatCurrency(site.totalGrossPay)}</td>
              <td className="px-4 py-3 text-right" colSpan={2}></td>
              <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400">
                {formatCurrency(site.totalNetPay)}
              </td>
              <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                {formatCurrency(site.totalEmployerCost)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      
      {/* Footnote for salaried */}
      {site.employees.some(e => e.payType === 'salaried') && (
        <div className="px-4 py-2 text-xs text-gray-900 dark:text-white/40 border-t border-gray-200 dark:border-white/[0.06]">
          * Hours shown for salaried staff are for attendance tracking only, not pay calculation
        </div>
      )}
    </div>
  );
}

