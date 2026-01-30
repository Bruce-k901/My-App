'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { 
  Settings,
  AlertTriangle,
  CheckCircle,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { calculatePayrollForEmployee } from './lib/payroll-calculations';
import { PayrollEmployee, SitePayroll } from './lib/payroll-types';
import PayrollSummaryCards from './components/PayrollSummaryCards';
import SitePayrollTable from './components/SitePayrollTable';
import EmployerCostsSummary from './components/EmployerCostsSummary';
import PayPeriodSelector from './components/PayPeriodSelector';
import { calculatePeriodForDate } from './lib/period-calculator';

export default function PayrollPage() {
  const { profile, companyId } = useAppContext();
  
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [periodStart, setPeriodStart] = useState<Date>(() => {
    // Default to start of current month
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [periodEnd, setPeriodEnd] = useState<Date>(() => {
    // Default to end of current month
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0);
  });
  const [payDate, setPayDate] = useState<Date>(() => {
    // Default to last day of month
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0);
  });
  const [payPeriodsPerYear, setPayPeriodsPerYear] = useState(12); // Default monthly
  const [schedule, setSchedule] = useState<any>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSite, setSelectedSite] = useState<string>('all');
  const [selectedPayType, setSelectedPayType] = useState<string>('all');
  
  // Load data
  useEffect(() => {
    if (companyId) {
      loadPayrunSchedule();
    }
  }, [companyId]);

  // Track period dates as strings to ensure useEffect triggers on changes
  const periodStartKey = periodStart?.toISOString().split('T')[0] || '';
  const periodEndKey = periodEnd?.toISOString().split('T')[0] || '';

  useEffect(() => {
    if (companyId && periodStart && periodEnd) {
      console.log('Period dates changed, reloading payroll data:', {
        start: periodStartKey,
        end: periodEndKey,
      });
      loadPayrollData();
    }
  }, [companyId, periodStartKey, periodEndKey]);

  // Load payrun schedule to get period settings
  async function loadPayrunSchedule() {
    if (!companyId) return;
    
    try {
      const { data: scheduleData, error } = await supabase
        .from('payrun_schedules')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error('Error loading schedule:', error);
        return;
      }
      
      if (scheduleData) {
        setSchedule(scheduleData);
        
        // Calculate periods per year based on schedule type
        const periodsMap: Record<string, number> = {
          weekly: 52,
          fortnightly: 26,
          monthly: 12,
          four_weekly: 13,
          last_friday: 12,
          last_day: 12,
        };
        setPayPeriodsPerYear(periodsMap[scheduleData.schedule_type] || 12);
        
        // Calculate current period based on schedule
        const today = new Date();
        const period = calculatePeriodForDate(today, scheduleData);
        setPeriodStart(period.start);
        setPeriodEnd(period.end);
        setPayDate(period.payDate);
      }
    } catch (error) {
      console.error('Error loading payrun schedule:', error);
    }
  }

  async function loadPayrollData() {
    if (!companyId) return;
    
    setLoading(true);
    
    try {
      // Get all active employees with their site info and pay details
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          pay_type,
          hourly_rate,
          annual_salary,
          tax_code,
          ni_category,
          pension_enrolled,
          pension_employee_pct,
          pension_employer_pct,
          student_loan_plan,
          home_site,
          contracted_hours
        `)
        .eq('company_id', companyId)
        .not('app_role', 'is', null) // Active employees only
        .order('full_name');
      
      // Get sites separately
      const { data: sitesData } = await supabase
        .from('sites')
        .select('id, name')
        .eq('company_id', companyId);
      
      const sitesMap = new Map((sitesData || []).map(s => [s.id, s.name]));
      
      if (profileError) throw profileError;
      
      // Get attendance hours for the period
      // Normalize dates to start/end of day for accurate filtering
      const periodStartNormalized = new Date(periodStart);
      periodStartNormalized.setHours(0, 0, 0, 0);
      const periodEndNormalized = new Date(periodEnd);
      periodEndNormalized.setHours(23, 59, 59, 999);
      
      const periodStartStr = periodStartNormalized.toISOString();
      const periodEndStr = periodEndNormalized.toISOString();
      
      console.log('Loading payroll data for period:', {
        start: periodStartStr,
        end: periodEndStr,
        startDate: periodStart.toLocaleDateString('en-GB'),
        endDate: periodEnd.toLocaleDateString('en-GB'),
      });
      
      // Get attendance hours for the period
      // Include ALL completed attendance records in the date range
      // IMPORTANT: Include site_id to track where work was actually performed
      // This allows us to attribute hours to the site where work was done, not the employee's home site
      const { data: attendanceData, error: attError } = await supabase
        .from('staff_attendance')
        .select('user_id, total_hours, clock_in_time, signed_off, payroll_locked, clock_out_time, site_id')
        .eq('company_id', companyId)
        .gte('clock_in_time', periodStartStr)
        .lte('clock_in_time', periodEndStr)
        .not('clock_out_time', 'is', null); // Only completed shifts (have clock_out_time)
      
      // Also get signed-off days from attendance_signoffs table
      // This ensures we capture all hours that have been signed off, even if the attendance record
      // itself doesn't have signed_off=true
      const { data: signoffsData, error: signoffError } = await supabase
        .from('attendance_signoffs')
        .select('staff_id, shift_date, signed_off')
        .eq('company_id', companyId)
        .eq('signed_off', true)
        .gte('shift_date', periodStartStr.split('T')[0])
        .lte('shift_date', periodEndStr.split('T')[0]);
      
      if (signoffError) {
        console.warn('Error fetching signoffs (non-critical):', signoffError);
      }
      
      // Create a set of signed-off dates by employee
      const signedOffDates = new Set<string>();
      (signoffsData || []).forEach(so => {
        signedOffDates.add(`${so.staff_id}-${so.shift_date}`);
      });
      
      console.log('Signoffs found:', {
        count: signoffsData?.length || 0,
        uniqueEmployees: new Set(signoffsData?.map(s => s.staff_id) || []).size,
      });
      
      // Get approved leave requests (holiday) for the period
      // Holiday pay = contracted hours per day × days taken × hourly rate
      const { data: leaveRequests, error: leaveError } = await supabase
        .from('leave_requests')
        .select('profile_id, start_date, end_date, days_taken, status')
        .eq('company_id', companyId)
        .eq('status', 'approved') // Only approved leave
        .gte('start_date', periodStartStr.split('T')[0])
        .lte('end_date', periodEndStr.split('T')[0]);
      
      if (leaveError) {
        console.warn('Error fetching leave requests (non-critical):', leaveError);
      }
      
      // Calculate holiday hours by employee
      // Key: employeeId, Value: total holiday hours
      const holidayHoursByEmployee = new Map<string, number>();
      
      (leaveRequests || []).forEach(leave => {
        const employeeId = leave.profile_id;
        const daysTaken = leave.days_taken || 0;
        
        // Find employee's contracted hours
        const emp = profileData?.find(p => p.id === employeeId);
        if (emp && emp.contracted_hours) {
          // Calculate hours per day: contracted hours per week / 5 days
          const hoursPerDay = emp.contracted_hours / 5;
          const holidayHours = daysTaken * hoursPerDay;
          
          const current = holidayHoursByEmployee.get(employeeId) || 0;
          holidayHoursByEmployee.set(employeeId, current + holidayHours);
        }
      });
      
      console.log('Holiday hours by employee:', {
        totalLeaveRequests: leaveRequests?.length || 0,
        employeesWithHoliday: holidayHoursByEmployee.size,
        sample: Array.from(holidayHoursByEmployee.entries())
          .slice(0, 5)
          .map(([id, hours]) => ({
            employeeId: id,
            holidayHours: hours,
            employeeName: profileData?.find(p => p.id === id)?.full_name || 'Unknown',
          })),
      });
      
      if (attError) {
        console.error('Error fetching attendance:', attError);
        throw attError;
      }
      
      // Log what we're getting
      console.log('=== ATTENDANCE QUERY RESULTS ===');
      console.log('Date range:', {
        start: periodStartStr,
        end: periodEndStr,
        startDisplay: periodStart.toLocaleDateString('en-GB'),
        endDisplay: periodEnd.toLocaleDateString('en-GB'),
      });
      console.log('Attendance records found:', {
        totalRecords: attendanceData?.length || 0,
        signedOff: attendanceData?.filter(a => a.signed_off).length || 0,
        payrollLocked: attendanceData?.filter(a => a.payroll_locked).length || 0,
        withHours: attendanceData?.filter(a => a.total_hours && a.total_hours > 0).length || 0,
        withNullHours: attendanceData?.filter(a => !a.total_hours || a.total_hours === 0).length || 0,
      });
      console.log('Total hours in records:', attendanceData?.reduce((sum, a) => sum + (a.total_hours || 0), 0) || 0);
      console.log('Sample records (first 5):', attendanceData?.slice(0, 5).map(a => ({
        userId: a.user_id,
        clockIn: a.clock_in_time,
        totalHours: a.total_hours,
        signedOff: a.signed_off,
        payrollLocked: a.payroll_locked,
      })));
      console.log('=== END ATTENDANCE QUERY ===');
      
      // Sum hours by employee AND site (where work was actually performed)
      // This allows employees to appear in multiple sites if they worked at different locations
      // Key format: "employeeId-siteId" (or "employeeId-null" for unassigned)
      const hoursByEmployeeAndSite = new Map<string, { employeeId: string; siteId: string | null; hours: number }>();
      let recordsWithNullHours = 0;
      let recordsWithZeroHours = 0;
      let recordsWithValidHours = 0;
      
      (attendanceData || []).forEach(att => {
        const employeeId = att.user_id;
        const siteId = att.site_id || null; // Use site_id from attendance record (where work was done)
        const key = `${employeeId}-${siteId || 'unassigned'}`;
        
        const existing = hoursByEmployeeAndSite.get(key);
        let hours = att.total_hours;
        
        // Handle null/undefined total_hours
        if (hours === null || hours === undefined) {
          recordsWithNullHours++;
          hours = 0;
          console.warn(`Attendance record has null total_hours for user ${employeeId}, site ${siteId}, clock_in: ${att.clock_in_time}`);
        } else if (hours === 0) {
          recordsWithZeroHours++;
        } else {
          recordsWithValidHours++;
        }
        
        if (existing) {
          existing.hours += hours;
        } else {
          hoursByEmployeeAndSite.set(key, {
            employeeId,
            siteId,
            hours,
          });
        }
      });
      
      console.log('Hours by employee and site:', {
        totalRecords: attendanceData?.length || 0,
        recordsWithValidHours,
        recordsWithNullHours,
        recordsWithZeroHours,
        uniqueEmployeeSiteCombos: hoursByEmployeeAndSite.size,
        sample: Array.from(hoursByEmployeeAndSite.entries())
          .filter(([_, data]) => data.hours > 0)
          .slice(0, 10)
          .map(([key, data]) => ({
            key,
            employeeId: data.employeeId,
            siteId: data.siteId,
            siteName: data.siteId ? (sitesMap.get(data.siteId) || 'Unknown') : 'Unassigned',
            hours: data.hours,
            employeeName: profileData?.find(p => p.id === data.employeeId)?.full_name || 'Unknown',
          })),
      });
      
      // Calculate payroll for each employee-site combination
      // This means an employee can appear multiple times if they worked at multiple sites
      const payrollEmployees: PayrollEmployee[] = [];
      
      for (const [key, data] of hoursByEmployeeAndSite.entries()) {
        // Skip if no hours worked
        if (data.hours <= 0) continue;
        
        // Find employee profile
        const emp = profileData?.find(p => p.id === data.employeeId);
        if (!emp) {
          console.warn(`Employee profile not found for ${data.employeeId}`);
          continue;
        }
        
        // Get site name (where work was actually performed)
        const siteName = data.siteId 
          ? (sitesMap.get(data.siteId) || 'Unassigned')
          : (emp.home_site ? (sitesMap.get(emp.home_site) || 'Unassigned') : 'Unassigned');
        
        // Use the site where work was performed, fallback to home_site if site_id is null
        const effectiveSiteId = data.siteId || emp.home_site;
        
        // Get holiday hours for this employee
        const holidayHours = holidayHoursByEmployee.get(emp.id) || 0;
        
        const payrollEntry = calculatePayrollForEmployee({
          employeeId: emp.id,
          fullName: emp.full_name || 'Unknown',
          payType: emp.pay_type || 'hourly',
          hourlyRate: emp.hourly_rate,
          annualSalary: emp.annual_salary,
          siteId: effectiveSiteId, // Site where work was performed
          siteName,
          taxCode: emp.tax_code,
          niCategory: emp.ni_category,
          pensionEnrolled: emp.pension_enrolled || false,
          pensionContributionPct: emp.pension_employee_pct,
          studentLoan: !!emp.student_loan_plan,
          studentLoanPlan: emp.student_loan_plan,
          hoursWorked: data.hours, // Hours worked at this specific site
          holidayHours, // Holiday hours for this employee
          contractedHours: emp.contracted_hours, // For holiday pay calculation
          payPeriodsPerYear,
        });
        
        payrollEmployees.push(payrollEntry);
      }
      
      // For salaried employees with no attendance records, still include them at their home site
      // (they get paid regardless of hours worked)
      for (const emp of profileData || []) {
        if (emp.pay_type === 'salaried' && emp.annual_salary) {
          // Check if we already have an entry for this employee at their home site
          const hasEntry = payrollEmployees.some(
            e => e.employeeId === emp.id && e.siteId === emp.home_site
          );
          
          if (!hasEntry) {
            const siteName = emp.home_site ? (sitesMap.get(emp.home_site) || 'Unassigned') : 'Unassigned';
            const holidayHours = holidayHoursByEmployee.get(emp.id) || 0;
            const payrollEntry = calculatePayrollForEmployee({
              employeeId: emp.id,
              fullName: emp.full_name || 'Unknown',
              payType: 'salaried',
              hourlyRate: null,
              annualSalary: emp.annual_salary,
              siteId: emp.home_site,
              siteName,
              taxCode: emp.tax_code,
              niCategory: emp.ni_category,
              pensionEnrolled: emp.pension_enrolled || false,
              pensionContributionPct: emp.pension_employee_pct,
              studentLoan: !!emp.student_loan_plan,
              studentLoanPlan: emp.student_loan_plan,
              hoursWorked: 0, // Salaried staff don't need hours for pay calculation
              holidayHours, // Holiday hours for this employee
              contractedHours: emp.contracted_hours, // For holiday pay calculation
              payPeriodsPerYear,
            });
            payrollEmployees.push(payrollEntry);
          }
        }
      }
      
      console.log('Payroll employees calculated:', {
        total: payrollEmployees.length,
        withHours: payrollEmployees.filter(e => e.hoursWorked > 0).length,
        salaried: payrollEmployees.filter(e => e.payType === 'salaried').length,
        hourly: payrollEmployees.filter(e => e.payType === 'hourly').length,
        totalGrossPay: payrollEmployees.reduce((sum, e) => sum + e.grossPay, 0),
      });
      
      setEmployees(payrollEmployees);
      
    } catch (err: any) {
      console.error('Error loading payroll:', err);
      toast.error('Failed to load payroll data');
    } finally {
      setLoading(false);
    }
  }

  // Group employees by site
  const sitePayrolls = useMemo(() => {
    const siteMap = new Map<string, SitePayroll>();
    
    employees
      .filter(emp => {
        if (searchTerm && !emp.fullName.toLowerCase().includes(searchTerm.toLowerCase())) {
          return false;
        }
        if (selectedSite !== 'all' && emp.siteId !== selectedSite) {
          return false;
        }
        if (selectedPayType !== 'all' && emp.payType !== selectedPayType) {
          return false;
        }
        return true;
      })
      .forEach(emp => {
        const siteKey = emp.siteId || 'unassigned';
        
        if (!siteMap.has(siteKey)) {
          siteMap.set(siteKey, {
            siteId: emp.siteId,
            siteName: emp.siteName || 'Unassigned',
            employees: [],
            totalHours: 0,
            totalGrossPay: 0,
            totalNetPay: 0,
            totalEmployerCost: 0,
          });
        }
        
        const site = siteMap.get(siteKey)!;
        site.employees.push(emp);
        site.totalHours += emp.hoursWorked;
        site.totalGrossPay += emp.grossPay;
        site.totalNetPay += emp.estimatedNetPay;
        site.totalEmployerCost += emp.totalEmployerCost;
      });
    
    return Array.from(siteMap.values()).sort((a, b) => 
      a.siteName.localeCompare(b.siteName)
    );
  }, [employees, searchTerm, selectedSite, selectedPayType]);

  // Grand totals
  const totals = useMemo(() => {
    return sitePayrolls.reduce((acc, site) => ({
      employees: acc.employees + site.employees.length,
      hours: acc.hours + site.totalHours,
      grossPay: acc.grossPay + site.totalGrossPay,
      netPay: acc.netPay + site.totalNetPay,
      employerNi: acc.employerNi + site.employees.reduce((sum, e) => sum + e.employerNi, 0),
      employerPension: acc.employerPension + site.employees.reduce((sum, e) => sum + e.employerPension, 0),
      holidayAccrual: acc.holidayAccrual + site.employees.reduce((sum, e) => sum + e.holidayAccrual, 0),
      employerCost: acc.employerCost + site.totalEmployerCost,
    }), {
      employees: 0,
      hours: 0,
      grossPay: 0,
      netPay: 0,
      employerNi: 0,
      employerPension: 0,
      holidayAccrual: 0,
      employerCost: 0,
    });
  }, [sitePayrolls]);

  // Get unique sites for filter
  const sites = useMemo(() => {
    const siteSet = new Map<string, string>();
    employees.forEach(emp => {
      if (emp.siteId) {
        siteSet.set(emp.siteId, emp.siteName || 'Unknown');
      }
    });
    return Array.from(siteSet.entries()).map(([id, name]) => ({ id, name }));
  }, [employees]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white">Loading payroll data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0D13] text-white p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Payroll</h1>
            <p className="text-white/60 text-sm">
              Review and process employee pay
            </p>
          </div>
          
          <div className="flex gap-3">
            <PayPeriodSelector
              periodStart={periodStart}
              periodEnd={periodEnd}
              payDate={payDate}
              schedule={schedule}
              onPeriodChange={(start, end, payDate) => {
                setPeriodStart(start);
                setPeriodEnd(end);
                setPayDate(payDate);
              }}
            />
            
            <Link href="/dashboard/people/payroll/settings">
              <Button className="bg-transparent border border-[#EC4899] text-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)]">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </Link>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-4 mb-6">
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-500/20 text-yellow-400">
            Pending Review
          </span>
          <span className="text-white/60">
            Pay Date: {payDate.toLocaleDateString('en-GB', { 
              day: 'numeric', 
              month: 'short', 
              year: 'numeric' 
            })}
          </span>
        </div>

        {/* Summary Cards */}
        <PayrollSummaryCards
          employees={totals.employees}
          hours={totals.hours}
          grossPay={totals.grossPay}
          employerCost={totals.employerCost}
        />

        {/* Approve Button */}
        <div className="mb-6">
          <Button className="bg-transparent border border-[#EC4899] text-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)]">
            <CheckCircle className="w-4 h-4 mr-2" />
            Approve Payroll Run
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <input
            type="text"
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-2 text-sm w-64 text-white placeholder-white/40"
          />
          
          <select
            value={selectedSite}
            onChange={(e) => setSelectedSite(e.target.value)}
            className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-2 text-sm text-white"
          >
            <option value="all">All Sites</option>
            {sites.map(site => (
              <option key={site.id} value={site.id}>{site.name}</option>
            ))}
          </select>
          
          <select
            value={selectedPayType}
            onChange={(e) => setSelectedPayType(e.target.value)}
            className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-2 text-sm text-white"
          >
            <option value="all">All Pay Types</option>
            <option value="hourly">Hourly</option>
            <option value="salaried">Salaried</option>
          </select>
        </div>

        {/* Site Tables */}
        {sitePayrolls.map(site => (
          <SitePayrollTable
            key={site.siteId || 'unassigned'}
            site={site}
          />
        ))}

        {/* No results */}
        {sitePayrolls.length === 0 && (
          <div className="text-center py-12 text-white/60">
            No employees found matching your filters
          </div>
        )}

        {/* Employer Costs Summary */}
        <EmployerCostsSummary
          grossPay={totals.grossPay}
          employerNi={totals.employerNi}
          employerPension={totals.employerPension}
          holidayAccrual={totals.holidayAccrual}
          totalCost={totals.employerCost}
        />

        {/* Disclaimer */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-400 font-medium">Estimated Costs</p>
              <p className="text-sm text-white/60 mt-1">
                The costs shown are estimates for manager review. Your accounting software 
                will calculate the actual tax deductions and National Insurance. Please review 
                the hours and rates before approving.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
