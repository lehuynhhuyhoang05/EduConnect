// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

// App Configuration
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'EduLMS';
export const APP_DESCRIPTION = 'Nền tảng học trực tuyến hiện đại';

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

// File upload limits
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const ALLOWED_FILE_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'application/zip',
];

// Live session configuration
export const MAX_PARTICIPANTS = 100;
export const DEFAULT_MAX_PARTICIPANTS = 20;
export const VIDEO_QUALITY_PRESETS = {
  high: { width: 1280, height: 720, frameRate: 30, bitrate: 2500000 },
  medium: { width: 640, height: 480, frameRate: 24, bitrate: 1000000 },
  low: { width: 320, height: 240, frameRate: 15, bitrate: 500000 },
} as const;

// WebRTC configuration
export const WEBRTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

// Toast configuration
export const TOAST_DURATION = 4000;

// Animation durations (ms)
export const ANIMATION_DURATION = {
  fast: 150,
  normal: 300,
  slow: 500,
};

// Breakpoints (matching Tailwind)
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

// Local storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user',
  THEME: 'theme',
  SIDEBAR_COLLAPSED: 'sidebar_collapsed',
  LANGUAGE: 'language',
  VIDEO_DEVICE: 'video_device',
  AUDIO_INPUT_DEVICE: 'audio_input_device',
  AUDIO_OUTPUT_DEVICE: 'audio_output_device',
  VIRTUAL_BACKGROUND: 'virtual_background',
};

// Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  DASHBOARD: '/dashboard',
  CLASSES: '/classes',
  CLASS_DETAIL: '/classes/:classId',
  CLASS_SETTINGS: '/classes/:classId/settings',
  JOIN_CLASS: '/join-class',
  ASSIGNMENTS: '/assignments',
  ASSIGNMENT_DETAIL: '/assignments/:assignmentId',
  CREATE_ASSIGNMENT: '/assignments/create',
  SUBMISSION_DETAIL: '/assignments/:assignmentId/submissions/:submissionId',
  SESSIONS: '/sessions',
  SESSION_LOBBY: '/sessions/:sessionId/lobby',
  LIVE_SESSION: '/sessions/:sessionId/live',
  CHAT: '/chat',
  CHAT_ROOM: '/chat/:roomId',
  NOTIFICATIONS: '/notifications',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  ADMIN_USERS: '/admin/users',
  NOT_FOUND: '/404',
} as const;

// User roles
export const USER_ROLES = {
  STUDENT: 'STUDENT',
  TEACHER: 'TEACHER',
} as const;

// Session statuses
export const SESSION_STATUS = {
  SCHEDULED: 'scheduled',
  LIVE: 'live',
  ENDED: 'ended',
} as const;

// Submission statuses
export const SUBMISSION_STATUS = {
  SUBMITTED: 'submitted',
  GRADED: 'graded',
  RETURNED: 'returned',
} as const;

// Notification types with icons and colors
export const NOTIFICATION_CONFIG = {
  class_joined: { icon: 'Users', color: 'primary' },
  class_invitation: { icon: 'UserPlus', color: 'primary' },
  class_updated: { icon: 'Edit', color: 'info' },
  class_deleted: { icon: 'Trash', color: 'error' },
  member_joined: { icon: 'UserPlus', color: 'success' },
  member_left: { icon: 'UserMinus', color: 'warning' },
  member_removed: { icon: 'UserX', color: 'error' },
  assignment_created: { icon: 'FileText', color: 'primary' },
  assignment_updated: { icon: 'Edit', color: 'info' },
  assignment_due_soon: { icon: 'Clock', color: 'warning' },
  assignment_overdue: { icon: 'AlertCircle', color: 'error' },
  submission_received: { icon: 'CheckCircle', color: 'success' },
  submission_graded: { icon: 'Award', color: 'success' },
  submission_returned: { icon: 'RotateCcw', color: 'warning' },
  session_scheduled: { icon: 'Calendar', color: 'primary' },
  session_starting_soon: { icon: 'Clock', color: 'warning' },
  session_started: { icon: 'Video', color: 'success' },
  session_ended: { icon: 'VideoOff', color: 'neutral' },
  session_cancelled: { icon: 'XCircle', color: 'error' },
  new_message: { icon: 'MessageSquare', color: 'primary' },
  mentioned: { icon: 'AtSign', color: 'primary' },
  system_announcement: { icon: 'Bell', color: 'info' },
  account_updated: { icon: 'User', color: 'info' },
} as const;
