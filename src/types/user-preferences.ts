// User Preferences — all fields optional, defaults applied in code

export type ThemePreference = 'light' | 'dark' | 'system';
export type DensityMode = 'comfortable' | 'compact';
export type SidebarMode = 'expanded' | 'collapsed';
export type FontSizePreference = 'small' | 'medium' | 'large';
export type ContrastMode = 'normal' | 'high';
export type DateFormatOption = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
export type TimeFormatOption = '12h' | '24h';
export type ItemsPerPage = 10 | 25 | 50 | 100;
export type DigestMode = 'realtime' | 'daily';

export interface NotificationChannelPrefs {
  in_app: boolean;
  email: boolean;
  push: boolean;
}

export interface QuietHours {
  enabled: boolean;
  start: string; // "HH:mm"
  end: string;   // "HH:mm"
}

export interface UserPreferences {
  // Display & Appearance
  theme?: ThemePreference;
  density?: DensityMode;
  sidebar_mode?: SidebarMode;
  landing_page?: string; // e.g. '/dashboard', '/dashboard/stockly'
  date_format?: DateFormatOption | null; // null = use company default
  time_format?: TimeFormatOption | null;

  // Notifications
  notifications?: {
    task_due?: NotificationChannelPrefs;
    task_overdue?: NotificationChannelPrefs;
    check_overdue?: NotificationChannelPrefs;
    stock_alert?: NotificationChannelPrefs;
    message_received?: NotificationChannelPrefs;
    incident_reported?: NotificationChannelPrefs;
  };
  quiet_hours?: QuietHours;
  digest_mode?: DigestMode;
  sound_enabled?: boolean;
  vibration_enabled?: boolean;

  // Workflow & Defaults
  default_site_id?: string | null;
  default_views?: Record<string, 'table' | 'card'>;
  items_per_page?: ItemsPerPage;
  auto_save_drafts?: boolean;

  // Accessibility
  font_size?: FontSizePreference;
  reduce_animations?: boolean;
  high_contrast?: ContrastMode;
}

export const DEFAULT_USER_PREFERENCES: Required<
  Omit<UserPreferences, 'notifications'>
> & { notifications: Required<NonNullable<UserPreferences['notifications']>> } = {
  theme: 'dark',
  density: 'comfortable',
  sidebar_mode: 'collapsed',
  landing_page: '/dashboard',
  date_format: null,
  time_format: null,
  notifications: {
    task_due:         { in_app: true, email: false, push: true },
    task_overdue:     { in_app: true, email: true,  push: true },
    check_overdue:    { in_app: true, email: false, push: false },
    stock_alert:      { in_app: true, email: false, push: false },
    message_received: { in_app: true, email: false, push: true },
    incident_reported:{ in_app: true, email: true,  push: true },
  },
  quiet_hours: { enabled: false, start: '22:00', end: '07:00' },
  digest_mode: 'realtime',
  sound_enabled: true,
  vibration_enabled: true,
  default_site_id: null,
  default_views: {},
  items_per_page: 25,
  auto_save_drafts: true,
  font_size: 'medium',
  reduce_animations: false,
  high_contrast: 'normal',
};

// Notification type labels for the settings UI
export const NOTIFICATION_TYPE_LABELS: Record<string, { label: string; description: string }> = {
  task_due:          { label: 'Task Due',          description: 'When a task is approaching its due time' },
  task_overdue:      { label: 'Task Overdue',      description: 'When a task passes its due time' },
  check_overdue:     { label: 'Check Overdue',     description: 'When a compliance check is overdue' },
  stock_alert:       { label: 'Stock Alert',       description: 'Low stock or delivery notifications' },
  message_received:  { label: 'Message Received',  description: 'New messages in your conversations' },
  incident_reported: { label: 'Incident Reported', description: 'When a new incident is logged' },
};

// Landing page options for the settings UI
export const LANDING_PAGE_OPTIONS = [
  { value: '/dashboard',               label: 'Dashboard' },
  { value: '/dashboard/todays_tasks',  label: 'Tasks (Checkly)' },
  { value: '/dashboard/stockly',       label: 'Stockly' },
  { value: '/dashboard/people',        label: 'People (Teamly)' },
  { value: '/dashboard/planly',        label: 'Planly' },
  { value: '/dashboard/assets',        label: 'Assets (Assetly)' },
  { value: '/dashboard/calendar',      label: 'Calendar' },
  { value: '/dashboard/reports',       label: 'Reports' },
];
