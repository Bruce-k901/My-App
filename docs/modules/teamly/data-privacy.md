# Teamly Sensitive Data Analysis

## Comprehensive Security & Permissions Audit

**Date:** March 2025  
**Purpose:** Identify all potentially sensitive data across Teamly pages to inform permissions and roles system design

---

## Executive Summary

This document catalogs all sensitive data accessed, displayed, and modified across the Teamly HR/People Management module. Data is categorized by sensitivity level and access requirements to guide the permissions system design.

### Sensitivity Categories

- **🔴 CRITICAL (PII/Financial)**: Personal Identifiable Information, financial data, banking details
- **🟠 HIGH (Employment)**: Employment terms, performance data, disciplinary records
- **🟡 MEDIUM (Operational)**: Schedule data, attendance, leave requests
- **🟢 LOW (Public)**: General directory info, public announcements

---

## Page-by-Page Analysis

### 1. Dashboard (`/dashboard/people`)

**Route:** `/dashboard/people/page.tsx`

#### Data Accessed:

- **Employee Counts** (Aggregated)
  - Total employees
  - Active employees
  - On leave today
  - Clocked in today
  - Active onboardings
- **Leave Requests** (Count only)
  - Pending leave requests count
- **Training** (Count only)
  - Expiring training certificates count
- **Recruitment** (Count only)
  - Open jobs count
  - Pending applications count

#### Database Tables:

- `profiles` (via RPC: `get_company_profiles`)
- `leave_requests`
- Training records (via RPC: `get_expiring_training`)
- `jobs`
- `time_entries`

#### Sensitive Operations:

- **View**: Aggregated statistics only (no individual data)
- **Access Level**: Company-wide aggregated data

#### Permissions Required:

- **View Dashboard**: All employees
- **View Manager Stats**: Managers, Admins, Owners

---

### 2. Employee Directory (`/dashboard/people/employees`)

**Route:** `/dashboard/people/employees/page.tsx`

#### Data Accessed:

- **🔴 Personal Information**
  - Full name
  - Email address
  - Phone number
  - Date of birth
  - Gender
  - Nationality
  - Address (line 1, line 2, city, county, postcode, country)
  - Emergency contacts (name, relationship, phone)
- **🟠 Employment Information**
  - Employee number
  - Position title
  - Department
  - Employment type (hourly/salaried)
  - Start date
  - Probation end date
  - Contract type
  - Contracted hours
  - Hourly rate
  - Salary
  - Pay frequency
  - Notice period
  - Reports to (manager)
  - Home site
  - Site assignments
  - Status (active/inactive/onboarding)
  - App role
- **🔴 Financial Information**
  - Hourly rate
  - Salary
  - Bank name
  - Bank account name
  - Bank account number
  - Bank sort code
- **🔴 Tax & Compliance**
  - National Insurance number
  - Tax code
  - Student loan status
  - Student loan plan
  - Pension enrolled status
  - Pension contribution percent
  - P45 received status
- **🟠 Right to Work**
  - Right to work status
  - Right to work expiry date
- **🟠 DBS Checks**
  - DBS status
  - DBS certificate number
  - DBS check date
- **🟡 Leave Information**
  - Annual leave allowance
  - Leave balances
- **🟡 Training**
  - Training records
  - Certifications
  - Expiry dates
- **🟡 Performance**
  - Review history
  - Goals
  - 1:1 notes

#### Database Tables:

- `profiles` (full employee records)
- `sites` (site assignments)
- `departments`
- `leave_balances`
- `training_records`
- `performance_reviews`
- `emergency_contacts`

#### Sensitive Operations:

- **View**: Full employee profiles
- **Edit**: Employee details (name, contact, employment info)
- **Delete**: Archive employees
- **Create**: Add new employees
- **Export**: Export employee data

#### Permissions Required:

- **View Own Profile**: All employees
- **View Team Members**: Managers (their direct reports)
- **View All Employees**: HR, Admins, Owners
- **Edit Own Profile**: All employees (limited fields)
- **Edit Employee Data**: HR, Managers (for their team), Admins, Owners
- **View Financial Data**: Payroll, Admins, Owners only
- **View Compliance Data**: HR, Compliance Officers, Admins, Owners
- **Delete/Archive**: HR, Admins, Owners only

---

### 3. Individual Employee Profile (`/dashboard/people/[id]`)

**Route:** `/dashboard/people/[id]/page.tsx`

#### Data Accessed:

**ALL data from Employee Directory PLUS:**

- **🔴 Complete Personal Details**
  - Full address
  - Emergency contacts (full details)
  - Date of birth
  - Nationality
- **🔴 Complete Financial Details**
  - Banking information (full)
  - Tax information
  - Pension details
- **🟠 Complete Employment History**
  - Full employment record
  - Performance reviews (all)
  - Disciplinary records
  - Notes and annotations
- **🟡 Attendance History**
  - Time entries
  - Clock in/out records
  - Absence records
- **🟡 Leave History**
  - All leave requests
  - Leave balances by year
  - Leave calendar
- **🟡 Training History**
  - All training records
  - Certification expiry dates
  - Training matrix
- **🟡 Documents**
  - Employment contracts
  - Right to work documents
  - DBS certificates
  - Training certificates
  - Performance review documents
  - Disciplinary documents
  - Custom documents

#### Database Tables:

- `profiles` (complete record)
- `time_entries`
- `leave_requests`
- `leave_balances`
- `training_records`
- `performance_reviews`
- `employee_documents`
- `employee_notes`
- `emergency_contacts`

#### Sensitive Operations:

- **View**: Complete employee record
- **Edit**: All employee fields
- **Upload Documents**: Add documents to employee file
- **Delete Documents**: Remove documents
- **Add Notes**: Add private notes
- **View Notes**: View all notes (including private)

#### Permissions Required:

- **View Own Profile**: All employees (full access to own data)
- **View Employee Profile**:
  - Direct manager (their reports)
  - HR team
  - Admins, Owners
- **Edit Employee Profile**:
  - Own profile (limited fields)
  - Direct manager (their reports, limited fields)
  - HR (all fields)
  - Admins, Owners (all fields)
- **View Financial Data**: Payroll, Admins, Owners only
- **View Compliance Documents**: HR, Compliance Officers, Admins, Owners
- **Upload Documents**: HR, Managers (for their team), Admins, Owners
- **View Private Notes**: HR, Admins, Owners only

---

### 4. Schedule/Rota (`/dashboard/people/schedule`)

**Route:** `/dashboard/people/schedule/page.tsx`

#### Data Accessed:

- **🟡 Schedule Data**
  - Shift assignments (date, time, role)
  - Staff assignments
  - Shift costs (estimated)
  - Break times
  - Shift notes
  - Shift status (draft/published/approved)
- **🟠 Financial Data**
  - Hourly rates (for cost calculation)
  - Estimated shift costs
  - Labor cost forecasts
- **🟡 Availability**
  - Employee availability
  - Time-off requests
  - Unavailability periods
- **🟡 Site Information**
  - Site-specific schedules
  - Site closures
  - Company-wide closures

#### Database Tables:

- `shifts`
- `profiles` (for staff info and rates)
- `sites`
- `site_closures`
- `company_closures`
- `availability_requests`
- `rota_day_approvals`

#### Sensitive Operations:

- **View Schedule**: All employees (own shifts), Managers (team/area), Admins (all)
- **Create Shifts**: Managers, Admins, Owners
- **Edit Shifts**: Managers (their area), Admins, Owners
- **Delete Shifts**: Managers (their area), Admins, Owners
- **Approve Rotas**: Managers, Admins, Owners
- **View Costs**: Managers, Admins, Owners (hourly rates visible)
- **Publish Schedule**: Managers, Admins, Owners

#### Permissions Required:

- **View Own Schedule**: All employees
- **View Team Schedule**: Managers (their direct reports)
- **View Site Schedule**: Site Managers, Area Managers, Admins, Owners
- **View All Schedules**: Admins, Owners
- **View Hourly Rates**: Managers (for cost calculation), Admins, Owners
- **Create/Edit Shifts**: Managers (their area), Admins, Owners
- **Approve Rotas**: Managers, Admins, Owners
- **Publish Schedule**: Managers, Admins, Owners

---

### 5. Payroll (`/dashboard/people/payroll`)

**Route:** `/dashboard/people/payroll/page.tsx`

#### Data Accessed:

- **🔴 Financial Data**
  - Hourly rates
  - Salaries
  - Hours worked
  - Gross pay
  - Net pay
  - Tax deductions
  - National Insurance deductions
  - Pension contributions
  - Student loan deductions
  - Other deductions
  - Employer costs (NI, pension)
  - Total payroll costs
- **🟡 Time & Attendance**
  - Time entries
  - Clock in/out times
  - Break times
  - Overtime hours
  - Holiday pay
- **🟡 Pay Periods**
  - Pay period dates
  - Pay dates
  - Pay frequency

#### Database Tables:

- `profiles` (rates, salary, tax info)
- `time_entries`
- `shifts`
- `payrun_schedules`
- `payruns`
- `payslips`

#### Sensitive Operations:

- **View Payroll**: Payroll team, Admins, Owners only
- **Calculate Payroll**: Payroll team, Admins, Owners
- **Submit Payroll**: Payroll team, Admins, Owners
- **View Payslips**: Employees (own), Payroll, Admins, Owners
- **Export Payroll**: Payroll, Admins, Owners

#### Permissions Required:

- **View Own Payslip**: All employees
- **View Payroll Data**: Payroll team, Admins, Owners only
- **Calculate Payroll**: Payroll team, Admins, Owners
- **Submit Payroll**: Payroll team, Admins, Owners
- **Export Payroll**: Payroll, Admins, Owners
- **View Employee Rates**: Payroll, Admins, Owners only

---

### 6. Attendance Sign-Off (`/dashboard/people/attendance/signoff`)

**Route:** `/dashboard/people/attendance/signoff/page.tsx`

#### Data Accessed:

- **🟡 Time Entries**
  - Clock in/out times
  - Break times
  - Hours worked
  - Overtime hours
  - Shift assignments
- **🟠 Employee Information**
  - Employee names
  - Positions
  - Hourly rates (for cost calculation)
- **🟡 Week Summaries**
  - Total hours per week
  - Total costs per week
  - Overtime calculations

#### Database Tables:

- `time_entries`
- `profiles` (for employee info and rates)
- `shifts`

#### Sensitive Operations:

- **View Timesheets**: Managers (their team), Payroll, Admins, Owners
- **Edit Time Entries**: Managers (their team), Payroll, Admins, Owners
- **Approve Timesheets**: Managers, Payroll, Admins, Owners
- **Submit to Payroll**: Managers, Payroll, Admins, Owners
- **View Costs**: Managers, Payroll, Admins, Owners

#### Permissions Required:

- **View Own Timesheet**: All employees
- **View Team Timesheets**: Managers (their direct reports)
- **View All Timesheets**: Payroll, Admins, Owners
- **Edit Time Entries**: Managers (their team), Payroll, Admins, Owners
- **Approve Timesheets**: Managers, Payroll, Admins, Owners
- **Submit to Payroll**: Managers, Payroll, Admins, Owners
- **View Hourly Rates**: Managers (for cost calculation), Payroll, Admins, Owners

---

### 7. Leave Management (`/dashboard/people/leave`)

**Route:** `/dashboard/people/leave/page.tsx`

#### Data Accessed:

- **🟡 Leave Requests**
  - Leave type
  - Start date
  - End date
  - Days requested
  - Status (pending/approved/rejected)
  - Requested by
  - Reviewed by
  - Review date
  - Reason/notes
- **🟡 Leave Balances**
  - Annual leave allowance
  - Leave taken
  - Leave remaining
  - Leave by type
- **🟡 Leave Calendar**
  - All approved leave
  - Team leave calendar
  - Company-wide leave calendar

#### Database Tables:

- `leave_requests`
- `leave_balances_view`
- `leave_calendar_view`
- `profiles` (for employee info)

#### Sensitive Operations:

- **View Own Leave**: All employees
- **View Team Leave**: Managers (their direct reports)
- **View All Leave**: HR, Admins, Owners
- **Request Leave**: All employees
- **Approve/Reject Leave**: Managers (their team), HR, Admins, Owners
- **View Leave Balances**: Employees (own), Managers (their team), HR, Admins, Owners

#### Permissions Required:

- **View Own Leave**: All employees
- **Request Leave**: All employees
- **View Team Leave**: Managers (their direct reports)
- **View All Leave**: HR, Admins, Owners
- **Approve Leave**: Managers (their team), HR, Admins, Owners
- **View Leave Balances**: Employees (own), Managers (their team), HR, Admins, Owners
- **Edit Leave Balances**: HR, Admins, Owners only

---

### 8. Performance Reviews (`/dashboard/people/reviews`)

**Route:** `/dashboard/people/reviews/page.tsx` and sub-pages

#### Data Accessed:

- **🟠 Performance Data**
  - Review scores
  - Review comments
  - Goals and objectives
  - 1:1 meeting notes
  - Performance ratings
  - Strengths and weaknesses
  - Development plans
- **🟠 Review History**
  - All past reviews
  - Review templates
  - Review schedules
- **🟡 Goals**
  - Employee goals
  - Goal progress
  - Goal completion status

#### Database Tables:

- `performance_reviews`
- `review_templates`
- `review_goals`
- `one_on_ones`
- `profiles` (for employee info)

#### Sensitive Operations:

- **View Own Reviews**: All employees
- **View Team Reviews**: Managers (their direct reports)
- **View All Reviews**: HR, Admins, Owners
- **Create Reviews**: Managers (their team), HR, Admins, Owners
- **Edit Reviews**: Managers (their team), HR, Admins, Owners
- **View 1:1 Notes**: Employees (own), Managers (their team), HR, Admins, Owners

#### Permissions Required:

- **View Own Reviews**: All employees
- **View Team Reviews**: Managers (their direct reports)
- **View All Reviews**: HR, Admins, Owners
- **Create Reviews**: Managers (their team), HR, Admins, Owners
- **Edit Reviews**: Managers (their team), HR, Admins, Owners
- **View 1:1 Notes**: Employees (own), Managers (their team), HR, Admins, Owners
- **View Private Notes**: HR, Admins, Owners only

---

### 9. Training (`/dashboard/people/training`)

**Route:** `/dashboard/people/training/page.tsx` and sub-pages

#### Data Accessed:

- **🟡 Training Records**
  - Training completed
  - Training dates
  - Certification expiry dates
  - Training providers
  - Training costs
- **🟡 Training Matrix**
  - Required training by role
  - Training compliance status
  - Missing training
  - Expiring certifications

#### Database Tables:

- `training_records`
- `training_matrix`
- `training_templates`
- `profiles` (for employee info)

#### Sensitive Operations:

- **View Own Training**: All employees
- **View Team Training**: Managers (their direct reports)
- **View All Training**: HR, Training Managers, Admins, Owners
- **Record Training**: HR, Training Managers, Admins, Owners
- **View Training Costs**: HR, Training Managers, Admins, Owners
- **View Compliance Matrix**: Managers, HR, Admins, Owners

#### Permissions Required:

- **View Own Training**: All employees
- **View Team Training**: Managers (their direct reports)
- **View All Training**: HR, Training Managers, Admins, Owners
- **Record Training**: HR, Training Managers, Admins, Owners
- **View Training Costs**: HR, Training Managers, Admins, Owners
- **View Compliance Matrix**: Managers, HR, Admins, Owners

---

### 10. Recruitment (`/dashboard/people/recruitment`)

**Route:** `/dashboard/people/recruitment/page.tsx` and sub-pages

#### Data Accessed:

- **🟡 Candidate Information**
  - Candidate name
  - Email
  - Phone number
  - Application status
  - Application date
  - Job applied for
  - Source
  - Tags
- **🟠 Interview Data**
  - Interview notes
  - Interview scores
  - Interview feedback
  - Interview dates
- **🟡 Job Postings**
  - Job titles
  - Job descriptions
  - Salary ranges
  - Job status

#### Database Tables:

- `candidates`
- `applications`
- `jobs`
- `interviews`
- `interview_notes`

#### Sensitive Operations:

- **View Candidates**: HR, Recruiters, Hiring Managers, Admins, Owners
- **View Applications**: HR, Recruiters, Hiring Managers, Admins, Owners
- **View Interview Notes**: HR, Recruiters, Hiring Managers, Admins, Owners
- **Create Jobs**: HR, Hiring Managers, Admins, Owners
- **Edit Jobs**: HR, Hiring Managers, Admins, Owners
- **View Salary Ranges**: HR, Hiring Managers, Admins, Owners

#### Permissions Required:

- **View Candidates**: HR, Recruiters, Hiring Managers, Admins, Owners
- **View Applications**: HR, Recruiters, Hiring Managers, Admins, Owners
- **View Interview Notes**: HR, Recruiters, Hiring Managers, Admins, Owners
- **Create Jobs**: HR, Hiring Managers, Admins, Owners
- **Edit Jobs**: HR, Hiring Managers, Admins, Owners
- **View Salary Ranges**: HR, Hiring Managers, Admins, Owners
- **Make Hiring Decisions**: HR, Hiring Managers, Admins, Owners

---

### 11. Onboarding (`/dashboard/people/onboarding`)

**Route:** `/dashboard/people/onboarding/page.tsx` and sub-pages

#### Data Accessed:

- **🟡 Onboarding Status**
  - Onboarding progress
  - Onboarding tasks
  - Document completion status
- **🟠 Onboarding Documents**
  - Employment contracts
  - Right to work documents
  - Bank details forms
  - Tax forms
  - Emergency contact forms
- **🟡 Onboarding Packs**
  - Standard onboarding documents
  - Company documents
  - Training materials

#### Database Tables:

- `onboarding_packs`
- `onboarding_tasks`
- `employee_documents`
- `profiles` (for employee info)

#### Sensitive Operations:

- **View Own Onboarding**: All employees (new hires)
- **View Team Onboarding**: Managers (their new hires)
- **View All Onboarding**: HR, Admins, Owners
- **Upload Documents**: Employees (own), HR, Admins, Owners
- **View Documents**: Employees (own), HR, Admins, Owners
- **Create Onboarding Packs**: HR, Admins, Owners

#### Permissions Required:

- **View Own Onboarding**: All employees (new hires)
- **View Team Onboarding**: Managers (their new hires)
- **View All Onboarding**: HR, Admins, Owners
- **Upload Documents**: Employees (own), HR, Admins, Owners
- **View Documents**: Employees (own), HR, Admins, Owners
- **Create Onboarding Packs**: HR, Admins, Owners

---

### 12. Settings Pages (`/dashboard/people/settings/*`)

#### 12.1 General Settings (`/dashboard/people/settings/general`)

**Data Accessed:**

- **🟢 Company Information**
  - Company name
  - Company address
  - Company phone
  - Company email
  - Company website
  - Timezone
  - Date/time formats
  - Working hours
  - Pay periods
  - Currency
  - Fiscal year
  - Company-wide closures

**Permissions Required:**

- **View**: All employees
- **Edit**: Admins, Owners only

---

#### 12.2 Sites (`/dashboard/people/settings/sites`)

**Data Accessed:**

- **🟢 Site Information**
  - Site names
  - Site addresses
  - Site managers
  - Site settings

**Permissions Required:**

- **View**: All employees
- **Edit**: Site Managers (their site), Admins, Owners
- **Create/Delete**: Admins, Owners only

---

#### 12.3 Departments (`/dashboard/people/settings/departments`)

**Data Accessed:**

- **🟢 Department Information**
  - Department names
  - Department structure
  - Department contacts
  - Parent departments

**Permissions Required:**

- **View**: All employees
- **Edit**: HR, Admins, Owners
- **Create/Delete**: HR, Admins, Owners

---

#### 12.4 Areas & Regions (`/dashboard/people/settings/areas`)

**Data Accessed:**

- **🟢 Regional Structure**
  - Region names
  - Area names
  - Regional managers
  - Area managers
  - Site assignments

**Permissions Required:**

- **View**: All employees
- **Edit**: Regional Managers (their region), Area Managers (their area), Admins, Owners
- **Create/Delete**: Admins, Owners only

---

#### 12.5 Approval Workflows (`/dashboard/people/settings/approvals`)

**Data Accessed:**

- **🟢 Workflow Configuration**
  - Approval workflow definitions
  - Approval steps
  - Approver roles

**Permissions Required:**

- **View**: Managers, Admins, Owners
- **Edit**: Admins, Owners only

---

#### 12.6 Shift Rules (`/dashboard/people/settings/shift-rules`)

**Data Accessed:**

- **🟢 Compliance Settings**
  - Working Time Directive settings
  - Break rules
  - Overtime rules
  - Night work rules

**Permissions Required:**

- **View**: All employees
- **Edit**: HR, Compliance Officers, Admins, Owners

---

#### 12.7 Notifications (`/dashboard/people/settings/notifications`)

**Data Accessed:**

- **🟢 Notification Settings**
  - Notification preferences
  - Notification channels

**Permissions Required:**

- **View**: All employees (own settings)
- **Edit**: All employees (own settings)
- **View Company Settings**: Admins, Owners
- **Edit Company Settings**: Admins, Owners

---

## Summary: Permission Requirements by Data Type

### 🔴 Critical Data (PII/Financial)

**Data:**

- Personal information (DOB, address, nationality)
- Banking details (account numbers, sort codes)
- Tax information (NI number, tax code)
- Salary/hourly rates
- Payroll data

**Access:**

- **View**: Payroll team, HR (limited), Admins, Owners
- **Edit**: Payroll team, HR (limited), Admins, Owners
- **Export**: Payroll, Admins, Owners only

---

### 🟠 High Sensitivity (Employment)

**Data:**

- Employment terms (contract, salary, rates)
- Performance reviews
- Disciplinary records
- Right to work documents
- DBS checks
- Interview notes

**Access:**

- **View**: Employees (own), Managers (their team), HR, Admins, Owners
- **Edit**: Managers (their team), HR, Admins, Owners
- **Create**: Managers (their team), HR, Admins, Owners

---

### 🟡 Medium Sensitivity (Operational)

**Data:**

- Schedules/rotas
- Attendance/timesheets
- Leave requests
- Training records
- Availability

**Access:**

- **View**: Employees (own), Managers (their team), HR, Admins, Owners
- **Edit**: Managers (their team), HR, Admins, Owners
- **Approve**: Managers (their team), HR, Admins, Owners

---

### 🟢 Low Sensitivity (Public)

**Data:**

- Company directory (name, position, department)
- Company settings
- Site information
- Department structure

**Access:**

- **View**: All employees
- **Edit**: Managers (limited), HR, Admins, Owners

---

## Recommended Role Hierarchy

### 1. **Owner**

- Full access to all data and operations
- Can manage all settings
- Can view all financial data
- Can export all data

### 2. **Admin**

- Full access to all data and operations (except billing)
- Can manage most settings
- Can view all financial data
- Can export all data

### 3. **HR Manager**

- View all employee data (including financial)
- Edit employee data
- View all performance reviews
- Manage recruitment
- Manage onboarding
- View payroll data
- Cannot edit payroll calculations

### 4. **Payroll Manager**

- View all financial data
- Calculate and submit payroll
- View all timesheets
- Cannot edit employee personal data (except payroll-related)

### 5. **Regional Manager**

- View all employees in their region
- View all schedules in their region
- Approve rotas in their region
- View costs for their region
- Cannot view financial data (rates/salaries)

### 6. **Area Manager**

- View employees in their area
- View schedules in their area
- Approve rotas in their area
- View costs for their area
- Cannot view financial data (rates/salaries)

### 7. **Site Manager**

- View employees at their site
- View schedules at their site
- Approve rotas at their site
- View costs for their site
- Cannot view financial data (rates/salaries)

### 8. **Department Manager**

- View their direct reports
- View schedules for their team
- Approve leave for their team
- View performance reviews for their team
- Cannot view financial data (rates/salaries)

### 9. **Team Leader**

- View their direct reports
- View schedules for their team
- Approve timesheets for their team
- Cannot view financial data (rates/salaries)

### 10. **Employee**

- View own data only
- Request leave
- View own schedule
- View own timesheet
- View own payslip
- Cannot view other employees' data

---

## Database Tables Requiring RLS Policies

### Critical Tables (Require Strict RLS):

- `profiles` (employee data)
- `time_entries`
- `payslips`
- `payruns`
- `employee_documents`
- `performance_reviews`
- `employee_notes`
- `emergency_contacts`

### High Sensitivity Tables:

- `leave_requests`
- `leave_balances`
- `shifts` (with cost data)
- `training_records`
- `candidates`
- `applications`
- `interviews`

### Medium Sensitivity Tables:

- `availability_requests`
- `rota_day_approvals`
- `onboarding_tasks`
- `review_goals`
- `one_on_ones`

### Low Sensitivity Tables:

- `sites`
- `departments`
- `regions`
- `areas`
- `general_settings`
- `teamly_shift_rules`
- `teamly_notification_settings`

---

## Next Steps

1. **Create Permissions System**
   - Define permission types (view, edit, delete, approve, export)
   - Create permission matrix by role
   - Implement RLS policies based on roles

2. **Implement Role-Based Access Control**
   - Create role definitions
   - Assign roles to users
   - Check permissions on each page/operation

3. **Add Audit Logging**
   - Log all access to sensitive data
   - Log all modifications to sensitive data
   - Track permission changes

4. **Data Export Controls**
   - Restrict export of financial data
   - Restrict export of PII
   - Require approval for bulk exports

5. **Field-Level Permissions**
   - Hide sensitive fields based on role
   - Show aggregated data where appropriate
   - Mask sensitive data (e.g., partial account numbers)

---

**Document Version:** 1.0  
**Last Updated:** March 2025  
**Next Review:** After permissions system implementation
