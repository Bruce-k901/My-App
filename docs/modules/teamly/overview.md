# Teamly Module Overview

**Module Purpose:** People & HR Management
**Module Color:** Blue (`text-blue-600`, `bg-blue-50`, etc.)
**Base Route:** `/dashboard/people`

## Introduction

Teamly is Opsly's comprehensive people management module, handling all HR functions from employee onboarding to payroll. It provides tools for workforce management, compliance tracking, performance management, and employee engagement.

## Navigation Structure

The Teamly sidebar provides role-based navigation with collapsible sections:

### All Users

- **People Dashboard** - Overview with stats, alerts, and quick actions
- **Leave** - Time off requests, balances, team calendar
- **Schedule** - Rota, availability management
- **Attendance** - Time clock, timesheets
- **Training** - Certifications, compliance matrix
- **Courses** - Training courses and content

### Managers & Admins

- **Employees** - Directory, org chart, employee management
- **Onboarding** - New hire workflows, document packs
- **Reviews & Appraisals** - Performance reviews, 1:1s, goals
- **Payroll** - Pay runs, rates (admin/owner only)
- **Recruitment** - Job postings, candidates
- **Settings** - Sites, departments, workflows, permissions

### Staff View

- **My Profile** - Personal information and documents

## Route Map

| Section         | Route                                          | Purpose                                    |
| --------------- | ---------------------------------------------- | ------------------------------------------ |
| **Dashboard**   | `/dashboard/people`                            | Main hub with stats, alerts, quick actions |
| **Employees**   | `/dashboard/people/employees`                  | Employee directory and search              |
|                 | `/dashboard/people/employees/org-chart`        | Hierarchical org chart                     |
|                 | `/dashboard/people/directory/new`              | Add new employee                           |
|                 | `/dashboard/people/[id]`                       | Employee profile page                      |
| **Leave**       | `/dashboard/people/leave`                      | Leave requests overview                    |
|                 | `/dashboard/people/leave/request`              | Request time off                           |
|                 | `/dashboard/people/leave/calendar`             | Team leave calendar                        |
|                 | `/dashboard/people/leave/balances`             | Leave balance tracking                     |
| **Schedule**    | `/dashboard/people/schedule`                   | Weekly rota view                           |
|                 | `/dashboard/people/schedule/availability`      | Manage availability                        |
| **Attendance**  | `/dashboard/people/attendance`                 | Time clock interface                       |
|                 | `/dashboard/people/attendance/signoff`         | Timesheet approval                         |
| **Training**    | `/dashboard/people/training`                   | Training overview                          |
|                 | `/dashboard/people/training/matrix`            | Compliance matrix                          |
|                 | `/dashboard/people/training/record`            | Record training completion                 |
|                 | `/dashboard/people/training/course/[courseId]` | Course details                             |
| **Onboarding**  | `/dashboard/people/onboarding`                 | Active onboardings                         |
|                 | `/dashboard/people/onboarding/packs`           | Document packs                             |
|                 | `/dashboard/people/onboarding/company-docs`    | Company-wide docs                          |
|                 | `/dashboard/people/onboarding/my-docs`         | Personal documents                         |
| **Reviews**     | `/dashboard/people/reviews`                    | Performance overview                       |
|                 | `/dashboard/people/reviews/my-reviews`         | Personal reviews                           |
|                 | `/dashboard/people/reviews/team`               | Team reviews (managers)                    |
|                 | `/dashboard/people/reviews/templates`          | Review templates                           |
|                 | `/dashboard/people/reviews/schedule`           | Schedule new review                        |
|                 | `/dashboard/people/reviews/files`              | Employee files                             |
|                 | `/dashboard/people/reviews/1on1s`              | 1:1 meetings                               |
|                 | `/dashboard/people/reviews/goals`              | Goal tracking                              |
| **Payroll**     | `/dashboard/people/payroll`                    | Pay runs                                   |
|                 | `/dashboard/people/payroll/rates`              | Pay rate management                        |
|                 | `/dashboard/people/payroll/tronc`              | Tronc/tips distribution                    |
|                 | `/dashboard/people/payroll/settings`           | Payroll settings                           |
|                 | `/dashboard/people/payroll/my-payslips`        | Personal payslips                          |
| **Recruitment** | `/dashboard/people/recruitment`                | Open jobs list                             |
|                 | `/dashboard/people/recruitment/jobs/new`       | Post new job                               |
|                 | `/dashboard/people/recruitment/candidates`     | Candidate pipeline                         |
|                 | `/dashboard/people/recruitment/[jobId]`        | Job details                                |
| **Settings**    | `/dashboard/people/settings`                   | General settings                           |
|                 | `/dashboard/people/settings/sites`             | Site management                            |
|                 | `/dashboard/people/settings/departments`       | Department setup                           |
|                 | `/dashboard/people/settings/areas`             | Areas & regions                            |
|                 | `/dashboard/people/settings/approvals`         | Approval workflows                         |
|                 | `/dashboard/people/settings/roles`             | Roles & permissions                        |
|                 | `/dashboard/people/settings/shift-rules`       | Shift configuration                        |
|                 | `/dashboard/people/settings/notifications`     | Notification preferences                   |

## Feature Areas

### Employee Management

Central employee directory with profiles, org chart visualization, and multi-site assignment. Supports head office/executives and site-based employees with flexible organizational structures.

**Related docs:** [employees.md](./employees.md), [executives.md](./executives.md), [org-chart.md](./org-chart.md), [site-assignment.md](./site-assignment.md)

### Onboarding

Structured onboarding workflows with document packs, task checklists, and compliance tracking. Separate flows for head office/executives vs. site-based employees.

**Related docs:** [head-office-onboarding.md](./head-office-onboarding.md)

### Leave Management

Employee self-service leave requests, manager approvals, balance tracking, and team calendar visualization.

### Scheduling

Weekly rota management with employee availability tracking, cross-site conflict detection, and shift assignment.

**Related docs:** [multi-site-scheduling.md](./multi-site-scheduling.md)

### Time & Attendance

Clock in/out system with timesheet approval workflows and hours tracking. Supports mobile time clock and manual entry.

**Related docs:** [clock-in-out.md](./clock-in-out.md)

### Training & Compliance

Certificate tracking, expiry alerts, compliance matrix by role/department, and training record management.

### Performance Management

Review cycles, 1:1 meetings, goal setting, and employee file storage. Template-based review system with customizable workflows.

### Payroll

Pay period management, rate configuration, hours calculation, and payslip generation. Integrates with timesheet data.

### Recruitment

Job posting, candidate pipeline management, application tracking, and hiring workflows.

### Employee Transfers & Promotions

Track employee movement between sites, departments, and roles with audit history.

**Related docs:** [promotions.md](./promotions.md), [employee-status.md](./employee-status.md)

## Key Components

### UI Components

- `sidebar-nav.tsx` - Main navigation with role-based filtering
- `AddUserModal.tsx` - Employee creation form
- `UserEntityCard.tsx` - Employee card display
- Training modals - Certificate tracking, expiry updates, course assignment

### Dashboard Features

- Stats cards (employees, leave, training, recruitment)
- Alert system (pending approvals, expiring certs)
- Quick action buttons (role-based)
- Recent joiners, birthdays, anniversaries widgets

## Data Privacy & Security

Teamly handles sensitive employee data including personal information, salary, performance reviews, and health records. See [data-privacy.md](./data-privacy.md) for comprehensive security audit and RLS policies.

## Multi-Site Support

Teamly fully supports multi-site organizations with site-specific filtering, cross-site scheduling conflict detection, and flexible employee-site assignment models (single site, multiple sites, head office).

## Technical Notes

- Uses `get_company_profiles` RPC function for efficient employee queries
- Training expiry queries use `get_expiring_training` RPC with graceful fallback
- Dashboard caches failed RPC calls in sessionStorage to avoid repeated errors
- Role-based navigation filtering in sidebar
- Dark mode support throughout with blue accent colors
