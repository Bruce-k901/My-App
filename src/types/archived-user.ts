export interface ArchivedUser {
  id: string;
  original_id: string;
  auth_user_id: string | null;
  full_name: string | null;
  email: string | null;
  role?: string | null;
  position_title: string | null;
  company_id: string | null;
  site_id: string | null;
  home_site?: string | null;
  boh_foh?: string | null;
  phone_number?: string | null;
  pin_code?: string | null;
  last_login?: string | null;
  position?: string | null;
  archived_at: string;
  archived_by?: string | null;
  archived_reason?: string | null;
  created_at: string;
}