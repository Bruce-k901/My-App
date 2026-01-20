# Head Office / Executive Employee Onboarding

## Overview
The Head Office / Executive employee modal has been expanded to include all necessary legal, financial, and compliance information required for proper onboarding.

## What's New
The modal now includes **4 comprehensive sections** organized in tabs:

### 1. Personal Information Tab
- **Basic Details:**
  - Full Name (required)
  - Email Address (required)
  - Phone Number
  - Date of Birth

- **Address:**
  - Address Line 1
  - Address Line 2
  - City
  - Postcode
  - Country (defaults to United Kingdom)

### 2. Employment Tab
- **Role & Position:**
  - Role (required) - determines org chart placement
  - Position Title - formal job title
  - Department (e.g., Finance, HR, Operations)

- **Contract Details:**
  - Start Date
  - Contract Type (Permanent, Fixed Term, Contractor)
  - Annual Salary (£)
  - Pay Frequency (Weekly, Fortnightly, Monthly)

- **Note:** Employee will not be assigned to any site

### 3. Compliance Tab
- **Right to Work:**
  - National Insurance Number
  - Right to Work Status (Pending, Verified, Expired, Not Required)
  - RTW Document Type (Passport, BRP, Share Code, Visa, Other)
  - RTW Expiry Date (if applicable)

- **Legal Notice:** Includes reminder about UK legal requirements for right to work verification

### 4. Banking Tab
- **Bank Details (for payroll):**
  - Bank Name
  - Account Holder Name
  - Sort Code (XX-XX-XX format)
  - Account Number (8 digits)

- **Security Note:** Bank details are encrypted and only accessible to authorized payroll administrators

## How to Use

### Accessing the Modal
1. Navigate to `/dashboard/people/directory/new`
2. Click the **"Head Office / Executive"** card (purple gradient)
3. The modal will open with a tabbed interface

### Filling Out the Form
1. **Start with Personal tab** - Enter basic details and address
2. **Move to Employment tab** - Set role, position, and contract details
3. **Complete Compliance tab** - Add NI number and right to work information
4. **Finish with Banking tab** - Enter bank details for payroll

### Navigation
- Click any tab at the top to jump between sections
- All fields except Name and Email are optional (but recommended for complete onboarding)
- Click "Add Employee" when done or "Cancel" to close

## Data Stored
All information is saved to the `profiles` table with:
- `site_id` set to `null` (head office employees)
- `status` set to `'onboarding'`
- All personal, employment, compliance, and banking fields populated

## Key Differences from Site Employee Form
The Head Office modal is **streamlined** compared to the full site employee form:

**Excluded fields:**
- Site assignment
- BOH/FOH section
- Probation end date
- Contracted hours (salaried positions)
- Hourly rate (salaried positions)
- DBS checks (typically not required for head office)
- Training certificates
- Emergency contacts (can be added later)

**Focus:**
- Quick onboarding for executives and managers
- Essential legal and financial compliance
- Clean, tabbed interface for better UX

## Technical Details

### Component Location
`src/components/users/AddExecutiveModal.tsx`

### API Endpoint
`POST /api/users/create`

### Payload Structure
```typescript
{
  // Personal
  full_name: string,
  email: string,
  phone_number: string | null,
  date_of_birth: string | null,
  address_line_1: string | null,
  address_line_2: string | null,
  city: string | null,
  postcode: string | null,
  country: string,
  
  // Employment
  company_id: string,
  site_id: null,
  app_role: string,
  position_title: string | null,
  department: string | null,
  start_date: string | null,
  contract_type: string,
  salary: number | null,
  pay_frequency: string,
  
  // Compliance
  national_insurance_number: string | null,
  right_to_work_status: string,
  right_to_work_document_type: string | null,
  right_to_work_expiry: string | null,
  
  // Banking
  bank_name: string | null,
  bank_account_name: string | null,
  bank_account_number: string | null,
  bank_sort_code: string | null,
  
  // Status
  status: 'onboarding'
}
```

## User Experience

### Visual Design
- **Modal Width:** Expanded to `max-w-3xl` for better form layout
- **Tabs:** Purple theme matching the Head Office card
- **Icons:** Each tab has a relevant icon (User, Briefcase, Shield, CreditCard)
- **Active Tab:** Purple background with border-bottom indicator
- **Grid Layout:** 2-column responsive grid for form fields

### Validation
- Email format validation
- Required field indicators (*)
- Error messages displayed at top of modal
- Toast notifications for success/error states

### Success Flow
1. User fills out form across tabs
2. Clicks "Add Employee"
3. Success toast appears
4. Modal closes automatically
5. User is redirected to employees list
6. New employee appears in org chart under their role

## Related Documentation
- [Dual Employee Add System](./DUAL_EMPLOYEE_ADD_SYSTEM.md)
- [Add Employee Flow](./ADD_EMPLOYEE_FLOW.md)
- [Organizational Chart Guide](./ORG_CHART_GUIDE.md)

## Future Enhancements
Potential additions for future versions:
- Emergency contacts section
- Document upload for right to work
- Pension scheme enrollment
- Benefits package selection
- Photo upload for profile

