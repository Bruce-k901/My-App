# Payroll System Rebuild - Complete Guide

## Overview

The payroll system has been completely rebuilt to support:
- **Flexible pay schedules** (13 periods/year, last Friday, last day, etc.)
- **Weekly breakdowns** for all employees
- **Salaried calculations** (annual salary / pay periods per year)
- **Tronc points system** for tip distribution

## Database Schema

### 1. Payrun Schedules (`payrun_schedules`)
Supports multiple schedule types:
- `weekly` - Every week (52 periods/year)
- `fortnightly` - Every 2 weeks (26 periods/year)
- `monthly` - Monthly (12 periods/year)
- `four_weekly` - Every 4 weeks (13 periods/year)
- `last_friday` - Last Friday of each month
- `last_day` - Last day of each month

**Pay Date Types:**
- `days_after` - X days after period end
- `same_day_next_week` - Same day of week, next week
- `last_friday` - Last Friday of month
- `last_day` - Last day of month

### 2. Payroll Runs (`payroll_runs`)
- Stores period dates and pay date
- Weekly breakdown fields (week_1_start/end through week_4_start/end)
- Totals for all costs including tronc

### 3. Payroll Entries (`payroll_entries`)
- Weekly hours breakdown (week_1_hours through week_4_hours)
- Pay rate information (hourly_rate OR annual_salary with pay_periods_per_year)
- Salaried pay calculation
- Tronc points and values

### 4. Tronc Configurations (`tronc_configurations`)
- Point value (£ per point)
- Allocation rules (JSON for flexibility)
- Period-specific configuration
- Site-specific or company-wide

## Key Features

### Salaried Staff Calculation
- Annual salary is divided by `pay_periods_per_year`
- Automatically calculated based on schedule type:
  - Weekly: 52 periods
  - Fortnightly: 26 periods
  - Monthly: 12 periods
  - Four-Weekly: 13 periods

### Weekly Breakdowns
- For periods longer than 1 week, hours are broken down by week
- Shows in payroll table with columns for each week
- Helps identify patterns and verify hours

### Tronc Points
- Points allocated based on hours worked (configurable)
- Point value set per period/site
- Total tronc pool distributed based on points

## Setup Instructions

### 1. Run Database Migrations
Execute in Supabase SQL Editor (in order):
1. `supabase/sql/rebuild_payroll_system.sql` - Creates all tables
2. `supabase/sql/create_payroll_run_from_signoff_v2.sql` - Creates the function

### 2. Configure Pay Schedule
Go to `/dashboard/people/payroll/settings` and set up:
- Schedule type (weekly, monthly, four_weekly, etc.)
- Period start day/date
- Pay date calculation method

### 3. Configure Tronc (Optional)
Create tronc configurations for periods where tips are distributed.

## Usage Flow

1. **Manager locks week** in Attendance Signoff
2. **Payroll run automatically created** with all employee data
3. **Payroll team reviews** in Payroll page
4. **Export** to Xero, QuickBooks, Sage, or Generic CSV
5. **Mark as paid** when complete

## UI Features

### Payroll Page
- Shows all employees with weekly breakdowns
- Displays pay rates (hourly or salaried)
- Shows tronc points and values
- Employer cost breakdown
- Export functionality

### Settings Page
- Flexible schedule configuration
- Support for all schedule types
- Pay date calculation options

## Important Notes

- **Salaried calculations** are automatic based on schedule type
- **Weekly breakdowns** only show for periods > 1 week
- **Tronc** is optional and can be configured per period
- **All calculations are estimates** - accounting software does final calculations

