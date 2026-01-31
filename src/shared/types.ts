// Core data types for SANS Notes

export interface Profile {
  id: string;
  name: string;
  settings: Settings;
  days: Day[];
}

export interface AppConfig {
  currentProfileId: string;
  profiles: Profile[];
  // Legacy fields for migration - will be removed after migration
  settings?: Settings;
  days?: Day[];
}

export interface ScheduledTime {
  id: string;
  label: string;
  time: string; // HH:MM format (24-hour)
  duration: number; // Duration in minutes
  enabled: boolean;
}

export interface Settings {
  windowTarget: WindowTarget;
  checkLinksOnStartup: boolean;
  theme: Theme;
  labPollTemplate: string;
  timezone: string;
  scheduledTimes: ScheduledTime[];
  breakAlertTheme: Theme | null; // Theme to use when within 5 minutes of a break
  breakAlertMinutes: number; // Minutes before break to trigger alert theme (default 5)
  lastLaunchDate?: string; // ISO date string of last launch
}

export interface WindowTarget {
  matchMode: 'exact' | 'contains' | 'regex';
  pattern: string;
  pressEnterAfterPaste: boolean; // Auto-press Enter after pasting URLs and Notes
}

export interface Theme {
  name: string;
  isCustom: boolean;
  colors: ThemeColors;
  fontFamily: string;
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  accent: string;
  border: string;
  danger: string;
  success: string;
}

export interface Day {
  id: string;
  name: string;
  order: number;
  dayNumber?: number;
  labCount?: number;
  sections: Section[];
}

export interface Section {
  id: string;
  name: string;
  order: number;
  isCollapsed: boolean;
  items: SectionItem[];
  polls: Poll[];
}

export type SectionItem = Link | Note;

export interface AdditionalUrl {
  url: string;
  title: string;
  status?: LinkStatus;
}

export interface Link {
  type: 'link';
  id: string;
  url: string;
  title: string;
  customTitle?: string;
  additionalUrls?: AdditionalUrl[];
  order: number;
  lastChecked?: string;
  status: LinkStatus;
}

export type LinkStatus = 'ok' | 'broken' | 'timeout' | 'unchecked' | 'pending';

export interface Note {
  type: 'note';
  id: string;
  title: string;
  content: string;
  order: number;
}

export interface Poll {
  id: string;
  title: string;
  content: string;
  order: number;
  sent: boolean;
}

// IPC channel names
export const IPC_CHANNELS = {
  // Storage
  LOAD_CONFIG: 'config:load',
  SAVE_CONFIG: 'config:save',
  EXPORT_CONFIG: 'config:export',
  IMPORT_CONFIG: 'config:import',

  // Links
  FETCH_TITLE: 'link:fetch-title',
  CHECK_LINK: 'link:check',
  CHECK_ALL_LINKS: 'link:check-all',
  LINK_CHECK_RESULT: 'link:check-result',
  OPEN_IN_CHROME: 'link:open-chrome',

  // Window
  FOCUS_AND_PASTE: 'window:focus-paste',
  GET_WINDOWS: 'window:get-list',
  OPEN_COUNTDOWN_TIMER: 'window:open-countdown',

  // App
  GET_APP_PATH: 'app:get-path',
  QUIT_APP: 'app:quit',
} as const;

// Default theme - 8-bit style
export const DEFAULT_THEME: Theme = {
  name: '8-Bit Classic',
  isCustom: false,
  fontFamily: '"Press Start 2P", monospace',
  colors: {
    primary: '#4a9eff',
    secondary: '#ff6b9d',
    background: '#1a1a2e',
    surface: '#16213e',
    text: '#eaeaea',
    textMuted: '#888888',
    accent: '#ffd93d',
    border: '#4a9eff',
    danger: '#ff4757',
    success: '#2ed573',
  },
};

// Preset themes from Coolors.co
export const THEME_WARM_AUTUMN_GLOW: Theme = {
  name: 'Warm Autumn Glow',
  isCustom: false,
  fontFamily: '"Press Start 2P", monospace',
  colors: {
    primary: '#F77F00',
    secondary: '#FCBF49',
    background: '#003049',
    surface: '#00405f',
    text: '#EAE2B7',
    textMuted: '#b8ad8a',
    accent: '#FCBF49',
    border: '#F77F00',
    danger: '#D62828',
    success: '#2ed573',
  },
};

export const THEME_SUNNY_BEACH_DAY: Theme = {
  name: 'Sunny Beach Day',
  isCustom: false,
  fontFamily: '"Press Start 2P", monospace',
  colors: {
    primary: '#2A9D8F',
    secondary: '#E9C46A',
    background: '#264653',
    surface: '#2d5561',
    text: '#f4f4f4',
    textMuted: '#a8c5c0',
    accent: '#E9C46A',
    border: '#2A9D8F',
    danger: '#E76F51',
    success: '#2A9D8F',
  },
};

export const THEME_DARK_SUNSET: Theme = {
  name: 'Dark Sunset',
  isCustom: false,
  fontFamily: '"Press Start 2P", monospace',
  colors: {
    primary: '#E09F3E',
    secondary: '#FFF3B0',
    background: '#540B0E',
    surface: '#6b1215',
    text: '#FFF3B0',
    textMuted: '#c9b98a',
    accent: '#FFF3B0',
    border: '#E09F3E',
    danger: '#9E2A2B',
    success: '#335C67',
  },
};

export const THEME_EARTHY_GREEN: Theme = {
  name: 'Earthy Green',
  isCustom: false,
  fontFamily: '"Press Start 2P", monospace',
  colors: {
    primary: '#84A98C',
    secondary: '#52796F',
    background: '#2F3E46',
    surface: '#354F52',
    text: '#CAD2C5',
    textMuted: '#8a9a8e',
    accent: '#CAD2C5',
    border: '#52796F',
    danger: '#c45b5b',
    success: '#84A98C',
  },
};

// All preset themes
export const PRESET_THEMES: Theme[] = [
  DEFAULT_THEME,
  THEME_WARM_AUTUMN_GLOW,
  THEME_SUNNY_BEACH_DAY,
  THEME_DARK_SUNSET,
  THEME_EARTHY_GREEN,
];

export const DEFAULT_SETTINGS: Settings = {
  windowTarget: {
    matchMode: 'contains',
    pattern: '',
    pressEnterAfterPaste: false,
  },
  checkLinksOnStartup: false,
  theme: DEFAULT_THEME,
  labPollTemplate: '/poll "How are we doing on Lab <LAB_NUMBER>? :lab_coat:" ":exclamation: Having Issues" ":timer_clock:Need More Time" ":white_check_mark: Finished the Lab!" no-preview anonymous',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  scheduledTimes: [],
  breakAlertTheme: null,
  breakAlertMinutes: 5,
};

// Common timezones for the dropdown
export const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Phoenix',
  'America/Toronto',
  'America/Vancouver',
  'America/Mexico_City',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Hong_Kong',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Sydney',
  'Australia/Perth',
  'Pacific/Auckland',
  'UTC',
];

export const DEFAULT_PROFILE: Profile = {
  id: 'default',
  name: 'Default Profile',
  settings: DEFAULT_SETTINGS,
  days: [],
};

export const DEFAULT_CONFIG: AppConfig = {
  currentProfileId: 'default',
  profiles: [DEFAULT_PROFILE],
};

// Link check result
export interface LinkCheckResult {
  url: string;
  status: LinkStatus;
  statusCode?: number;
  error?: string;
}

// Window info for selection
export interface WindowInfo {
  title: string;
  handle: number;
}
