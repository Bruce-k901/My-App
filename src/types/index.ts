// Shared TypeScript types for the application

export type UserRole = "staff" | "manager" | "admin";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  app_role?: 'admin' | 'manager' | 'staff' | 'owner' | 'general_manager' | null;
  position_title: string | null;
  company_id: string | null;
  site_id: string | null;
  home_site?: string | null;
  boh_foh: string | null;
  last_login: string | null;
  pin_code: string | null;
  phone_number: string | null;
}

export interface Site {
  id: string;
  name: string;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  postcode?: string | null;
  gm_user_id?: string | null;
  region?: string | null;
  status?: string | null;
  company_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  profiles?: {
    id: string;
    full_name: string | null;
    phone_number: string | null;
    email: string | null;
  } | null;
}

// GM List type for dropdowns
export interface GMListItem {
  id: string;
  full_name: string;
  email: string;
  role?: string;
  position_title?: string;
  site_id?: string;
  company_id: string;
}