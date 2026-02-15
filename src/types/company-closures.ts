export interface CompanyClosure {
  id: string;
  company_id: string;
  closure_start: string; // ISO date string (YYYY-MM-DD)
  closure_end: string; // ISO date string (YYYY-MM-DD)
  notes?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CompanyClosureForm {
  id?: string;
  start: string; // ISO date string (YYYY-MM-DD)
  end: string; // ISO date string (YYYY-MM-DD)
  notes: string;
}

