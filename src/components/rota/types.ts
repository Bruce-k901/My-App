// Type definitions for the rota builder

export interface Shift {
  id: string;
  profile_id: string | null;
  profile_name?: string;
  profile_avatar?: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  gross_hours: number;
  net_hours: number;
  role_required?: string;
  hourly_rate?: number;
  estimated_cost?: number;
  status: 'scheduled' | 'confirmed' | 'swapped' | 'cancelled' | 'completed';
  color: string;
  notes?: string;
}

export interface Staff {
  id: string;
  full_name: string;
  position_title?: string;
  avatar_url?: string;
  contracted_hours?: number;
  min_hours?: number;
  max_hours?: number;
  hourly_rate?: number;
  home_site?: string | null;
  skills: string[];
  is_ready: boolean;
  missing_items: string[];
}

export interface Rota {
  id: string;
  site_id: string;
  week_starting: string;
  status: 'draft' | 'published' | 'archived';
  target_labour_cost?: number;
  target_labour_percentage?: number;
  total_hours: number;
  total_cost: number;
  published_at?: string;
}

export interface DayForecast {
  date: string;
  forecast: {
    recommended_hours: number;
    recommended_staff: number;
    predicted_revenue: number;
    predicted_covers: number;
    target_labour_percentage: number;
    confidence_level: 'high' | 'medium' | 'low';
  };
}

export interface StaffHours {
  profile_id: string;
  full_name: string;
  contracted_hours: number;
  scheduled_hours: number;
  hours_difference: number;
  estimated_cost: number;
  shift_count: number;
}

